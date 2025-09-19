# Implementation Task 11: Orchestrator Module

**Task ID:** 11  
**Priority:** High (Integration)  
**Estimated Effort:** 5-6 hours  
**Dependencies:** Tasks 01-10 (All previous modules)  
**Blocks:** Task 12 (Progress & UX)  

## Objective
Implement the main orchestrator that coordinates all modules to execute the complete basic merge workflow from CLI input to final outputs.

## Scope
Create the central orchestrator that integrates all modules into a cohesive workflow, handling the complete flow from input collection through final output generation.

## Files to Create/Modify
- `src/basic/main.ts` (new)
- `test/main.test.ts` (new)
- `test/fixtures/integration/` (test data directory)

## Acceptance Criteria

### Core Functions
- [ ] `executeBasicMerge(options: BasicCliOptions): Promise<BasicMergeResult>` - Main entry point
- [ ] `performDryRun(plan: MergePlan): Promise<DryRunResult>` - Dry-run analysis
- [ ] `executeMergePlan(plan: MergePlan, options: BasicCliOptions): Promise<MergeExecutionResult>` - Execute merge
- [ ] `generateAllOutputs(results: MergeExecutionResult, options: BasicCliOptions): Promise<void>` - Generate artifacts
- [ ] `validatePrerequisites(options: BasicCliOptions): Promise<ValidationResult>` - Pre-flight checks

### Workflow Implementation
Following Core-Design-Document.md §4 (High-Level Flow):

1. **Collect Phase**
   - [ ] Use Scanner to expand `--files` and enumerate `--in` directories
   - [ ] Handle both file lists and directory scanning
   - [ ] Collect comprehensive input metadata

2. **Order Phase**
   - [ ] Apply stable sorting per `--sort` and `--reverse` flags
   - [ ] Freeze input list for deterministic processing
   - [ ] Validate all inputs are accessible

3. **Plan Phase**
   - [ ] Use Planner to map inputs to outputs
   - [ ] Handle both single output and `--by-folder` modes
   - [ ] Generate complete execution plan

4. **Dry-Run Phase** (if requested)
   - [ ] Print ordered input list with metadata
   - [ ] Show planned outputs with size estimates
   - [ ] Display summary statistics
   - [ ] Exit without performing merge

5. **Merge Phase**
   - [ ] Use Merger for each planned output
   - [ ] Handle size caps and multi-part outputs
   - [ ] Collect merge results and statistics

6. **Verify Phase** (if requested)
   - [ ] Use Verify module to validate outputs
   - [ ] Report verification results
   - [ ] Handle verification failures appropriately

7. **Emit Phase**
   - [ ] Generate manifests for each output
   - [ ] Generate run-level changelog (unless skipped)
   - [ ] Generate stats JSON (if requested)

### Data Structures
```typescript
interface BasicMergeResult {
  success: boolean;
  outputs: string[];
  manifests: string[];
  changelog?: string;
  stats?: string;
  summary: OperationSummary;
  errors: string[];
  warnings: string[];
}

interface DryRunResult {
  plan: MergePlan;
  inputs: PackageInfo[];
  estimatedOutputs: OutputEstimate[];
  summary: DryRunSummary;
}

interface MergeExecutionResult {
  results: MergeResult[];
  timing: TimingInfo;
  verification?: VerifyResult;
}

interface OperationSummary {
  totalInputs: number;
  totalOutputs: number;
  totalResources: number;
  totalSizeMB: number;
  duration: number;
}

interface OutputEstimate {
  path: string;
  inputCount: number;
  estimatedSizeMB: number;
  estimatedParts: number;
}
```

### Error Handling Strategy
- [ ] Validate all prerequisites before starting
- [ ] Fail fast on critical errors (invalid paths, permissions)
- [ ] Collect and report non-fatal errors
- [ ] Provide recovery suggestions where possible
- [ ] Clean up partial outputs on failure
- [ ] Maintain operation atomicity where feasible

### Progress Integration
- [ ] Coordinate with Task 12 for progress reporting
- [ ] Provide phase-level progress updates
- [ ] Support quiet mode and TTY detection
- [ ] Handle progress reporting errors gracefully

### Integration Points
- [ ] **CLI Integration**: Accept parsed options from Task 02
- [ ] **Scanner Integration**: Use Task 03 for input discovery
- [ ] **Planner Integration**: Use Task 04 for output planning
- [ ] **S4TK Integration**: Use Task 05 adapter for package operations
- [ ] **Merger Integration**: Use Task 06 for merge execution
- [ ] **Verify Integration**: Use Task 07 for optional verification
- [ ] **Manifest Integration**: Use Task 08 for manifest generation
- [ ] **Changelog Integration**: Use Task 09 for changelog generation
- [ ] **Stats Integration**: Use Task 10 for statistics collection
- [ ] **Utilities Integration**: Use Task 01 for cross-cutting concerns

### Tests
- [ ] End-to-end integration tests with real package files
- [ ] Dry-run mode testing
- [ ] Error handling and recovery scenarios
- [ ] Multi-output workflows (`--by-folder`)
- [ ] Size cap and rollover scenarios
- [ ] Verification workflows
- [ ] Cross-platform compatibility
- [ ] Performance with large input sets

## Implementation Notes
- Keep orchestrator focused on coordination, not business logic
- Use pure functions from modules where possible
- Implement proper error aggregation and reporting
- Ensure deterministic execution order
- Handle resource cleanup on failures
- Provide comprehensive logging for debugging

## Definition of Done
- [ ] Complete workflow implementation matching specification
- [ ] All modules properly integrated and coordinated
- [ ] Comprehensive error handling and recovery
- [ ] End-to-end tests covering major scenarios
- [ ] Performance acceptable for large operations
- [ ] Cross-platform compatibility verified
- [ ] `npm run check` passes
- [ ] Documentation for main entry points

## Risk Mitigation
- **Integration complexity**: Thorough testing of module interactions
- **Error propagation**: Careful error handling strategy
- **Resource management**: Proper cleanup on failures
- **Performance**: Profile and optimize critical paths
- **Platform differences**: Extensive cross-platform testing

## Related Task Cards
- References Core-Design-Document.md §4 (High-Level Flow)
- References Core-Design-Document.md §5 (Module Layout)
- References AGENTS.md §1 (Orchestrator ownership)
- Integrates all previous tasks (01-10)
- Enables Task 12 (Progress & UX)
