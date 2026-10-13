/**
 * SQLite Schema definitions and versioned migrations for Ruas.
 */

export const SCHEMA_V1 = `
-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

-- File metadata and Merkle hashes
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  lang TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  indexed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);

-- AST nodes
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  qualified_name TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  signature TEXT,
  doc_comment TEXT,
  tokens TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nodes_file_id ON nodes(file_id);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
CREATE INDEX IF NOT EXISTS idx_nodes_qualified_name ON nodes(qualified_name);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);

-- Directed graph edges with Beta-Bernoulli confidence
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  src_id TEXT NOT NULL,
  dst_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  alpha REAL NOT NULL,
  beta REAL NOT NULL,
  evidence_json TEXT,
  FOREIGN KEY (src_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (dst_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src_id);
CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst_id);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);

-- Unresolved references awaiting link phase
CREATE TABLE IF NOT EXISTS unresolved_refs (
  id TEXT PRIMARY KEY,
  src_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  file_id TEXT NOT NULL,
  line INTEGER NOT NULL,
  FOREIGN KEY (src_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_unresolved_name ON unresolved_refs(name);
CREATE INDEX IF NOT EXISTS idx_unresolved_file ON unresolved_refs(file_id);

-- Glossary terms for multilingual domain expansion
CREATE TABLE IF NOT EXISTS glossary_terms (
  term TEXT NOT NULL,
  lang TEXT NOT NULL,
  concept TEXT NOT NULL,
  weight REAL NOT NULL,
  PRIMARY KEY (term, lang, concept)
);

-- Metadata store (e.g. indexer version, timestamp)
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- FTS5 full-text search table
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  id UNINDEXED,
  name,
  qualified_name,
  signature,
  doc_comment,
  tokens
);
`;

export function applyMigrations(db: {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...args: unknown[]): unknown;
    run(...args: unknown[]): unknown;
  };
}): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);");
  const row = db.prepare("SELECT MAX(version) as current_version FROM schema_migrations;").get() as
    | { current_version: number | null }
    | undefined;
  const currentVersion = row?.current_version ?? 0;

  if (currentVersion < 1) {
    db.exec(SCHEMA_V1);
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);").run(
      1,
      Date.now(),
    );
  }
}
