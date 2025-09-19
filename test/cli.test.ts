import { describe, expect, it, vi } from 'vitest';
import { buildCli } from '../src/cli.js';

describe('s4merge basic --help', () => {
  it('lists the documented options for the basic subcommand', () => {
    const program = buildCli();
    const basic = program.commands.find(c => c.name() === 'basic');
    const help = basic ? basic.helpInformation() : '';

    const expectedFlags = [
      '--in',
      '--files',
      '--out',
      '--by-folder',
      '--out-root',
      '--sort',
      '--reverse',
      '--max-size',
      '--manifest-out',
      '--no-changelog',
      '--stats-json',
      '--verify',
      '--dry-run',
      '--progress',
    ];

    for (const flag of expectedFlags) {
      expect(help).toContain(flag);
    }
  });

  it('runs a dry-run and prints a basic summary', async () => {
    const cli = buildCli();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.parseAsync(['basic', '--dry-run', '--out', 'D:/Merged/All.package'], { from: 'user' });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('basic: planned'));
    logSpy.mockRestore();
    process.exitCode = undefined;
  });
});
