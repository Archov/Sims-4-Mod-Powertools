import { describe, expect, it } from 'vitest';
import { stableCompare } from '../src/util/determinism.js';

describe('stableCompare', () => {
  it('orders ASCII strings before non-ASCII variants', () => {
    const input = ['Ångström', 'alpha', 'Beta', 'ábaco', 'ALPHA', 'beta'];
    const result = [...input].sort(stableCompare);
    expect(result).toEqual(['ALPHA', 'alpha', 'Beta', 'beta', 'ábaco', 'Ångström']);
  });

  it('produces deterministic ordering across repeated sorts', () => {
    const source = ['été', 'Eclair', 'écarlate', 'Zulu', 'álgebra'];
    const sortedA = [...source].sort(stableCompare);
    const sortedB = [...source].sort(stableCompare);
    expect(sortedA).toEqual(sortedB);
  });

  it('returns zero for identical strings', () => {
    expect(stableCompare('package', 'package')).toBe(0);
  });
});