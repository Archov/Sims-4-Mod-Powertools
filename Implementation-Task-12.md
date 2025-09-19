# Implementation Task 12: Progress & UX Module

**Task ID:** 12  
**Priority:** Medium (User Experience)  
**Estimated Effort:** 3-4 hours  
**Dependencies:** Task 01 (Utilities), Task 11 (Orchestrator)  
**Blocks:** None (Final task)  

## Objective
Implement progress reporting and user experience enhancements including `--progress` output, TTY-aware logging, and user-friendly feedback.

## Scope
Create a progress reporting system that provides real-time feedback during merge operations while respecting quiet mode and TTY detection.

## Files to Create/Modify
- `src/basic/progress.ts` (new) OR enhance `src/basic/main.ts`
- `test/progress.test.ts` (new)
- Update orchestrator integration

## Acceptance Criteria

### Core Functions
- [ ] `createProgressReporter(options: ProgressOptions): ProgressReporter` - Factory function
- [ ] `reportPhaseStart(phase: string, details?: string): void` - Phase transitions
- [ ] `reportFileProgress(current: number, total: number, fileName: string): void` - File-level progress
- [ ] `reportPhaseComplete(phase: string, duration: number, summary?: string): void` - Phase completion
- [ ] `reportFinalSummary(result: BasicMergeResult): void` - Operation summary

### Progress Display Modes
- [ ] **TTY Mode**: Interactive progress with overwriting lines
- [ ] **Non-TTY Mode**: Line-by-line progress suitable for logs
- [ ] **Quiet Mode**: Minimal output, errors only
- [ ] **Verbose Mode**: Detailed progress with timing information

### Progress Information
- [ ] **Phase Progress**: Scanning → Planning → Merging → Verification → Output
- [ ] **File Progress**: Current file being processed with count (X/Y)
- [ ] **Size Progress**: Data processed vs. total estimated
- [ ] **Time Estimates**: ETA based on current throughput
- [ ] **Final Summary**: Total files, resources, time, throughput

### TTY Detection and Adaptation
- [ ] Detect TTY vs. non-TTY environments
- [ ] Use appropriate output formatting for each
- [ ] Handle redirected output gracefully
- [ ] Support Windows console and Unix terminals
- [ ] Respect NO_COLOR environment variable

### Data Structures
```typescript
interface ProgressOptions {
  enabled: boolean;
  quiet: boolean;
  verbose: boolean;
  tty: boolean;
}

interface ProgressReporter {
  reportPhaseStart(phase: string, details?: string): void;
  reportFileProgress(current: number, total: number, fileName: string): void;
  reportPhaseComplete(phase: string, duration: number, summary?: string): void;
  reportFinalSummary(result: BasicMergeResult): void;
  reportError(error: string): void;
  reportWarning(warning: string): void;
}

interface PhaseInfo {
  name: string;
  startTime: number;
  details?: string;
}

interface ProgressState {
  currentPhase?: PhaseInfo;
  filesProcessed: number;
  totalFiles: number;
  bytesProcessed: number;
  totalBytes: number;
  startTime: number;
}
```

### Output Examples

**TTY Mode:**
```
Scanning inputs... ✓ (1.2s) - Found 157 packages (1.2 GB)
Planning outputs... ✓ (0.1s) - 3 outputs planned
Merging packages... [████████████████████████████████████████] 157/157 Hair.package (423 MB)
Verification... ✓ (0.5s) - All outputs verified
Generating manifests... ✓ (0.2s) - 3 manifests created

✓ Merge completed successfully
  157 inputs → 3 outputs (1.25 GB)
  45,231 resources merged in 12.3s (101 MB/s)
```

**Non-TTY Mode:**
```
[INFO] Scanning inputs...
[INFO] Found 157 packages (1.2 GB) in 1.2s
[INFO] Planning outputs...
[INFO] 3 outputs planned in 0.1s
[INFO] Merging packages...
[INFO] Processing Hair/Anto_Hair-01.package (1/157)
[INFO] Processing Hair/Anto_Hair-02.package (2/157)
...
[INFO] Merge completed: 157 inputs → 3 outputs (1.25 GB)
[INFO] 45,231 resources merged in 12.3s (101 MB/s)
```

### Integration with Orchestrator
- [ ] Integrate progress reporting into main workflow
- [ ] Report progress at appropriate granularity
- [ ] Handle progress reporting errors gracefully
- [ ] Ensure progress doesn't significantly impact performance
- [ ] Support disabling progress for automated usage

### Error and Warning Display
- [ ] Display errors prominently with context
- [ ] Show warnings without interrupting progress
- [ ] Provide actionable error messages
- [ ] Include file paths and line numbers where relevant
- [ ] Support error aggregation for batch operations

### Tests
- [ ] TTY vs. non-TTY output formatting
- [ ] Progress calculation accuracy
- [ ] Performance impact measurement
- [ ] Error and warning display
- [ ] Cross-platform console compatibility
- [ ] Large operation progress reporting
- [ ] Quiet mode behavior
- [ ] Progress reporter factory function

## Implementation Notes
- Use Node.js `process.stdout.isTTY` for TTY detection
- Implement efficient progress updates that don't impact performance
- Use ANSI escape codes for TTY progress formatting
- Handle console width detection for proper formatting
- Ensure progress output is thread-safe if needed
- Consider using established progress bar libraries

## Definition of Done
- [ ] All progress reporting modes implemented
- [ ] TTY detection and adaptation working correctly
- [ ] Performance impact is minimal (<1% overhead)
- [ ] Cross-platform console compatibility verified
- [ ] Integration with orchestrator completed
- [ ] Test coverage for all output modes
- [ ] `npm run check` passes
- [ ] Documentation for progress configuration

## Risk Mitigation
- **Performance impact**: Efficient progress updates with minimal overhead
- **Console compatibility**: Test on various terminal types and platforms
- **Output formatting**: Handle edge cases like very long filenames
- **TTY detection**: Robust detection across different environments
- **Error handling**: Graceful degradation when progress reporting fails

## Related Task Cards
- References Core-Design-Document.md §7.7 (Progress & UX task)
- References AGENTS.md §1 (Progress ownership)
- Uses utilities from Task 01
- Integrates with Task 11 (Orchestrator)
- Final task in the implementation sequence
