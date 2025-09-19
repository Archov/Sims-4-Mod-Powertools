# S4TK CLI Package Merger Skeleton

This is a skeleton repo only. No merging or S4TK integration yet.

## Quick Start
1. Install dependencies: `npm install`
2. Run the full check suite: `npm run check`
3. Print CLI help: `node dist/cli.mjs --help`

## Project Structure
- `src/` – TypeScript sources for the CLI entry point and future modules.
- `test/` – Vitest suites validating the CLI surface and utility helpers.
- `.github/workflows/` – CI configuration targeting Node.js 20 across major OSes.

## Roadmap
- Implement deterministic scanning of Sims package files.
- Add manifest parsing and validation.
- Build planning, reporting, and writer stages as task cards unlock.