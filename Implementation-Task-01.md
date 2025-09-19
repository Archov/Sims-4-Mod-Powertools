# Implementation Task 01: Utilities Foundation

**Task ID:** 01  
**Priority:** High (Foundation)  
**Estimated Effort:** 4-6 hours  
**Dependencies:** None  
**Blocks:** All other tasks  

## Objective
Implement foundational utility modules for deterministic operations and crash-safe file system operations.

## Scope
Create two utility modules that provide the foundation for all other components:
1. `src/util/determinism.ts` - Stable comparison and path normalization
2. `src/util/fsx.ts` - Safe file system operations with atomic writes

## Files to Create/Modify
- `src/util/determinism.ts` (new)
- `src/util/fsx.ts` (new)
- `test/determinism.test.ts` (new)
- `test/fsx.test.ts` (new)

## Acceptance Criteria

### determinism.ts
- [ ] `stableCompare(a: string, b: string): number` - Deterministic string comparison
- [ ] `stablePathCompare(a: string, b: string): number` - Path-aware comparison
- [ ] `normalizePath(path: string): string` - Cross-platform path normalization
- [ ] `stableSortBy<T>(items: T[], keyFn: (item: T) => string): T[]` - Stable sorting utility
- [ ] Handle mixed case, diacritics, and Unicode normalization
- [ ] Windows/macOS/Linux path separator normalization

### fsx.ts
- [ ] `writeFileAtomic(targetPath: string, content: Buffer | string): Promise<void>` - Crash-safe writes
- [ ] `createTempFile(baseName: string): Promise<string>` - Generate temp file paths
- [ ] `fsyncFile(filePath: string): Promise<void>` - Force file sync to disk
- [ ] `fsyncDir(dirPath: string): Promise<void>` - Force directory sync
- [ ] Implement temp write → fsync → atomic rename pattern
- [ ] Handle Windows file locking and long path issues

### Tests
- [ ] Determinism tests with mixed case/diacritics (e.g., "Café" vs "café")
- [ ] Path normalization across platforms (Windows `\` vs Unix `/`)
- [ ] Atomic write interruption simulation (temp files remain)
- [ ] File system error handling (permissions, disk full)
- [ ] Stable sort order verification with identical keys

## Implementation Notes
- Use Node.js `fs.promises` for async operations
- Implement proper error handling with descriptive messages
- Follow TypeScript strict mode - no `any` types
- Use `crypto.randomBytes()` for temp file naming
- Ensure all operations are cross-platform compatible

## Definition of Done
- [ ] All functions implemented with proper TypeScript types
- [ ] Comprehensive test coverage (>90%)
- [ ] Tests pass on Windows, macOS, Linux
- [ ] `npm run check` passes (lint, build, test)
- [ ] No external dependencies beyond Node.js built-ins
- [ ] Documentation comments for all public functions

## Risk Mitigation
- **Platform differences**: Test extensively on all target platforms
- **File system race conditions**: Use proper locking and atomic operations
- **Unicode handling**: Use Node.js built-in normalization APIs
- **Long paths on Windows**: Use proper path handling utilities

## Related Task Cards
- References Core-Design-Document.md §5 (Module Layout)
- References AGENTS.md §1 (Utilities ownership)
- Enables all subsequent implementation tasks
