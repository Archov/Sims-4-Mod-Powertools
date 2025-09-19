import type { CliOptions, ModeOption, RawCliOptions } from './types.js';

const ALLOWED_MODES: ModeOption[] = ['by-folder', 'by-manifest'];
const DEFAULT_PRESETS = ['CAS', 'BuildBuy'];

export async function run(rawOptions: RawCliOptions): Promise<number> {
  const options = normalizeOptions(rawOptions);

  const summary = [
    `mode=${options.mode}`,
    `dryRun=${options.dryRun}`,
    `inputs=${options.inputDirectories.length}`,
    `manifest=${options.manifestPath ?? 'none'}`,
    `report=${options.reportPath ?? 'none'}`,
    `presets=${options.allowedPresets.join(',')}`,
  ].join(' ');

  console.log(`s4merge stub -> ${summary}`);

  return 0;
}

function normalizeOptions(rawOptions: RawCliOptions): CliOptions {
  const inputDirectories = normalizeStringArray(rawOptions.in);
  const manifestPath = normalizeOptionalString(rawOptions.manifest, '--manifest');
  const outRoot = normalizeOptionalString(rawOptions.outRoot, '--out-root');
  const reportPath = normalizeOptionalString(rawOptions.report, '--report');
  const mode = normalizeMode(rawOptions.mode);
  const allowedPresets = normalizePresets(rawOptions.allowPresets);
  const dryRun = Boolean(rawOptions.dryRun);

  return {
    inputDirectories,
    manifestPath,
    outRoot,
    reportPath,
    mode,
    allowedPresets,
    dryRun,
  };
}

function normalizeMode(mode: unknown): ModeOption {
  const modeValue = typeof mode === 'string' && mode.length > 0 ? (mode as ModeOption) : ALLOWED_MODES[0];
  if (!ALLOWED_MODES.includes(modeValue)) {
    throw new Error(`Unsupported --mode value: ${mode}`);
  }
  return modeValue;
}

function normalizePresets(presets: unknown): string[] {
  const rawValue = typeof presets === 'string' && presets.length > 0 ? presets : DEFAULT_PRESETS.join(',');
  const prepared = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (prepared.length === 0) {
    throw new Error('Expected at least one preset via --allow-presets.');
  }
  return prepared;
}

function normalizeStringArray(values: unknown): string[] {
  if (values === undefined) {
    return [];
  }
  if (Array.isArray(values)) {
    return values.map((value, index) => {
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Expected --in value at index ${index} to be a non-empty string.`);
      }
      return value;
    });
  }
  if (typeof values === 'string' && values.length > 0) {
    return [values];
  }
  throw new Error('Expected --in to be provided as a string or repeated option.');
}

function normalizeOptionalString(value: unknown, flag: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  throw new Error(`Expected ${flag} to receive a non-empty string.`);
}