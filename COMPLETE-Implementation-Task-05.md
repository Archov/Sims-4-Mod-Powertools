# Implementation Task 05: S4TK Adapter

**Task ID:** 05  
**Priority:** High  
**Estimated Effort:** 3-4 hours  
**Dependencies:** Task 01 (Utilities)  
**Blocks:** Task 06 (Merger)  

## Objective
Implement a clean adapter interface for S4TK package operations, isolating the merger from direct S4TK dependencies and providing a testable abstraction.

## Scope
Create an adapter module that wraps S4TK package operations with a simplified interface focused on the append-all merge requirements.

## Files to Create/Modify
- `src/core/s4tk.ts` (new)
- `test/s4tk.test.ts` (new)
- Add S4TK dependency to package.json if not present

## Acceptance Criteria

### Core Interface
- [ ] `createEmptyPackage(): S4Package` - Create new empty package
- [ ] `loadPackage(filePath: string): Promise<S4Package>` - Load existing package
- [ ] `appendAllResources(target: S4Package, source: S4Package): void` - Append all resources
- [ ] `getResourceCount(pkg: S4Package): number` - Get total resource count
- [ ] `getResourceTypes(pkg: S4Package): Set<string>` - Get unique resource type IDs
- [ ] `serializePackage(pkg: S4Package): Promise<Buffer>` - Serialize to buffer
- [ ] `estimateSerializedSize(pkg: S4Package): number` - Estimate final size

### Package Abstraction
```typescript
interface S4Package {
  // Opaque wrapper around S4TK Package
  readonly _internal: any; // S4TK Package instance
  readonly resourceCount: number;
  readonly estimatedSize: number;
}

interface ResourceTypeInfo {
  typeId: string;
  count: number;
}

interface PackageStats {
  resourceCount: number;
  uniqueTypes: ResourceTypeInfo[];
  estimatedSize: number;
}
```

### Error Handling
- [ ] Wrap S4TK errors with descriptive messages
- [ ] Handle corrupted package files gracefully
- [ ] Provide specific error types for different failure modes
- [ ] Include file path context in error messages

### Performance Considerations
- [ ] Lazy loading of package contents where possible
- [ ] Efficient resource counting without full enumeration
- [ ] Memory-conscious handling of large packages
- [ ] Size estimation without full serialization

### Tests
- [ ] Package creation and basic operations
- [ ] Resource appending maintains order
- [ ] Error handling for corrupted files
- [ ] Memory usage tests with large packages
- [ ] Size estimation accuracy
- [ ] Resource type enumeration
- [ ] Cross-platform file handling

## Implementation Notes
- Keep S4TK dependency isolated to this module only
- Provide synchronous operations where S4TK supports them
- Use proper error wrapping to hide S4TK internals
- Consider implementing resource streaming for very large packages
- Document any S4TK version requirements or limitations

## Definition of Done
- [ ] All core functions implemented with proper TypeScript types
- [ ] S4TK dependency properly isolated
- [ ] Comprehensive error handling and wrapping
- [ ] Performance acceptable for large packages
- [ ] Test coverage including error scenarios
- [ ] `npm run check` passes
- [ ] Documentation for all public interfaces

## Risk Mitigation
- **S4TK API changes**: Abstract behind stable interface
- **Memory usage**: Monitor and optimize for large packages
- **Corrupted files**: Robust error handling and recovery
- **Performance**: Profile and optimize critical paths
- **Version compatibility**: Document and test S4TK version requirements

## Related Task Cards
- References Core-Design-Document.md §4 (High-Level Flow, step 5)
- References Core-Design-Document.md §7.4 (Merger + Verify task)
- References AGENTS.md §1 (Merger ownership)
- Uses utilities from Task 01
- Enables Task 06 (Merger) and Task 07 (Verify)
