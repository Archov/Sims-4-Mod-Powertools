#!/usr/bin/env node
import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { registerBasicSubcommand } from './cli-basic.js';

const CLI_VERSION = pkg.version;

export function buildCli(): Command {
  const program = new Command();

  program
    .name('s4merge')
    .description('Sims 4 package merger tooling')
    .version(CLI_VERSION);

  // Register subcommands
  registerBasicSubcommand(program);

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