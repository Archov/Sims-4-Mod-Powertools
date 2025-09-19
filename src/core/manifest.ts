import type { ManifestParseResult, ManifestParserOptions } from '../types.js';

export async function parseManifest(_options: ManifestParserOptions): Promise<ManifestParseResult> {
  // TODO(TaskCard: Manifest Parser (Phase B3)) Parse CSV/JSON/YAML manifests and deduplicate entries.
  void _options;
  throw new Error('parseManifest is not implemented in the skeleton.');
}