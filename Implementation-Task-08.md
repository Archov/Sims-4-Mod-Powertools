# Implementation Task 08: Manifests Module

**Task ID:** 08  
**Priority:** High  
**Estimated Effort:** 4-5 hours  
**Dependencies:** Task 01 (Utilities)  
**Blocks:** Task 11 (Orchestrator)  

## Objective
Implement the manifests module that generates per-output YAML manifests containing detailed metadata about merge operations and inputs.

## Scope
Create a manifest generation system that produces structured YAML files documenting each merge operation according to the specified schema.

## Files to Create/Modify
- `src/basic/manifest.ts` (new)
- `test/manifest.test.ts` (new)
- `test/fixtures/manifest/` (test data directory)

## Acceptance Criteria

### Core Functions
- [ ] `generateManifest(plan: OutputPlan, result: MergeResult, options: ManifestOptions): Promise<Manifest>` - Main entry point
- [ ] `writeManifest(manifest: Manifest, outputPath: string): Promise<void>` - Write YAML file
- [ ] `calculateInputHashes(inputs: PackageInfo[]): Promise<Map<string, string>>` - Optional SHA1 hashes
- [ ] `formatManifestYaml(manifest: Manifest): string` - YAML serialization
- [ ] `validateManifest(manifest: Manifest): ValidationResult` - Schema validation

### Manifest Schema Implementation
```yaml
schema: 1
tool: s4merge
command: "s4merge basic --files @list.txt --out Merged/AllCC.package"
created_utc: "2025-09-19T21:20:00Z"
output:
  path: "Merged/AllCC.package"
  bytes: 123456789
  parts: 1          # >1 if --max-size used
inputs:
  order: { key: "path", reverse: false }
  files:
    - idx: 00001
      path: "D:/Mods/Hair/Anto_Hair-01.package"
      bytes: 1048576
      sha1: "e3b0c44298..."   # optional integrity
      mtime: "2025-09-17T03:12:45Z"
rollover:
  max_mb: null
notes:
  - "Append‑all. No dedupe/conflict logic. Resource intra‑order may be reserialized by S4TK."
```

### Data Structures
```typescript
interface Manifest {
  schema: number;
  tool: string;
  command: string;
  created_utc: string;
  output: OutputInfo;
  inputs: InputsInfo;
  rollover: RolloverInfo;
  notes: string[];
}

interface OutputInfo {
  path: string;
  bytes: number;
  parts: number;
}

interface InputsInfo {
  order: OrderInfo;
  files: InputFileInfo[];
}

interface OrderInfo {
  key: 'name' | 'path' | 'mtime';
  reverse: boolean;
}

interface InputFileInfo {
  idx: string;        // zero-padded index
  path: string;
  bytes: number;
  sha1?: string;      // optional
  mtime: string;      // ISO 8601
}

interface RolloverInfo {
  max_mb: number | null;
}

interface ManifestOptions {
  includeHashes: boolean;
  commandLine: string;
  sortOptions: OrderInfo;
}
```

### YAML Generation
- [ ] Use proper YAML library for serialization
- [ ] Ensure deterministic field ordering
- [ ] Handle special characters in paths correctly
- [ ] Format dates in ISO 8601 UTC format
- [ ] Generate zero-padded index numbers (00001, 00002, etc.)
- [ ] Preserve exact command line as provided

### Hash Calculation (Optional)
- [ ] Calculate SHA1 hashes for input files when requested
- [ ] Handle large files efficiently (streaming)
- [ ] Skip hash calculation by default for performance
- [ ] Provide option to include/exclude hashes
- [ ] Handle files that become inaccessible during processing

### Path Handling
- [ ] Use absolute paths in manifest for clarity
- [ ] Normalize path separators for cross-platform consistency
- [ ] Handle Windows long paths correctly
- [ ] Preserve original path casing where possible
- [ ] Escape special characters in YAML strings

### Tests
- [ ] Basic manifest generation with all fields
- [ ] YAML serialization and deserialization round-trip
- [ ] Cross-platform path handling
- [ ] Hash calculation accuracy and performance
- [ ] Multi-part output handling
- [ ] Special characters in paths and filenames
- [ ] Large input sets (>1000 files)
- [ ] Error handling for inaccessible files

## Implementation Notes
- Use a reliable YAML library (js-yaml or similar)
- Implement efficient hash calculation for large files
- Ensure manifest generation doesn't significantly impact performance
- Handle file system errors gracefully during hash calculation
- Use utilities from Task 01 for path normalization
- Consider memory usage for large input lists

## Definition of Done
- [ ] All core functions implemented with proper TypeScript types
- [ ] YAML output matches specification exactly
- [ ] Cross-platform path handling working correctly
- [ ] Optional hash calculation implemented efficiently
- [ ] Performance acceptable for large input sets
- [ ] Test coverage including edge cases
- [ ] `npm run check` passes
- [ ] Documentation for all public interfaces

## Risk Mitigation
- **Large input sets**: Efficient processing and memory management
- **File system errors**: Graceful handling during hash calculation
- **YAML formatting**: Use well-tested library and validate output
- **Path complexity**: Extensive cross-platform testing
- **Performance impact**: Make hash calculation optional and efficient

## Related Task Cards
- References Core-Design-Document.md §3.1 (Per-output Manifest schema)
- References Core-Design-Document.md §7.5 (Manifests & Changelog task)
- References AGENTS.md §1 (Manifests ownership)
- Uses utilities from Task 01
- Enables Task 11 (Orchestrator)
