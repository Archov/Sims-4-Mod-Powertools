# Implementation Task 03: Scanner Module

**Task ID:** 03  
**Priority:** High  
**Estimated Effort:** 5-7 hours  
**Dependencies:** Task 01 (Utilities)  
**Blocks:** Task 11 (Orchestrator)  

## Objective
Implement the scanner module that expands file lists, enumerates directories recursively, and provides deterministic sorting of input packages.

## Scope
Create a scanner that can process `--files` lists and `--in` directories to produce a stable, sorted list of `.package` files for processing.

## Files to Create/Modify
- `src/basic/scanner.ts` (new)
- `test/scanner.test.ts` (new)
- `test/fixtures/scanner/` (test data directory)

## Acceptance Criteria

### Core Functions
- [ ] `expandFilesList(filePath: string): Promise<string[]>` - Parse @list.txt files
- [ ] `enumerateDirectory(dirPath: string): Promise<string[]>` - Recursive .package discovery
- [ ] `scanInputs(options: ScanOptions): Promise<ScanResult>` - Main entry point
- [ ] `deduplicatePaths(paths: string[]): string[]` - Remove duplicate paths
- [ ] `sortPackages(packages: PackageInfo[], sortBy: SortMethod, reverse: boolean): PackageInfo[]`

### File List Processing
- [ ] Parse one path per line from `--files` input
- [ ] Support `# comment` lines (ignore)
- [ ] Support empty lines (ignore)
- [ ] Handle both absolute and relative paths
- [ ] Resolve relative paths against file list location
- [ ] Validate all paths exist and are readable

### Directory Enumeration
- [ ] Recursive scan for `*.package` files
- [ ] Ignore hidden files/directories (starting with `.`)
- [ ] Ignore temporary files (`*.tmp`, `*.temp`, `*~`)
- [ ] Handle Windows long paths (>260 characters)
- [ ] Handle symlinks appropriately (follow or ignore)
- [ ] Collect file metadata (size, mtime) during scan

### Sorting Implementation
- [ ] Support `name` sort (filename only, case-insensitive)
- [ ] Support `path` sort (full path, normalized)
- [ ] Support `mtime` sort (modification time, newest first by default)
- [ ] Use stable sort to maintain order for identical keys
- [ ] Support `--reverse` flag for all sort methods
- [ ] Handle edge cases (identical mtimes, missing files)

### Data Structures
```typescript
interface ScanOptions {
  inDirs: string[];
  filesList?: string;
  sortBy: 'name' | 'path' | 'mtime';
  reverse: boolean;
}

interface PackageInfo {
  path: string;
  normalizedPath: string;
  name: string;
  size: number;
  mtime: Date;
}

interface ScanResult {
  packages: PackageInfo[];
  totalSize: number;
  totalCount: number;
  skippedFiles: string[];
  errors: string[];
}
```

### Tests
- [ ] File list parsing with comments and empty lines
- [ ] Directory enumeration with nested structures
- [ ] Mixed case filename sorting determinism
- [ ] Unicode/diacritics in filenames
- [ ] Windows long path handling
- [ ] Symlink handling (if supported)
- [ ] Error handling (missing files, permission issues)
- [ ] Sort stability verification
- [ ] Deduplication of identical paths

## Implementation Notes
- Use `fs.promises` for async file operations
- Leverage utilities from Task 01 for path normalization and stable sorting
- Handle file system errors gracefully with descriptive messages
- Use `path.resolve()` for relative path resolution
- Consider memory usage for large directory trees
- Implement proper error collection without stopping entire scan

## Definition of Done
- [ ] All core functions implemented with proper TypeScript types
- [ ] Comprehensive test coverage including edge cases
- [ ] Cross-platform compatibility verified
- [ ] Performance acceptable for large directory trees (>10k files)
- [ ] Error handling provides actionable feedback
- [ ] `npm run check` passes
- [ ] Documentation for all public interfaces

## Risk Mitigation
- **Large directory trees**: Stream processing if memory becomes an issue
- **File system permissions**: Graceful error handling and reporting
- **Unicode filenames**: Use Node.js built-in Unicode support
- **Platform differences**: Extensive cross-platform testing
- **Symlink loops**: Implement cycle detection if symlinks are supported

## Related Task Cards
- References Core-Design-Document.md §4 (High-Level Flow, step 1-2)
- References Core-Design-Document.md §7.2 (Scanner task)
- References AGENTS.md §1 (Scanner ownership)
- Uses utilities from Task 01
- Enables Task 11 (Orchestrator)
