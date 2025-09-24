# Implementation Task 05.5: Merge Metadata Tracking

**Goal:** Implement merge metadata tracking to enable package unmerging capability.

**Priority:** High - Required for package maintenance and updates

**Estimated Effort:** 4-6 hours

## Background

During testing, we discovered that S4TK's default merge creates "pure" packages without metadata, making unmerging impossible. This is problematic for package maintenance where users need to update individual components within merged packages.

## Requirements

### 1. Merge Metadata Structure
- Track which resources came from which original package
- Store original package file paths and timestamps
- Maintain package boundary information
- Include merge operation metadata (timestamp, tool version)

### 2. Metadata Storage
- **Custom metadata resource in Group 0** with a dedicated Type ID (e.g., METADATA_TYPE = 0x4D455447 /* "METG" */) to avoid collisions
- Encoding: UTF-8 JSON (canonicalized) or CBOR; document choice. If compressed, specify algorithm (zlib/deflate) and indicate via resource flags/metadata
- Endianness and numeric widths must be documented if using a binary format
- All merged packages will include metadata for unmerge capability

### 3. Unmerge Implementation
- Parse merge metadata to identify package boundaries
- Reconstruct original packages from merged resources
- Validate unmerge integrity
- Handle edge cases (corrupted metadata, missing originals)

## Implementation Plan

### Phase 1: Metadata Design (1-2 hours)
1. Design merge metadata schema
2. Define metadata resource type and format (Group 0 resource)
3. Create TypeScript interfaces for metadata

### Phase 2: Merge Enhancement (2-3 hours)
1. Extend `mergePackages()` to track package boundaries
2. Add metadata resource creation during merge (always enabled)
3. Update package statistics to include metadata info
4. Add merge operation logging

### Phase 3: Unmerge Implementation (2-3 hours)
1. Implement `unmergePackage()` function
2. Add metadata parsing and validation
3. Create package reconstruction logic
4. Add unmerge verification and error handling

### Phase 4: Testing (1 hour)
1. Test merge with metadata tracking
2. Test unmerge functionality
3. Test metadata corruption handling
4. Verify compatibility with existing packages

## Technical Specifications

### Metadata Resource Format
```typescript
interface MergeMetadata {
  version: string;           // Metadata format version ("1.0")
  // mergeTimestamp is recorded in manifest only to preserve byte-level determinism of outputs
  toolVersion: string;       // This tool's version
  s4tkVersion: string;       // @s4tk/models version used for merge
  originalPackages: Array<{
    basename: string;        // Original file name only
    relPath?: string;        // Optional path relative to declared input root
    pathHash: string;        // sha256(lowercase-hex) of absolute path (not persisted elsewhere)
    inputRootHash?: string;  // sha256(lowercase-hex) of declared inputRoot to interpret relPath
    size: number;            // Original package size
    mtime: number;           // Original package modification time (Unix ms)
    resourceCount: number;   // Number of resources from this package (pre-dedup)
    keptCount?: number;      // Resources kept after dedup/collision handling
    overwrittenCount?: number; // Resources overwritten due to key collisions
    resourceRanges: Array<{  // Resource index ranges in merged package (optional optimization)
      startIndex: number;
      endIndex: number;
    }>;
    entries: Array<{         // Stable keys for precise reconstruction
      type: string;          // lowercase hex with 0x prefix, 8 digits, e.g. "0x1234abcd"
      group: string;         // lowercase hex with 0x prefix, 8 digits
      instance: string;      // lowercase hex with 0x prefix, 16 digits
      dataHash?: string;     // sha256(lowercase-hex) of resource payload (detect corruption)
    }>;
  }>;
  mergeOptions: {
    deduplication: boolean;
    compression: boolean;    // whether merged package payloads were compressed
    collisionPolicy?: 'keep-last' | 'keep-first' | 'shadow-original';
    [key: string]: any;
  };
}
```

### New Functions
- `mergePackages(filePaths: string[], options?: MergeOptions): Promise<{package: S4Package, metadata: MergeMetadata}>`
- `unmergePackage(mergedPackage: S4Package): Promise<Array<{package: S4Package, originalPath: string}>>`
- `hasMergeMetadata(pkg: S4Package): boolean`
- `getMergeMetadata(pkg: S4Package): MergeMetadata | null`

## Acceptance Criteria

- [ ] All merged packages include metadata resource for unmerging
- [ ] `unmergePackage()` successfully reconstructs original packages
- [ ] Unmerged packages are functionally equivalent to originals (same TGIs and identical resource data bytes). Byte-for-byte identity is best-effort only when no key collisions occurred and serialization was stable.
- [ ] Collision policy is enforced and documented (keep-last | keep-first | shadow-original), with metrics persisted in metadata (kept/overwritten counts)
- [ ] Canonicalization rules (hex casing/widths, hashing algorithm) are validated in tests
- [ ] Metadata corruption is handled gracefully
- [ ] Existing merge functionality enhanced with metadata tracking
- [ ] All tests pass with new metadata system
- [ ] Documentation updated with unmerge capabilities

## Dependencies

- Task 05 (S4TK Adapter) - Must be complete
- Core Design Document updates
- New test cases for unmerge functionality

## Risks

- **Metadata corruption**: Could break unmerge capability
- **Performance impact**: Metadata tracking adds overhead
- **File size increase**: Metadata resource adds ~1-2KB per merged package
- **Compatibility**: Existing merged packages won't have metadata

## Mitigation

- Add metadata validation and corruption detection
- Provide migration path for existing merged packages
- Implement fallback unmerge strategies

## Success Metrics

- 100% unmerge success rate for packages with metadata
- <5% performance overhead for merge operations
- <2KB metadata overhead per merged package
- Full backward compatibility with existing functionality

## Notes

This task enables the critical "update packages within merged packages" workflow that users expect from professional package management tools. The metadata approach should be compatible with S4S expectations while providing superior unmerge capabilities.
