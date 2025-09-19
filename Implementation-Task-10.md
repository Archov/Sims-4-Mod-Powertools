# Implementation Task 10: Stats Module

**Task ID:** 10  
**Priority:** Medium (Optional Feature)  
**Estimated Effort:** 2-3 hours  
**Dependencies:** Task 01 (Utilities)  
**Blocks:** Task 11 (Orchestrator)  

## Objective
Implement the optional stats module that generates JSON output with detailed performance metrics and operation statistics.

## Scope
Create a statistics collection and reporting system that provides detailed metrics about merge operations for performance analysis and debugging.

## Files to Create/Modify
- `src/basic/stats.ts` (new)
- `test/stats.test.ts` (new)
- `test/fixtures/stats/` (test data directory)

## Acceptance Criteria

### Core Functions
- [ ] `collectStats(plan: MergePlan, results: MergeResult[], timing: TimingInfo): Promise<StatsReport>` - Main entry point
- [ ] `writeStatsJson(stats: StatsReport, outputPath: string): Promise<void>` - Write JSON file
- [ ] `calculateThroughput(totalSize: number, duration: number): ThroughputMetrics` - Performance metrics
- [ ] `aggregateResourceTypes(results: MergeResult[]): ResourceTypeStats` - Type analysis
- [ ] `formatStatsJson(stats: StatsReport): string` - JSON serialization

### Stats Schema Design
```json
{
  "schema": 1,
  "tool": "s4merge",
  "operation": "basic",
  "created_utc": "2025-09-19T21:20:00Z",
  "timing": {
    "total_seconds": 12.345,
    "scan_seconds": 1.234,
    "plan_seconds": 0.123,
    "merge_seconds": 10.456,
    "verify_seconds": 0.532
  },
  "throughput": {
    "mb_per_second": 101.2,
    "files_per_second": 12.7,
    "resources_per_second": 3654.2
  },
  "inputs": {
    "total_files": 157,
    "total_size_mb": 1247.5,
    "total_resources": 45231,
    "unique_types": 42,
    "largest_file_mb": 89.3,
    "smallest_file_mb": 0.1
  },
  "outputs": {
    "total_files": 3,
    "total_size_mb": 1253.1,
    "total_parts": 4,
    "largest_output_mb": 687.2,
    "compression_ratio": 1.004
  },
  "resource_types": {
    "0x034AEECB": { "name": "CASP", "count": 15420 },
    "0x0354796A": { "name": "GEOM", "count": 8901 },
    "0x00B2D882": { "name": "IMG", "count": 12456 }
  },
  "performance": {
    "peak_memory_mb": 234.5,
    "temp_files_created": 3,
    "temp_space_used_mb": 45.2
  }
}
```

### Data Structures
```typescript
interface StatsReport {
  schema: number;
  tool: string;
  operation: string;
  created_utc: string;
  timing: TimingInfo;
  throughput: ThroughputMetrics;
  inputs: InputStats;
  outputs: OutputStats;
  resource_types: Record<string, ResourceTypeInfo>;
  performance: PerformanceStats;
}

interface TimingInfo {
  total_seconds: number;
  scan_seconds: number;
  plan_seconds: number;
  merge_seconds: number;
  verify_seconds?: number;
}

interface ThroughputMetrics {
  mb_per_second: number;
  files_per_second: number;
  resources_per_second: number;
}

interface InputStats {
  total_files: number;
  total_size_mb: number;
  total_resources: number;
  unique_types: number;
  largest_file_mb: number;
  smallest_file_mb: number;
}

interface OutputStats {
  total_files: number;
  total_size_mb: number;
  total_parts: number;
  largest_output_mb: number;
  compression_ratio: number;
}

interface ResourceTypeInfo {
  name?: string;        // Human-readable name if known
  count: number;
}

interface PerformanceStats {
  peak_memory_mb: number;
  temp_files_created: number;
  temp_space_used_mb: number;
}
```

### Timing Collection
- [ ] Measure each phase of the merge operation
- [ ] Provide high-precision timing (millisecond accuracy)
- [ ] Handle nested timing for complex operations
- [ ] Support optional phases (verification, etc.)
- [ ] Calculate accurate total duration

### Throughput Calculation
- [ ] Calculate MB/second based on total data processed
- [ ] Calculate files/second processing rate
- [ ] Calculate resources/second merge rate
- [ ] Handle edge cases (zero duration, very fast operations)
- [ ] Provide meaningful metrics for performance analysis

### Resource Type Analysis
- [ ] Aggregate resource types across all inputs and outputs
- [ ] Include both type ID and human-readable name where known
- [ ] Count total resources per type
- [ ] Identify most common resource types
- [ ] Support extensible type name mapping

### Performance Monitoring
- [ ] Track peak memory usage during operation
- [ ] Count temporary files created
- [ ] Measure temporary disk space usage
- [ ] Monitor system resource utilization
- [ ] Provide actionable performance insights

### JSON Generation
- [ ] Use standard JSON library for serialization
- [ ] Ensure deterministic field ordering
- [ ] Format numbers with appropriate precision
- [ ] Handle large numbers correctly
- [ ] Generate clean, readable JSON structure

### Tests
- [ ] Basic stats collection and generation
- [ ] Timing accuracy and precision
- [ ] Throughput calculation correctness
- [ ] Resource type aggregation
- [ ] JSON serialization and formatting
- [ ] Large operation statistics
- [ ] Error handling for stats collection failures
- [ ] Performance impact measurement

## Implementation Notes
- Keep stats collection lightweight to minimize performance impact
- Use high-resolution timers for accurate measurements
- Consider memory usage monitoring techniques
- Provide meaningful metrics for performance tuning
- Handle cases where stats collection fails gracefully
- Use utilities from Task 01 for consistent formatting

## Definition of Done
- [ ] All core functions implemented with proper TypeScript types
- [ ] JSON output is well-formatted and useful
- [ ] Timing measurements are accurate and precise
- [ ] Performance impact of stats collection is minimal
- [ ] Resource type analysis is comprehensive
- [ ] Test coverage including edge cases
- [ ] `npm run check` passes
- [ ] Documentation for all public interfaces

## Risk Mitigation
- **Performance impact**: Lightweight collection with minimal overhead
- **Memory monitoring**: Use efficient techniques that don't affect operation
- **Timing accuracy**: Use high-resolution timers and handle edge cases
- **Large numbers**: Proper JSON serialization for large values
- **Collection failures**: Graceful degradation when stats can't be collected

## Related Task Cards
- References Core-Design-Document.md §3 (Output Artifacts)
- References Core-Design-Document.md §7.6 (Stats task)
- References AGENTS.md §1 (Stats ownership)
- Uses utilities from Task 01
- Enables Task 11 (Orchestrator)
