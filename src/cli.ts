#!/usr/bin/env node
import { Command, Option } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { DEFAULT_ALLOWED_PRESETS } from './core/taxonomy.js';
import { run } from './main.js';
import { ALLOWED_MODES, type RawCliOptions } from './types.js';

const CLI_VERSION = pkg.version;

export function buildCli(): Command {
  const program = new Command();

  program
    .name('s4merge')
    .description('Skeleton CLI stub for Sims 4 package merging (no-op).')
    .version(CLI_VERSION);

  program
    .addOption(
      new Option('--in <dir...>', 'Input directories to scan').default([]),
    )
    .option('--manifest <path>', 'Manifest file describing bucket assignments')
    .option('--out-root <dir>', 'Output root directory for merged packages')
    .addOption(
      new Option('--mode <mode>', 'Planning mode to use')
        .choices([...ALLOWED_MODES])
        .default(ALLOWED_MODES[0]),
    )
    .option(
      '--allow-presets <csv>',
      'Comma separated preset names allowed in the skeleton dry-run',
      DEFAULT_ALLOWED_PRESETS.join(','),
    )
    .option('--dry-run', 'Run without performing writes (default behavior)')
    .option('--report <file>', 'Report output path (unused)');

  program.action(async (options: RawCliOptions) => {
    try {
      const exitCode = await run(options);
      if (Number.isInteger(exitCode)) {
        process.exitCode = exitCode;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

  return program;
}

async function main(argv: readonly string[]): Promise<void> {
  const cli = buildCli();
  await cli.parseAsync(argv);
}

const invokedScript = process.argv[1] ?? '';
if (/\bcli\.(?:[mc]?js|ts)$/i.test(invokedScript)) {
  void main(process.argv);
}