export const ALLOWED_MODES = ['by-folder', 'by-manifest'] as const;
export type ModeOption = (typeof ALLOWED_MODES)[number];

export interface RawCliOptions {
  in?: string[] | string;
  manifest?: string;
  outRoot?: string;
  mode?: string;
  allowPresets?: string;
  dryRun?: boolean;
  report?: string;
}

export interface CliOptions {
  inputDirectories: string[];
  manifestPath?: string;
  outRoot?: string;
  reportPath?: string;
  mode: ModeOption;
  allowedPresets: string[];
  dryRun: boolean;
}

export interface ScanRequest {
  inputDirectories: string[];
}

export interface ScanResult {
  packagePaths: string[];
  warnings: string[];
}

export interface ManifestParserOptions {
  manifestPath: string;
}

export interface ManifestBucket {
  bucketName: string;
  files: string[];
}

export interface ManifestParseResult {
  buckets: ManifestBucket[];
  warnings: string[];
}

export interface PlanRequest {
  scan: ScanResult;
  manifest?: ManifestParseResult;
}

export interface PlanResult {
  buckets: ManifestBucket[];
  inputs: string[];
  stats: Record<string, number>;
}

export interface ReportOptions {
  plan: PlanResult;
}

export interface ReportOutputs {
  json: string;
  csv: string;
}

export type TgiString = string;