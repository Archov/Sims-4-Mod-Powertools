import { randomBytes } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const TEMP_PREFIX = '.tmp-';
const MAX_TEMP_ATTEMPTS = 20;

/**
 * Atomically write content to a file using an adjacent temporary file.
 *
 * Writes `content` to a newly created exclusive temp file next to `targetPath`, fsyncs the temp file, atomically renames the temp over the target, and then fsyncs the containing directory. If writing or syncing the temp fails the temp file is removed; if the atomic rename fails the temp file is intentionally left in place for diagnostics.
 *
 * @param targetPath - Destination path that will be replaced atomically.
 * @param content - Buffer or string data to write to the file.
 */
export async function writeFileAtomic(targetPath: string, content: Buffer | string): Promise<void> {
  const directory = dirname(targetPath) || '.';
  const tempPath = await createTempFile(targetPath);

  let handle: FileHandle | null = null;
  try {
    handle = await fs.open(tempPath, 'w');
    await handle.writeFile(content);
    await handle.sync();
  } catch (error) {
    await closeQuietly(handle);
    await safeUnlink(tempPath);
    throw wrapFsError(`Failed to write temp file for ${targetPath}`, error);
  }

  await closeQuietly(handle);

  try {
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    throw wrapFsError(`Failed to replace ${targetPath} atomically using ${tempPath}`, error);
  }

  try {
    await fsyncDir(directory);
  } catch (error) {
    throw wrapFsError(`Failed to fsync directory ${directory} for ${targetPath}`, error);
  }
}

/**
 * Create and reserve a uniquely named temporary file located next to `baseName`.
 *
 * The function constructs a sanitized base name, then repeatedly attempts to create
 * an exclusive file named `.tmp-<sanitizedBase>-<randomHex>` in the same directory
 * as `baseName`. Each candidate file is created with mode 0o600, opened and closed
 * immediately to reserve the name, and the function returns the path on success.
 *
 * If a candidate already exists the attempt is retried up to MAX_TEMP_ATTEMPTS; on
 * other filesystem errors the error is wrapped with contextual information and rethrown.
 * If no unique name can be allocated after the maximum attempts an Error is thrown.
 *
 * @param baseName - Path whose directory and base name are used to place the temp file.
 * @returns The full path of the newly created temporary file.
 */
export async function createTempFile(baseName: string): Promise<string> {
  const directory = dirname(baseName) || '.';
  const base = sanitizeBaseName(basename(baseName));

  for (let attempt = 0; attempt < MAX_TEMP_ATTEMPTS; attempt += 1) {
    const suffix = randomBytes(12).toString('hex');
    const candidateName = `${TEMP_PREFIX}${base}-${suffix}`;
    const candidatePath = join(directory, candidateName);

    try {
      const handle = await fs.open(candidatePath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR, 0o600);
      await handle.close();
      return candidatePath;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EEXIST') {
        continue;
      }
      throw wrapFsError(`Unable to create temp file near ${baseName}`, error);
    }
  }

  throw new Error(`Unable to allocate a unique temp file for ${baseName} after ${MAX_TEMP_ATTEMPTS} attempts.`);
}

/**
 * Ensure a file's data is flushed to stable storage using fsync.
 *
 * Opens `filePath` read-only and calls fsync on the descriptor. On platforms
 * or filesystems that do not support file-level fsync (errors with codes
 * `EINVAL`, `ENOTSUP`, or `EPERM`) this function returns silently. For other
 * errors it throws an Error that includes the `filePath` for context.
 *
 * @param filePath - Filesystem path of the file to sync
 * @throws Error when fsync or file open fails for reasons other than the
 *         unsupported/permission error codes listed above
 */
export async function fsyncFile(filePath: string): Promise<void> {
  let handle: FileHandle | null = null;
  try {
    handle = await fs.open(filePath, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EINVAL' || err.code === 'ENOTSUP' || err.code === 'EPERM') {
      // Some file systems (notably certain Windows volumes) disallow file fsync.
      return;
    }
    throw wrapFsError(`Failed to fsync file ${filePath}`, error);
  } finally {
    await closeQuietly(handle);
  }
}

/**
 * Force directory metadata to disk. The implementation prefers O_DIRECTORY on
 * POSIX platforms but gracefully falls back where unsupported.
 */
export async function fsyncDir(dirPath: string): Promise<void> {
  const flags = process.platform === 'win32'
    ? constants.O_RDONLY
    : constants.O_RDONLY | constants.O_DIRECTORY;

  let handle: FileHandle | null = null;
  try {
    handle = await fs.open(dirPath, flags);
    await handle.sync();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EINVAL' || err.code === 'ENOTSUP' || err.code === 'EPERM' || err.code === 'EISDIR') {
      // Some file systems (notably certain Windows volumes) disallow directory fsync.
      return;
    }
    throw wrapFsError(`Failed to fsync directory ${dirPath}`, error);
  } finally {
    await closeQuietly(handle);
  }
}

/**
 * Close a FileHandle if provided, suppressing any error raised by close.
 *
 * Useful for best-effort cleanup where a close failure should not mask an existing error.
 *
 * @param handle - The FileHandle to close, or `null` to skip closing.
 */
async function closeQuietly(handle: FileHandle | null): Promise<void> {
  if (handle === null) {
    return;
  }

  try {
    await handle.close();
  } catch {
    // ignore close errors to avoid masking the original failure
  }
}

/**
 * Attempt to unlink (delete) a filesystem path, but never throw.
 *
 * If the path does not exist (ENOENT) this returns silently. Other errors
 * are intentionally swallowed to avoid masking upstream failures.
 *
 * @param path - Filesystem path to remove
 */
async function safeUnlink(path: string): Promise<void> {
  try {
    await fs.unlink(path);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return;
    }
    // Do not re-throw to avoid masking the original error in `writeFileAtomic`'s catch block.
  }
}

/**
 * Produce a filesystem-safe base name for creating adjacent temporary files.
 *
 * Returns "s4merge" when the input is empty, "." or "..". Otherwise replaces any
 * character not in the set [A–Z a–z 0–9 . _ -] with an underscore (`_`) so the
 * result is safe to use as part of a filename.
 *
 * @param name - Original base name to sanitize
 * @returns A sanitized base name containing only alphanumerics, dot, underscore, or dash
 */
function sanitizeBaseName(name: string): string {
  if (name === '' || name === '.' || name === '..') {
    return 's4merge';
  }
  return name.replace(/[^A-Za-z0-9._-]/gu, '_');
}

/**
 * Create a new Error that augments a filesystem-related message with details from an existing error.
 *
 * Constructs an Error whose message is "`message`: <detail>" where `<detail>` is taken from `error.message`
 * when `error` is an Error, otherwise `String(error)`. If `error` is an Error, it is attached as the `cause`
 * of the returned Error (where supported).
 *
 * @param message - Contextual message describing the operation that failed
 * @param error - The original error or error-like value to extract details from and optionally attach as `cause`
 * @returns A new Error combining the provided message and the detail from `error`
 */
function wrapFsError(message: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`${message}: ${detail}`, { cause: error instanceof Error ? error : undefined });
}
