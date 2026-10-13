# ADR-0003: Embedded Storage Engine via SQLite with WAL and FTS5

## Status
Accepted

## Context
Ruas requires a fast, embedded, zero-network database to store:
- File metadata, timestamps, and content hashes.
- Extracted AST nodes with qualified names, signatures, and tokens.
- Directed graph edges with Bayesian Beta-Bernoulli confidence parameters ($\alpha, \beta$).
- Unresolved symbol references.
- Full-text search index with BM25 ranking.

## Alternatives
1. **In-memory JSON/BSON graph dumps:** Zero query optimization, high memory consumption (>1.5 GB at 20,000 files), cannot handle incremental partial updates efficiently.
2. **DuckDB:** Excellent OLAP, but heavier binary footprint (~60 MB), slower single-row inserts and point queries.
3. **SQLite with FTS5:** Native to standard OS environments, minimal memory footprint (<2 MB), WAL mode enabling concurrent reader processes while an indexing job writes.

## Decision
We adopt **SQLite in WAL mode with FTS5 virtual tables**, exposed behind an abstract `Storage` interface. The implementation leverages Node 22's native `node:sqlite` module with fallback capability.

## Consequences
- The database file resides in `.ruas/ruas.db` within the target repository and is git-ignored.
- WAL mode (`PRAGMA journal_mode = WAL`) and synchronous normal (`PRAGMA synchronous = NORMAL`) provide extreme write throughput and crash resilience.
- FTS5 enables sub-millisecond lexical scoring without external search daemons.
