import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTempFile, fsyncDir, fsyncFile, writeFileAtomic } from '../src/util/fsx';

describe('fsx utilities', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = await fs.mkdtemp(join(tmpdir(), 's4merge-fsx-'));
  });

  afterEach(async () => {
    await fs.rm(sandbox, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('creates unique temp files adjacent to the base path', async () => {
    const base = join(sandbox, 'output.package');
    const tempOne = await createTempFile(base);
    const tempTwo = await createTempFile(base);

    expect(tempOne).not.toBe(tempTwo);
    expect(dirname(tempOne)).toBe(sandbox);
    expect(dirname(tempTwo)).toBe(sandbox);

    await expect(fs.access(tempOne)).resolves.toBeUndefined();
    await expect(fs.access(tempTwo)).resolves.toBeUndefined();
  });

  it('writes files atomically and leaves no stale temp files on success', async () => {
    const target = join(sandbox, 'result.txt');

    await writeFileAtomic(target, 'first');
    await writeFileAtomic(target, 'second');

    const contents = await fs.readFile(target, 'utf8');
    expect(contents).toBe('second');

    const entries = await fs.readdir(sandbox);
    expect(entries.filter(name => name.startsWith('.tmp-'))).toHaveLength(0);
  });

  it('leaves temp files behind when rename fails', async () => {
    const target = join(sandbox, 'fail.txt');
    const renameSpy = vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('rename failed'));

    await expect(writeFileAtomic(target, 'data')).rejects.toThrow('rename failed');

    const entries = await fs.readdir(sandbox);
    expect(entries.some(name => name.startsWith('.tmp-'))).toBe(true);

    renameSpy.mockRestore();
  });

  it('fsyncs files and directories successfully', async () => {
    const target = join(sandbox, 'sync.bin');
    await writeFileAtomic(target, Buffer.from([1, 2, 3]));

    await expect(fsyncFile(target)).resolves.toBeUndefined();
    await expect(fsyncDir(sandbox)).resolves.toBeUndefined();
  });

  it('throws descriptive errors when fsyncFile path is missing', async () => {
    const missing = join(sandbox, 'missing.bin');
    await expect(fsyncFile(missing)).rejects.toThrow(`Failed to fsync file ${missing}`);
  });
});
