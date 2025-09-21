# Implementation Task 02: CLI Subcommand

**Task ID:** 02  
**Priority:** High  
**Estimated Effort:** 3-4 hours  
**Dependencies:** Task 01 (Utilities)  
**Blocks:** Task 11 (Orchestrator)  

## Objective
Implement the `basic` subcommand registration and flag validation for the S4TK CLI merger tool.

## Scope
Create the CLI interface that registers the `basic` subcommand with all required flags and validates flag combinations before delegating to the orchestrator.

## Files to Create/Modify
- `src/cli-basic.ts` (new)
- `test/cli-basic.test.ts` (new)
- Update existing CLI registration if needed

## CLI Specification
```
s4merge basic \
  --in <dir> [--in <dir> ...] \
  [--files @list.txt]                  # one path per line; # comments ok
  --out <Merged.package> | --by-folder --out-root <dir> \
  [--sort name|path|mtime] [--reverse] # default: path
  [--max-size <MB>]                     # roll to .part2/.part3 at cap
  [--manifest-out <path>]               # default: <out>.manifest.yaml
  [--no-changelog]                      # skip run-level changelog
  [--stats-json <path>]                 # write basic counts/timings
  [--verify]                            # reopen output, sanity checks
  [--dry-run] [--progress]
```

## Acceptance Criteria

### Flag Registration
- [ ] Register `basic` subcommand with proper help text
- [ ] `--in <dir>` (repeatable) - Input directories to scan
- [ ] `--files <path>` - File list (one path per line, # comments allowed)
- [ ] `--out <path>` - Single output file (mutually exclusive with --by-folder)
- [ ] `--by-folder` + `--out-root <dir>` - Multiple outputs grouped by folder
- [ ] `--sort <name|path|mtime>` - Sort method (default: path)
- [ ] `--reverse` - Reverse sort order
- [ ] `--max-size <MB>` - Size cap for rollover (optional)
- [ ] `--manifest-out <path>` - Manifest output path (optional)
- [ ] `--no-changelog` - Skip changelog generation
- [ ] `--stats-json <path>` - Stats output path (optional)
- [ ] `--verify` - Enable post-merge verification
- [ ] `--dry-run` - Analysis only, no writes
- [ ] `--progress` - Show progress output

### Flag Validation
- [ ] Require either `--in` or `--files` (or both)
- [ ] Require either `--out` or (`--by-folder` + `--out-root`)
- [ ] Validate `--sort` values (name|path|mtime)
- [ ] Validate `--max-size` is positive integer
- [ ] Validate paths exist and are accessible
- [ ] Validate output directories are writable
- [ ] Clear error messages for invalid combinations

### Interface Design
- [ ] Export `BasicCliOptions` interface with all parsed options
- [ ] Export `validateBasicOptions(options: BasicCliOptions): void` function
- [ ] Export `registerBasicCommand(cli: CommanderProgram): void` function
- [ ] Keep CLI logic minimal - delegate business logic to orchestrator

### Tests
- [ ] Valid flag combinations parse correctly
- [ ] Invalid flag combinations throw descriptive errors
- [ ] Default values are applied correctly
- [ ] Help text is comprehensive and accurate
- [ ] Edge cases (empty strings, special characters in paths)

## Implementation Notes
- Use Commander.js or similar CLI parsing library
- Follow existing CLI patterns in the codebase
- Validate file/directory existence at CLI level
- Provide helpful error messages with examples
- Support both short and long flag forms where appropriate

## Definition of Done
- [ ] All flags registered with proper types and validation
- [ ] Comprehensive flag combination validation
- [ ] Clear error messages for invalid usage
- [ ] Help text matches specification exactly
- [ ] Test coverage for all validation scenarios
- [ ] `npm run check` passes
- [ ] Integration with main CLI works correctly

## Risk Mitigation
- **Complex flag validation**: Break into small, testable functions
- **Cross-platform path issues**: Use utilities from Task 01
- **CLI library changes**: Abstract behind interface if needed
- **User experience**: Provide examples in help text

## Related Task Cards
- References Core-Design-Document.md §2 (CLI specification)
- References Core-Design-Document.md §7.1 (CLI Subcommand task)
- References AGENTS.md §1 (CLI Subcommand ownership)
- Enables Task 11 (Orchestrator)
