import { describe, expect, it, vi } from 'vitest';
import { buildCli } from '../src/cli.js';

describe('cli --help', () => {
  it('lists the documented options', () => {
    const help = buildCli().helpInformation();
    const expectedFlags = ['--in', '--manifest', '--out-root', '--mode', '--dry-run', '--allow-presets', '--report'];

    for (const flag of expectedFlags) {
      expect(help).toContain(flag);
    }
  });

  it('invokes the runner with shared defaults applied', async () => {
    const cli = buildCli();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.parseAsync(['node', 's4merge'], { from: 'user' });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('presets=CAS,BuildBuy'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('outRoot=none'));
    logSpy.mockRestore();
    process.exitCode = undefined;
  });
});
