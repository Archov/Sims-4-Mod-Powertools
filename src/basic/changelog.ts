// Changelog: Optional run-level YAML, skipped with --no-changelog.
import type { Plan } from './plan.js';

export async function writeRunChangelog(plan: Plan): Promise<void> {
  // TODO(#7.5): Emit a summary YAML changelog per run.
  void plan;
}
