// Merger: Append-all using S4TK; handle --max-size rollover; crash-safe writes.
import type { Plan } from './plan.js';

export async function mergeAll(plan: Plan, opts: { maxSizeMb?: number; progress: boolean }): Promise<void> {
  // TODO(#7.4): Implement merge via S4TK adapter with temp + atomic rename.
  void plan;
  void opts;
}
