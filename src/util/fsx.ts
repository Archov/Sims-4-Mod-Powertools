import { randomBytes } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const TEMP_PREFIX = '.tmp-';
const MAX_TEMP_ATTEMPTS = 20;

/**
 * Write a file using a crash-safe temp → fsync → atomic rename pattern.
 * Existing files are replaced atomically. On rename failure the temp file is
 * left in place for diagnostics.
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
 * Create an exclusive temp file adjacent to the provided base name. The file is
 * opened and closed immediately to reserve the name.
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
 * Force the given file to disk using fsync. Errors include the source path for
 * easier debugging.
 */
export async function fsyncFile(filePath: string): Promise<void> {
  let handle: FileHandle | null = null;
  try {
    handle = await fs.open(filePath, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
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

async function safeUnlink(path: string): Promise<void> {
  try {
    await fs.unlink(path);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return;
    }
    throw wrapFsError(`Failed to clean up temp file ${path}`, error);
  }
}

function sanitizeBaseName(name: string): string {
  if (name === '' || name === '.' || name === '..') {
    return 's4merge';
  }
  return name.replace(/[^A-Za-z0-9._-]/gu, '_');
}

function wrapFsError(message: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`${message}: ${detail}`, { cause: error instanceof Error ? error : undefined });
}
