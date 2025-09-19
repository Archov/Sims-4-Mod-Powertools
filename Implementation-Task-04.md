# Implementation Task 04: Planner Module

**Task ID:** 04  
**Priority:** High  
**Estimated Effort:** 4-5 hours  
**Dependencies:** Task 01 (Utilities), Task 03 (Scanner)  
**Blocks:** Task 11 (Orchestrator)  

## Objective
Implement the planner module that maps input packages to output targets, supporting both single output and by-folder grouping modes.

## Scope
Create a planner that takes scanned input packages and determines the output structure based on CLI options, handling both single-file outputs and folder-based grouping.

## Files to Create/Modify
- `src/basic/plan.ts` (new)
- `test/plan.test.ts` (new)
- `test/fixtures/plan/` (test data directory)

## Acceptance Criteria

### Core Functions
- [ ] `planMerge(inputs: PackageInfo[], options: PlanOptions): Promise<MergePlan>` - Main entry point
- [ ] `planSingleOutput(inputs: PackageInfo[], outputPath: string): OutputPlan` - Single file mode
- [ ] `planByFolder(inputs: PackageInfo[], outRoot: string, inDirs: string[]): OutputPlan[]` - Folder grouping mode
- [ ] `groupByTopFolder(inputs: PackageInfo[], inDirs: string[]): Map<string, PackageInfo[]>` - Folder grouping logic
- [ ] `generateOutputPath(outRoot: string, groupName: string): string` - Output path generation

### Single Output Mode
- [ ] All inputs go to single specified output file
- [ ] Validate output directory exists and is writable
- [ ] Generate default manifest path (`<output>.manifest.yaml`)
- [ ] Calculate total input size for size cap planning

### By-Folder Mode
- [ ] Group inputs by their top-level folder under each `--in` directory
- [ ] Generate output files as `<out-root>/<group-name>.package`
- [ ] Handle inputs from multiple `--in` directories
- [ ] Ensure deterministic group naming
- [ ] Handle edge cases (files directly in `--in` root)

### Folder Grouping Logic
- [ ] For each input file, determine which `--in` directory it belongs to
- [ ] Extract the first subdirectory name as the group key
- [ ] Files directly in `--in` root use special group name (e.g., "root")
- [ ] Normalize group names for safe filenames (no special chars)
- [ ] Handle case sensitivity consistently across platforms

### Data Structures
```typescript
interface PlanOptions {
  mode: 'single' | 'by-folder';
  outputPath?: string;        // for single mode
  outRoot?: string;          // for by-folder mode
  inDirs: string[];          // input directories for grouping
  maxSizeMB?: number;        // for size cap planning
}

interface OutputPlan {
  outputPath: string;
  manifestPath: string;
  inputs: PackageInfo[];
  totalSize: number;
  estimatedParts: number;    // based on maxSizeMB
  groupName?: string;        // for by-folder mode
}

interface MergePlan {
  outputs: OutputPlan[];
  totalInputs: number;
  totalSize: number;
  mode: 'single' | 'by-folder';
}
```

### Size Cap Planning
- [ ] Calculate estimated number of parts based on `--max-size`
- [ ] Account for S4TK serialization overhead (estimate 10% growth)
- [ ] Provide warnings for very large outputs
- [ ] Handle edge case where single input exceeds size cap

### Tests
- [ ] Single output mode with various input combinations
- [ ] By-folder grouping with nested directory structures
- [ ] Cross-platform path handling in grouping
- [ ] Edge cases (empty groups, files in root, special characters)
- [ ] Size cap calculations and part estimation
- [ ] Deterministic group naming across platforms
- [ ] Error handling (invalid paths, permission issues)

## Implementation Notes
- Use utilities from Task 01 for path normalization
- Leverage scanner results from Task 03
- Implement deterministic grouping that works across platforms
- Handle Windows vs Unix path separators correctly
- Provide clear error messages for invalid configurations
- Consider memory usage for large input sets

## Definition of Done
- [ ] All core functions implemented with proper TypeScript types
- [ ] Comprehensive test coverage for both modes
- [ ] Cross-platform compatibility verified
- [ ] Deterministic output naming across platforms
- [ ] Error handling provides actionable feedback
- [ ] `npm run check` passes
- [ ] Documentation for all public interfaces

## Risk Mitigation
- **Path handling complexity**: Use Task 01 utilities extensively
- **Group naming conflicts**: Implement collision detection and resolution
- **Large input sets**: Efficient grouping algorithms
- **Platform differences**: Extensive cross-platform testing
- **Edge cases**: Comprehensive test coverage for unusual directory structures

## Related Task Cards
- References Core-Design-Document.md §4 (High-Level Flow, step 3)
- References Core-Design-Document.md §7.3 (Planner task)
- References AGENTS.md §1 (Planner ownership)
- Uses utilities from Task 01
- Uses scanner results from Task 03
- Enables Task 11 (Orchestrator)
