# Implementation Task 06: Merger Module

**Task ID:** 06  
**Priority:** High  
**Estimated Effort:** 6-8 hours  
**Dependencies:** Task 01 (Utilities), Task 05 (S4TK Adapter)  
**Blocks:** Task 11 (Orchestrator)  

## Objective
Implement the core merger module that performs append-all operations using S4TK, with support for size caps and crash-safe atomic writes.

## Scope
Create the merger that takes planned outputs and performs the actual package merging with proper error handling, size management, and atomic file operations.

## Files to Create/Modify
- `src/basic/merge.ts` (new)
- `test/merge.test.ts` (new)
- `test/fixtures/merge/` (test data directory)

## Acceptance Criteria

### Core Functions
- [ ] `mergePackages(plan: OutputPlan, options: MergeOptions): Promise<MergeResult>` - Main entry point
- [ ] `performMerge(inputs: PackageInfo[], outputPath: string, options: MergeOptions): Promise<MergeResult>` - Single merge operation
- [ ] `handleSizeRollover(pkg: S4Package, maxSizeMB: number, basePath: string): Promise<string[]>` - Size cap handling
- [ ] `writePackageAtomic(pkg: S4Package, outputPath: string): Promise<void>` - Crash-safe write
- [ ] `calculateMergeStats(inputs: PackageInfo[], result: S4Package): MergeStats` - Statistics collection

### Append-All Logic
- [ ] Create empty target package using S4TK adapter
- [ ] Load each input package in planned order
- [ ] Append all resources from each input to target
- [ ] Maintain input order for deterministic output
- [ ] Handle resource conflicts (last writer wins by position)
- [ ] Track resource counts and types during merge

### Size Cap Implementation
- [ ] Monitor estimated serialized size during merge
- [ ] When approaching `--max-size` limit, finalize current part
- [ ] Start new part with naming pattern: `.part2.package`, `.part3.package`, etc.
- [ ] Ensure deterministic split points (complete packages only)
- [ ] Handle edge case where single input exceeds size cap

### Atomic Write Operations
- [ ] Use utilities from Task 01 for crash-safe writes
- [ ] Write to temporary file first
- [ ] Fsync file and parent directory
- [ ] Atomic rename to final location
- [ ] Clean up temporary files on failure
- [ ] Preserve file permissions and timestamps where appropriate

### Data Structures
```typescript
interface MergeOptions {
  maxSizeMB?: number;
  preserveOrder: boolean;
  verifyAfterWrite: boolean;
  tempDir?: string;
}

interface MergeResult {
  outputPaths: string[];
  totalInputs: number;
  totalResources: number;
  uniqueTypes: Set<string>;
  totalSize: number;
  parts: PartInfo[];
  duration: number;
  errors: string[];
}

interface PartInfo {
  path: string;
  size: number;
  resourceCount: number;
  inputFiles: string[];
}

interface MergeStats {
  resourceCount: number;
  uniqueTypes: Set<string>;
  estimatedSize: number;
  inputsProcessed: number;
}
```

### Error Handling
- [ ] Handle corrupted input packages gracefully
- [ ] Recover from partial merge failures
- [ ] Provide detailed error messages with file context
- [ ] Clean up partial outputs on failure
- [ ] Support retry logic for transient failures

### Tests
- [ ] Basic merge with multiple inputs
- [ ] Size cap rollover with deterministic splits
- [ ] Atomic write failure recovery
- [ ] Corrupted input handling
- [ ] Large package performance
- [ ] Resource order preservation
- [ ] Cross-platform file operations
- [ ] Memory usage with large merges

## Implementation Notes
- Use S4TK adapter from Task 05 exclusively
- Leverage atomic write utilities from Task 01
- Implement proper progress tracking for large operations
- Consider memory usage for very large packages
- Provide detailed logging for debugging
- Handle Windows file locking issues appropriately

## Definition of Done
- [ ] All core functions implemented with proper TypeScript types
- [ ] Crash-safe atomic writes working correctly
- [ ] Size cap rollover implemented and tested
- [ ] Comprehensive error handling and recovery
- [ ] Performance acceptable for large merges (>1GB)
- [ ] Test coverage including failure scenarios
- [ ] `npm run check` passes
- [ ] Documentation for all public interfaces

## Risk Mitigation
- **Memory usage**: Stream processing for very large packages
- **File system errors**: Robust error handling and cleanup
- **Corrupted inputs**: Graceful degradation and reporting
- **Platform differences**: Extensive cross-platform testing
- **Performance**: Profile and optimize critical paths

## Related Task Cards
- References Core-Design-Document.md §4 (High-Level Flow, step 5)
- References Core-Design-Document.md §7.4 (Merger + Verify task)
- References AGENTS.md §1 (Merger ownership)
- Uses utilities from Task 01
- Uses S4TK adapter from Task 05
- Enables Task 11 (Orchestrator)
