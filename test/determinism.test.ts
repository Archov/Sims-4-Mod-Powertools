import { describe, expect, it } from 'vitest';
import { normalizePath, stableCompare, stablePathCompare, stableSortBy } from '../src/util/determinism.js';

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
    expect(normalizePath('C:\\Mods\\.\\Hair\\..\\Hair\\Café.package')).toBe('C:/Mods/Hair/Café.package');
    expect(normalizePath('/tmp//../var//log/')).toBe('/var/log');
    expect(normalizePath('\\\\?\\C:\\Mods\\File.package')).toBe('C:/Mods/File.package');
    expect(normalizePath('\\\\Server\\Share\\Folder\\..\\File.package')).toBe('//Server/Share/File.package');
  });
});

describe('stablePathCompare', () => {
  it('compares normalized path components deterministically', () => {
    const paths = [
      'Mods\\Accessories\\Ring.package',
      'Mods\\Accessories\\bracelet.package',
      'Mods\\Hair\\B.package',
      'Mods\\Hair\\a.package',
    ];

    const sorted = [...paths].sort(stablePathCompare);
    expect(sorted).toEqual([
      'Mods\\Accessories\\bracelet.package',
      'Mods\\Accessories\\Ring.package',
      'Mods\\Hair\\a.package',
      'Mods\\Hair\\B.package',
    ]);
  });
});
