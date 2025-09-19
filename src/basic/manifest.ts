// Manifests: Emit per-output YAML manifest matching §3.1 schema.
import type { Plan } from './plan.js';

export async function writeManifests(plan: Plan, opts: { manifestOut?: string }): Promise<void> {
  // TODO(#7.5): Emit YAML manifest(s). For now, no-op.
  void plan;
  void opts;
}
