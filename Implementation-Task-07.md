# Implementation Task 07: Verify Module

**Task ID:** 07  
**Priority:** High  
**Estimated Effort:** 3-4 hours  
**Dependencies:** Task 01 (Utilities), Task 05 (S4TK Adapter)  
**Blocks:** Task 11 (Orchestrator)  

## Objective
Implement the verification module that performs optional post-merge sanity checks to ensure merge integrity and provide diagnostic information.

## Scope
Create a verification system that can reopen merged packages and validate basic invariants like resource counts and provide diagnostic reports.

## Files to Create/Modify
- `src/basic/verify.ts` (new)
- `test/verify.test.ts` (new)
- `test/fixtures/verify/` (test data directory)

## Acceptance Criteria

### Core Functions
- [ ] `verifyMergeResult(result: MergeResult, inputs: PackageInfo[]): Promise<VerifyResult>` - Main entry point
- [ ] `verifyPackage(packagePath: string): Promise<PackageVerifyResult>` - Single package verification
- [ ] `compareResourceCounts(expected: number, actual: number): boolean` - Count validation
- [ ] `generateTypeHistogram(pkg: S4Package): TypeHistogram` - Resource type analysis
- [ ] `validatePackageIntegrity(pkg: S4Package): IntegrityResult` - Basic integrity checks

### Resource Count Verification
- [ ] Reopen each output package using S4TK adapter
- [ ] Count total resources in merged output
- [ ] Compare against sum of input resource counts (tracked during merge)
- [ ] Report any discrepancies with detailed breakdown
- [ ] Handle multi-part outputs correctly

### Type Histogram Analysis
- [ ] Enumerate all resource types in merged package
- [ ] Count resources per type ID
- [ ] Compare against expected distribution from inputs
- [ ] Log histogram to help with debugging
- [ ] Identify unusual type distributions

### Basic Integrity Checks
- [ ] Verify package can be loaded without errors
- [ ] Check for basic S4TK package structure validity
- [ ] Validate resource headers are readable
- [ ] Detect obvious corruption indicators
- [ ] Report file size consistency

### Data Structures
```typescript
interface VerifyResult {
  success: boolean;
  packages: PackageVerifyResult[];
  totalResourcesExpected: number;
  totalResourcesActual: number;
  discrepancies: string[];
  warnings: string[];
  duration: number;
}

interface PackageVerifyResult {
  path: string;
  success: boolean;
  resourceCount: number;
  typeHistogram: TypeHistogram;
  integrity: IntegrityResult;
  errors: string[];
}

interface TypeHistogram {
  types: Map<string, number>;
  totalResources: number;
  uniqueTypes: number;
}

interface IntegrityResult {
  valid: boolean;
  canLoad: boolean;
  structureValid: boolean;
  issues: string[];
}
```

### Verification Modes
- [ ] **Quick mode**: Basic counts and load test only
- [ ] **Full mode**: Complete type analysis and integrity checks
- [ ] **Diagnostic mode**: Detailed logging and reporting
- [ ] Support for skipping verification entirely (performance)

### Error Handling
- [ ] Handle corrupted output packages gracefully
- [ ] Continue verification even if some packages fail
- [ ] Provide detailed error context and suggestions
- [ ] Distinguish between verification failures and package corruption
- [ ] Support partial verification results

### Tests
- [ ] Successful verification of valid merges
- [ ] Detection of resource count mismatches
- [ ] Handling of corrupted output packages
- [ ] Type histogram accuracy
- [ ] Multi-part package verification
- [ ] Performance with large packages
- [ ] Error recovery and reporting

## Implementation Notes
- Use S4TK adapter from Task 05 exclusively
- Keep verification operations read-only
- Implement efficient resource counting without full enumeration
- Provide configurable verbosity levels
- Consider memory usage for large package verification
- Support both synchronous and asynchronous verification modes

## Definition of Done
- [ ] All core functions implemented with proper TypeScript types
- [ ] Accurate resource count verification
- [ ] Comprehensive type histogram generation
- [ ] Robust error handling for corrupted packages
- [ ] Performance acceptable for large packages
- [ ] Test coverage including corruption scenarios
- [ ] `npm run check` passes
- [ ] Documentation for all public interfaces

## Risk Mitigation
- **Corrupted outputs**: Graceful handling and clear reporting
- **Performance impact**: Efficient algorithms and optional verification
- **Memory usage**: Stream-based processing for large packages
- **False positives**: Careful validation logic to avoid spurious errors
- **S4TK compatibility**: Robust error handling for S4TK issues

## Related Task Cards
- References Core-Design-Document.md §4 (High-Level Flow, step 7)
- References Core-Design-Document.md §7.4 (Merger + Verify task)
- References AGENTS.md §1 (Verify ownership)
- Uses utilities from Task 01
- Uses S4TK adapter from Task 05
- Enables Task 11 (Orchestrator)
