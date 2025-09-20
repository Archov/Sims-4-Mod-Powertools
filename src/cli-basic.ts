import { type Command, Option } from 'commander';
import { runBasic } from './basic/main.js';

/**
 * Parsed and validated options for the 'basic' subcommand.
 */
export interface BasicCliOptions {
  in: string[];
  files?: string;
  out?: string;
  byFolder: boolean;
  outRoot?: string;
  sort: 'name' | 'path' | 'mtime';
  reverse: boolean;
  maxSize?: number;
  manifestOut?: string;
  noChangelog: boolean;
  statsJson?: string;
  verify: boolean;
  dryRun: boolean;
  progress: boolean;
}

/**
 * Validates parsed CLI options for the 'basic' subcommand.
 * Throws an error if validation fails.
 *
 * @param options Parsed options from Commander.
 */
export function validateBasicOptions(options: BasicCliOptions): void {
  if (options.in.length === 0 && !options.files) {
    throw new Error("Input required: specify at least one --in <dir> or --files <path>.");
  }

  if (options.outRoot && !options.byFolder) {
    throw new Error("Input error: --out-root <dir> can only be used with --by-folder.");
  }

  if (!options.out && !options.byFolder) {
    throw new Error("Output required: specify either --out <path> or --by-folder.");
  }

  if (options.out && options.byFolder) {
    throw new Error("Output conflict: --out <path> and --by-folder are mutually exclusive.");
  }

  if (options.byFolder && !options.outRoot) {
    throw new Error("Output required: --by-folder also requires --out-root <dir>.");
  }

  if (options.maxSize !== undefined && options.maxSize <= 0) {
    throw new Error("Validation error: --max-size must be a positive number.");
  }
}

/**
 * Registers the 'basic' subcommand and its options with the main CLI program.
 *
 * @param program The Commander program instance.
 */
export function registerBasicSubcommand(program: Command): void {
  program
    .command('basic')
    .summary('Append-all package merger')
    .description(
      'A tiny, deterministic, append-all aggregator: take an ordered list of .package files and produce one merged .package (or multiple with --by-folder). No policy, no dedupe, no conflict logic—just concatenate resources in a stable order.'
    )
    .option(
      '--in <dir>',
      'Input directory to scan for .package files (repeatable).',
      (value, previous: string[] = []) => previous.concat(value),
      []
    )
    .option('--files <path>', 'Path to a text file listing input .package files (one per line).')
    .option('--out <path>', 'Path to the single merged output .package file.')
    .option('--by-folder', 'Group outputs by top-level folder; requires --out-root.', false)
    .option('--out-root <dir>', 'Output directory for packages created with --by-folder.')
    .addOption(
      new Option('--sort <method>', 'Sort method for input files.')
        .choices(['name', 'path', 'mtime'])
        .default('path')
    )
    .option('--reverse', 'Reverse the sort order.', false)
    .option('--max-size <MB>', 'Roll over to a new .partN.package file when this size is exceeded.', (val) => parseFloat(val))
    .option('--manifest-out <path>', 'Path to write the output manifest YAML file.')
    .option('--no-changelog', 'Skip writing the run-level changelog file.', false)
    .option('--stats-json <path>', 'Path to write a JSON file with final stats.')
    .option('--verify', 'Re-open and verify the merged package(s) after writing.', false)
    .option('--dry-run', 'Analyze inputs and plan outputs without writing any files.', false)
    .option('--progress', 'Display a progress bar.', false)
    .action(async (options: BasicCliOptions) => {
      try {
        validateBasicOptions(options);
        const code = await runBasic(options);
        if (Number.isInteger(code)) {
          process.exitCode = code;
        }
      } catch (e) {
        if (e instanceof Error) {
          program.error(e.message);
        }
      }
    });
}