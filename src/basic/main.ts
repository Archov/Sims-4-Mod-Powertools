import type { BasicCliOptions } from '../cli-basic.js';

export async function runBasic(options: BasicCliOptions): Promise<number> {
  // TODO: Implement orchestrator logic in Task 11
  if (options.dryRun) {
    console.log('Dry run complete. No files were written.');
  }
  return 0;
}
