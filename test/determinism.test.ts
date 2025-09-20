import { describe, expect, it } from 'vitest';
import { normalizePath, splitPathComponents, stableCompare, stablePathCompare, stableSortBy } from '../src/util/determinism.js';

const raw = String.raw;

describe('stableCompare', () => {
  it('orders strings with mixed case and diacritics deterministically', () => {
    expect(stableCompare('Café', 'café')).toBeLessThan(0);
    expect(stableCompare('Cafe\u0301', 'Café')).toBe(0);
    expect(stableCompare('café', 'Cafe\u0301')).toBeGreaterThan(0);
    expect(stableCompare('alpha', 'Éclair')).toBeLessThan(0);
  });
});

describe('stableSortBy', () => {
  it('preserves original order for equal keys', () => {
    const items = [
      { id: 1, label: 'Café' },
      { id: 2, label: 'café' },
      { id: 3, label: 'Cafe\u0301' },
    ];

    const sorted = stableSortBy(items, item => item.label);
    expect(sorted.map(item => item.id)).toEqual([1, 3, 2]);
  });
});

describe('normalizePath', () => {
  it('normalizes Windows and POSIX paths consistently', () => {
    expect(normalizePath(raw`C:\Mods\.\Hair\..\Hair\Café.package`)).toBe('C:/Mods/Hair/Café.package');
    expect(normalizePath('/tmp//../var//log/')).toBe('/var/log');
    expect(normalizePath(raw`\\?\C:\Mods\File.package`)).toBe('C:/Mods/File.package');
    expect(normalizePath(raw`\\Server\Share\Folder\..\File.package`)).toBe('//Server/Share/File.package');
  });

  it('normalizes UNC paths', () => {
    expect(normalizePath('//server/share/folder/file')).toBe('//server/share/folder/file');
    expect(normalizePath(raw`\\server\share\folder\file`)).toBe('//server/share/folder/file');
    expect(normalizePath('//server/share//folder//file')).toBe('//server/share/folder/file');
  });

  it('normalizes drive letter paths', () => {
    expect(normalizePath(raw`C:\folder\file`)).toBe('C:/folder/file');
    expect(normalizePath('C:/folder/file')).toBe('C:/folder/file');
    expect(normalizePath(raw`C:\\folder\\\file`)).toBe('C:/folder/file');
  });

  it('handles empty string and dot/parent paths', () => {
    expect(normalizePath('')).toBe('.');
    expect(normalizePath('.')).toBe('.');
    expect(normalizePath('..')).toBe('..');
    expect(normalizePath('./folder/../file')).toBe('file');
    expect(normalizePath(raw`C:\.\folder\.\file`)).toBe('C:/folder/file');
  });

  it('removes redundant separators', () => {
    expect(normalizePath(raw`C:\folder\\subfolder\\\file`)).toBe('C:/folder/subfolder/file');
    expect(normalizePath('/folder//subfolder///file')).toBe('/folder/subfolder/file');
    expect(normalizePath('//server//share////file')).toBe('//server/share/file');
  });
});

describe('stablePathCompare', () => {
  it('compares normalized path components deterministically', () => {
    const paths = [
      raw`Mods\Accessories\Ring.package`,
      raw`Mods\Accessories\bracelet.package`,
      raw`Mods\Hair\B.package`,
      raw`Mods\Hair\a.package`,
    ];

    const sorted = [...paths].sort(stablePathCompare);
    expect(sorted).toEqual([
      raw`Mods\Accessories\bracelet.package`,
      raw`Mods\Accessories\Ring.package`,
      raw`Mods\Hair\a.package`,
      raw`Mods\Hair\B.package`,
    ]);
  });
});

describe('splitPathComponents', () => {
  it('splits UNC, drive, and relative paths into comparable components', () => {
    expect(splitPathComponents('//server/share/folder/file')).toEqual(['//', 'server', 'share', 'folder', 'file']);
    expect(splitPathComponents('C:/folder/file')).toEqual(['C:', '/', 'folder', 'file']);
    expect(splitPathComponents('C:relative/file')).toEqual(['C:', 'relative', 'file']);
    expect(splitPathComponents('/folder/subfolder')).toEqual(['/', 'folder', 'subfolder']);
    expect(splitPathComponents('relative/path')).toEqual(['relative', 'path']);
  });

  it('preserves trailing root indicators', () => {
    expect(splitPathComponents('//')).toEqual(['//']);
    expect(splitPathComponents('C:/')).toEqual(['C:', '/']);
    expect(splitPathComponents('/')).toEqual(['/']);
    expect(splitPathComponents('C:')).toEqual(['C:']);
  });
});
