import { describe, expect, it } from 'vitest';
import { buildCli } from '../src/cli.js';

describe('cli --help', () => {
  it('lists the documented options', () => {
    const help = buildCli().helpInformation();
    const expectedFlags = ['--in', '--manifest', '--out-root', '--mode', '--dry-run', '--allow-presets', '--report'];

    for (const flag of expectedFlags) {
      expect(help).toContain(flag);
    }
  });
});