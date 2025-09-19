// Planner: Map inputs -> outputs (single --out or --by-folder -> <out-root>/<group>.package)
export type Plan = { outputs: { target: string; inputs: string[] }[] };

export function planMerge(opts: { inputs: string[]; out?: string; byFolder: boolean; outRoot?: string }): Plan {
  // TODO(#7.3): Implement grouping logic per Core-Design-Document §5.
  void opts;
  return { outputs: [] };
}
