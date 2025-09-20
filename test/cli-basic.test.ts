import { describe, it, expect, vi } from 'vitest';
import { buildCli } from '../src/cli.js';
import type { BasicCliOptions } from '../src/basic/types.js';

// Helper to parse argv and capture output/errors
async function parse(argv: string[]) {
  const cli = buildCli();
  let error: Error | undefined;
  let output: Partial<BasicCliOptions> | undefined;

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

  try {
    await cli.parseAsync(argv, { from: 'user' });
    output = cli.commands.find(c => c.name() === 'basic')?.opts();
  } catch (e) {
    error = e as Error;
  }

  const exitCode = exitSpy.mock.calls[0]?.[0];
  const errorMessage = stderrSpy.mock.calls[0]?.[0] as string | undefined;

  // Restore console
  vi.restoreAllMocks();

  return { output, error, exitCode, errorMessage };
}

describe('CLI: basic subcommand', () => {
  it('should parse a minimal valid command', async () => {
    const { output, error } = await parse([
      'basic', 
      '--in', 
      './test/fixtures', 
      '--out', 
      './out/merged.package'
    ]);
    expect(error).toBeUndefined();
    expect(output).toBeDefined();
    expect(output!.in).toEqual(['./test/fixtures']);
    expect(output!.out).toBe('./out/merged.package');
  });

  it('should parse a complex valid command', async () => {
    const { output, error } = await parse([
      'basic', 
      '--in', 'dir1', 
      '--in', 'dir2', 
      '--files', 'list.txt',
      '--by-folder',
      '--out-root', 'out',
      '--sort', 'mtime',
      '--reverse',
      '--max-size', '1024',
      '--manifest-out', 'manifest.yaml',
      '--stats-json', 'stats.json',
      '--verify',
      '--dry-run',
      '--progress'
    ]);

    expect(error).toBeUndefined();
    expect(output).toBeDefined();
    expect(output!.in).toEqual(['dir1', 'dir2']);
    expect(output!.files).toBe('list.txt');
    expect(output!.byFolder).toBe(true);
    expect(output!.outRoot).toBe('out');
    expect(output!.sort).toBe('mtime');
    expect(output!.reverse).toBe(true);
    expect(output!.maxSize).toBe(1024);
    expect(output!.manifestOut).toBe('manifest.yaml');
    expect(output!.statsJson).toBe('stats.json');
    expect(output!.verify).toBe(true);
    expect(output!.dryRun).toBe(true);
    expect(output!.progress).toBe(true);
  });

  it('should apply default values correctly', async () => {
    const { output, error } = await parse([
      'basic', 
      '--files', 'list.txt', 
      '--out', 'out.package'
    ]);
    // console.log(output);
    expect(error).toBeUndefined();
    expect(output).toBeDefined();
    expect(output!.sort).toBe('path');
    expect(output!.reverse).toBe(false);
    expect(output!.byFolder).toBe(false);
    expect(output!.changelog).toBe(true); // Default is true when not provided
    expect(output!.verify).toBe(false);
    expect(output!.dryRun).toBe(false);
    expect(output!.progress).toBe(false);
    expect(output!.in).toEqual([]);
  });

  describe('Flag Validation Errors', () => {
    it('should fail if no input is provided', async () => {
      const { errorMessage, exitCode } = await parse(['basic', '--out', 'out.package']);
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain('Input required');
    });

    it('should fail if no output is provided', async () => {
      const { errorMessage, exitCode } = await parse(['basic', '--in', 'dir']);
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain('Output required');
    });

    it('should fail if --out and --by-folder are combined', async () => {
      const { errorMessage, exitCode } = await parse([
        'basic', 
        '--in', 'dir', 
        '--out', 'out.package', 
        '--by-folder'
      ]);
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain('mutually exclusive');
    });

    it('should fail if --by-folder is used without --out-root', async () => {
      const { errorMessage, exitCode } = await parse(['basic', '--in', 'dir', '--by-folder']);
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain('--by-folder also requires --out-root');
    });

    it('should fail if --out-root is used without --by-folder', async () => {
      const { errorMessage, exitCode } = await parse(['basic', '--in', 'dir', '--out-root', 'out']);
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain('--out-root <dir> can only be used with --by-folder');
    });

    it('should fail with an invalid --sort value', async () => {
      const { errorMessage, exitCode } = await parse([
        'basic', 
        '--in', 'dir', 
        '--out', 'out.package', 
        '--sort', 'invalid'
      ]);
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain("error: option '--sort <method>' argument 'invalid' is invalid. Allowed choices are name, path, mtime.");
    });

    it('should fail with a non-positive --max-size', async () => {
      const { errorMessage, exitCode } = await parse([
        'basic', 
        '--in', 'dir', 
        '--out', 'out.package', 
        '--max-size', '-100'
      ]);
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain('--max-size must be a positive number');
    });
  });

  it('should generate correct help text', async () => {
    const cli = buildCli();
    const help = cli.commands.find(c => c.name() === 'basic')?.helpInformation();
    
    // Check for key flags and descriptions
    expect(help).toContain('--in <dir>');
    expect(help).toContain('Input directory to scan');
    expect(help).toContain('--files <path>');
    expect(help).toContain('--out <path>');
    expect(help).toContain('--by-folder');
    expect(help).toContain('--out-root <dir>');
    expect(help).toContain('--sort <method>');
    expect(help).toContain('--max-size <MB>');
    expect(help).toContain('--dry-run');
  });
});
