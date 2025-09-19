// Scanner: expand --files and/or enumerate --in recursively for *.package.
// Determinism: stable sort by path|name|mtime with optional reverse.
export type ScanOptions = {
  inDirs: string[];
  listFile?: string;
  sortKey: 'name' | 'path' | 'mtime';
  reverse: boolean;
};

export async function scanInputs(opts: ScanOptions): Promise<string[]> {
  // TODO(#7.2): Implement directory enumeration and @list parsing.
  // Acceptance: ignore hidden/temp; de-dupe paths; stable ordering.
  // For now, return empty to allow compilation.
  void opts;
  return [];
}
