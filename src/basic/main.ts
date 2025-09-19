// Orchestrator for the "basic" append-all merger.
// Compose pure steps (scan -> plan) and side-effectful steps (merge -> emit).
export type BasicOptions = {
  in?: string[];
  files?: string;
  out?: string;
  byFolder?: boolean;
  outRoot?: string;
  sort?: 'name' | 'path' | 'mtime';
  reverse?: boolean;
  maxSize?: number | undefined;
  manifestOut?: string | undefined;
  changelog?: boolean | undefined; // true unless --no-changelog
  statsJson?: string | undefined;
  verify?: boolean;
  dryRun?: boolean;
  progress?: boolean;
  // Accept unknowns but ignore for now; CLI validates combinations.
  [key: string]: unknown;
};

export type PlannedOutput = {
  target: string;
  inputs: string[];
};

export async function runBasic(options: BasicOptions): Promise<number> {
  // Scanner: collect inputs
  const { scanInputs } = await import('./scanner.js');
  const inputs = await scanInputs({
    inDirs: (options.in ?? []) as string[],
    listFile: (options.files as string | undefined) ?? undefined,
    sortKey: (options.sort as 'name' | 'path' | 'mtime') ?? 'path',
    reverse: Boolean(options.reverse),
  });

  // Planner: map to outputs
  const { planMerge } = await import('./plan.js');
  const plan = planMerge({
    inputs,
    out: options.out as string | undefined,
    byFolder: Boolean(options.byFolder),
    outRoot: (options.outRoot as string | undefined) ?? undefined,
  });

  // Dry-run reporting
  if (options.dryRun) {
    // For now, print a tiny summary. Proper reporting comes in tasks 7.5/7.6.
    console.log(`basic: planned ${plan.outputs.length} output(s) from ${inputs.length} input(s)`);
    return 0;
  }

  // Merge
  const { mergeAll } = await import('./merge.js');
  await mergeAll(plan, {
    maxSizeMb: options.maxSize as number | undefined,
    progress: Boolean(options.progress),
  });

  // Optional verify
  if (options.verify) {
    const { verifyOutputs } = await import('./verify.js');
    await verifyOutputs(plan);
  }

  // Emit manifests/changelog/stats
  const { writeManifests } = await import('./manifest.js');
  await writeManifests(plan, { manifestOut: options.manifestOut as string | undefined });

  if (options.changelog !== false) {
    const { writeRunChangelog } = await import('./changelog.js');
    await writeRunChangelog(plan);
  }

  if (options.statsJson) {
    const { writeStatsJson } = await import('./stats.js');
    await writeStatsJson(plan, options.statsJson as string);
  }

  return 0;
}
