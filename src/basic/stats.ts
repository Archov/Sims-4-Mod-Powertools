// Stats: Optional counts/timings to JSON when requested.
import type { Plan } from './plan.js';

export async function writeStatsJson(plan: Plan, outputPath: string): Promise<void> {
  // TODO(#7.6): Compute and write JSON stats deterministically.
  void plan;
  void outputPath;
}
