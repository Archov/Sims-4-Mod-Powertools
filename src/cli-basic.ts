import { Option } from 'commander';
import type { Command } from 'commander';

// Registers the "basic" subcommand and its flags on the provided program.
// This file owns only CLI wiring and validation. It must delegate execution
// to orchestrator code in src/basic/main.ts.
export function registerBasicSubcommand(program: Command): void {
  const cmd = program
    .command('basic')
    .description('Append-all merger: concatenate package resources in a deterministic order')
    .addOption(new Option('--in <dir...>', 'Input directories to scan').default([]))
    .option('--files <path>', 'Path to @list.txt containing one input path per line')
    .option('--out <file>', 'Output .package file (mutually exclusive with --by-folder)')
    .option('--by-folder', 'Group outputs by top-level input folder name')
    .option('--out-root <dir>', 'Output root directory when using --by-folder')
    .addOption(new Option('--sort <key>', 'Sort key: name|path|mtime').choices(['name', 'path', 'mtime']).default('path'))
    .option('--reverse', 'Reverse the selected sort order', false)
    .addOption(new Option('--max-size <MB>', 'Max output size in MB before rolling to .partN').argParser((v) => Number(v)))
    .option('--manifest-out <path>', 'Path for per-output manifest YAML (default: <out>.manifest.yaml)')
    .option('--no-changelog', 'Skip run-level changelog emission')
    .option('--stats-json <path>', 'Write basic counts/timings as JSON')
    .option('--verify', 'Reopen outputs and perform basic sanity checks', false)
    .option('--dry-run', 'Analyze only; do not write outputs', false)
    .option('--progress', 'Print progress suitable for TTYs', false);

  cmd.action(async (opts) => {
    // Local, lazy import to avoid loading orchestrator for other subcommands.
    const { runBasic } = await import('./basic/main.js');

    // Minimal validation here; detailed validation can live in orchestrator.
    if (opts.byFolder && !opts.outRoot) {
      throw new Error('--by-folder requires --out-root');
    }
    if (!opts.byFolder && !opts.out) {
      throw new Error('Either --out or --by-folder must be provided');
    }
    if (opts.byFolder && opts.out) {
      throw new Error('--out cannot be used with --by-folder');
    }

    const code = await runBasic(opts);
    if (Number.isInteger(code)) {
      process.exitCode = code;
    }
  });
}
