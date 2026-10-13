# ADR-0001: Monorepo Workspace Structure and Module Boundaries

## Status
Accepted

## Context
Ruas requires a modular architecture where the core domain models, parsers, SQLite storage engine, graph rankers, indexer, and CLI are decoupled. Dependencies must flow strictly inward to prevent cyclic imports and ensure pure modules (`core`, `nlp`) can be tested without filesystem or database I/O.

## Alternatives
1. **Single polyrepo:** High overhead in managing multiple git repositories, publishing private packages, and synchronizing breaking changes.
2. **Turborepo + npm:** Added layer of configuration with potential phantom dependency issues under npm hoisting.
3. **pnpm Workspaces with native TypeScript Project References:** Strict node_modules isolation, symlink-based workspaces, zero phantom dependencies, and instant builds.

## Decision
We adopt **pnpm workspaces** with a flat `packages/*` layout:
- `packages/core`: Pure domain types, `Result<T, E>`, deterministic IDs, and Zod schemas.
- `packages/store`: SQLite schema, migrations, FTS5 virtual table, and storage abstraction.
- `packages/parser`: `web-tree-sitter` runtime and language-specific AST visitor extractors.
- `packages/indexer`: File traversal, `.gitignore` parsing, Merkle dirty-set tracking, and cold indexing orchestration.
- `packages/cli`: Human-friendly terminal CLI and JSON output.

## Consequences
Developers and CI environments must run via `pnpm`. Strict TypeScript flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) are enforced at the root level across all packages.
