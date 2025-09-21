import type { BasicCliOptions } from './types.js';

export async function runBasic(options: BasicCliOptions): Promise<number> {
  // TODO: Implement orchestrator logic in Task 11
  if (options.dryRun) {
    // TODO(Task 11): compute plan and return status; CLI will render any messages.
  }
  return 0;
}
