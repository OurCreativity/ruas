import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type {
  EdgeRecord,
  FileRecord,
  NodeRecord,
  SupportedLanguage,
  UnresolvedRefRecord,
  VibeMemoryRecord,
} from "@ruas/core";
import { applyMigrations } from "./migrations.js";
import type { FtsSearchResult, Storage, StorageStats } from "./types.js";

export interface SqliteStorageOptions {
  readonly dbPath: string; // ':memory:' or file path
}

export class SqliteStorage implements Storage {
  private db: DatabaseSync | null = null;
  private readonly dbPath: string;

  constructor(options: SqliteStorageOptions) {
    this.dbPath = options.dbPath;
  }

  public async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.dbPath !== ":memory:") {
      mkdirSync(dirname(this.dbPath), { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);

    if (this.dbPath !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA synchronous = NORMAL;");
    }
    this.db.exec("PRAGMA foreign_keys = ON;");

    applyMigrations(this.db);
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private getDatabase(): DatabaseSync {
    if (!this.db) {
      throw new Error("Database is not initialized. Call init() first.");
    }
    return this.db;
  }

  // --- Files ---

  public async upsertFile(file: FileRecord): Promise<void> {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO files (id, path, lang, content_hash, size, mtime, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        path = excluded.path,
        lang = excluded.lang,
        content_hash = excluded.content_hash,
        size = excluded.size,
        mtime = excluded.mtime,
        indexed_at = excluded.indexed_at;
    `);
    stmt.run(
      file.id,
      file.path,
      file.lang,
      file.contentHash,
      file.size,
      file.mtime,
      file.indexedAt,
    );
  }

  public async getFile(path: string): Promise<FileRecord | null> {
    const db = this.getDatabase();
    const row = db
      .prepare(
        "SELECT id, path, lang, content_hash, size, mtime, indexed_at FROM files WHERE path = ?;",
      )
      .get(path) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row["id"]),
      path: String(row["path"]),
      lang: String(row["lang"]) as SupportedLanguage,
      contentHash: String(row["content_hash"]),
      size: Number(row["size"]),
      mtime: Number(row["mtime"]),
      indexedAt: Number(row["indexed_at"]),
    };
  }

  public async getAllFiles(): Promise<readonly FileRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, path, lang, content_hash, size, mtime, indexed_at FROM files;",
      )
      .all() as readonly Record<string, unknown>[];

    return rows.map((row) => ({
      id: String(row["id"]),
      path: String(row["path"]),
      lang: String(row["lang"]) as SupportedLanguage,
      contentHash: String(row["content_hash"]),
      size: Number(row["size"]),
      mtime: Number(row["mtime"]),
      indexedAt: Number(row["indexed_at"]),
    }));
  }

  public async deleteFile(path: string): Promise<void> {
    const db = this.getDatabase();
    const file = await this.getFile(path);
    if (!file) {
      return;
    }
    await this.deleteNodesByFileId(file.id);
    await this.deleteEdgesByFileId(file.id);
    await this.deleteUnresolvedRefsByFileId(file.id);
    db.prepare("DELETE FROM files WHERE id = ?;").run(file.id);
  }

  // --- Nodes ---

  public async upsertNodes(nodes: readonly NodeRecord[]): Promise<void> {
    if (nodes.length === 0) {
      return;
    }
    const db = this.getDatabase();

    const insertNode = db.prepare(`
      INSERT INTO nodes (id, file_id, kind, name, qualified_name, start_line, end_line, signature, doc_comment, tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        file_id = excluded.file_id,
        kind = excluded.kind,
        name = excluded.name,
        qualified_name = excluded.qualified_name,
        start_line = excluded.start_line,
        end_line = excluded.end_line,
        signature = excluded.signature,
        doc_comment = excluded.doc_comment,
        tokens = excluded.tokens;
    `);

    const insertFts = db.prepare(`
      INSERT INTO nodes_fts (id, name, qualified_name, signature, doc_comment, tokens)
      VALUES (?, ?, ?, ?, ?, ?);
    `);

    for (const node of nodes) {
      insertNode.run(
        node.id,
        node.fileId,
        node.kind,
        node.name,
        node.qualifiedName,
        node.startLine,
        node.endLine,
        node.signature,
        node.docComment,
        node.tokens,
      );
      insertFts.run(
        node.id,
        node.name,
        node.qualifiedName,
        node.signature ?? "",
        node.docComment ?? "",
        node.tokens,
      );
    }
  }

  public async deleteNodesByFileId(fileId: string): Promise<void> {
    const db = this.getDatabase();
    db.prepare("DELETE FROM nodes_fts WHERE id IN (SELECT id FROM nodes WHERE file_id = ?);").run(fileId);
    db.prepare("DELETE FROM nodes WHERE file_id = ?;").run(fileId);
  }

  public async getNodesByFileId(fileId: string): Promise<readonly NodeRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, file_id, kind, name, qualified_name, start_line, end_line, signature, doc_comment, tokens FROM nodes WHERE file_id = ?;",
      )
      .all(fileId) as readonly Record<string, unknown>[];

    return rows.map((row) => this.mapNodeRecord(row));
  }

  public async getNodeById(id: string): Promise<NodeRecord | null> {
    const db = this.getDatabase();
    const row = db
      .prepare(
        "SELECT id, file_id, kind, name, qualified_name, start_line, end_line, signature, doc_comment, tokens FROM nodes WHERE id = ?;",
      )
      .get(id) as Record<string, unknown> | undefined;

    return row ? this.mapNodeRecord(row) : null;
  }

  public async findNodesByName(name: string): Promise<readonly NodeRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, file_id, kind, name, qualified_name, start_line, end_line, signature, doc_comment, tokens FROM nodes WHERE name = ? OR qualified_name = ?;",
      )
      .all(name, name) as readonly Record<string, unknown>[];

    return rows.map((row) => this.mapNodeRecord(row));
  }

  public async getAllNodes(): Promise<readonly NodeRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, file_id, kind, name, qualified_name, start_line, end_line, signature, doc_comment, tokens FROM nodes;",
      )
      .all() as readonly Record<string, unknown>[];

    return rows.map((row) => this.mapNodeRecord(row));
  }

  // --- Edges ---

  public async upsertEdges(edges: readonly EdgeRecord[]): Promise<void> {
    if (edges.length === 0) {
      return;
    }
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO edges (id, src_id, dst_id, kind, alpha, beta, evidence_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        src_id = excluded.src_id,
        dst_id = excluded.dst_id,
        kind = excluded.kind,
        alpha = excluded.alpha,
        beta = excluded.beta,
        evidence_json = excluded.evidence_json;
    `);

    for (const edge of edges) {
      stmt.run(
        edge.id,
        edge.srcId,
        edge.dstId,
        edge.kind,
        edge.alpha,
        edge.beta,
        edge.evidenceJson,
      );
    }
  }

  public async deleteEdgesByFileId(fileId: string): Promise<void> {
    const db = this.getDatabase();
    db.prepare(`
      DELETE FROM edges 
      WHERE src_id IN (SELECT id FROM nodes WHERE file_id = ?)
         OR dst_id IN (SELECT id FROM nodes WHERE file_id = ?);
    `).run(fileId, fileId);
  }

  public async getOutboundEdges(srcId: string): Promise<readonly EdgeRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, src_id, dst_id, kind, alpha, beta, evidence_json FROM edges WHERE src_id = ?;",
      )
      .all(srcId) as readonly Record<string, unknown>[];

    return rows.map((row) => this.mapEdgeRecord(row));
  }

  public async getInboundEdges(dstId: string): Promise<readonly EdgeRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, src_id, dst_id, kind, alpha, beta, evidence_json FROM edges WHERE dst_id = ?;",
      )
      .all(dstId) as readonly Record<string, unknown>[];

    return rows.map((row) => this.mapEdgeRecord(row));
  }

  public async getAllEdges(): Promise<readonly EdgeRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, src_id, dst_id, kind, alpha, beta, evidence_json FROM edges;",
      )
      .all() as readonly Record<string, unknown>[];

    return rows.map((row) => this.mapEdgeRecord(row));
  }

  // --- Unresolved references ---

  public async upsertUnresolvedRefs(refs: readonly UnresolvedRefRecord[]): Promise<void> {
    if (refs.length === 0) {
      return;
    }
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO unresolved_refs (id, src_id, name, kind, file_id, line)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        src_id = excluded.src_id,
        name = excluded.name,
        kind = excluded.kind,
        file_id = excluded.file_id,
        line = excluded.line;
    `);

    for (const ref of refs) {
      stmt.run(ref.id, ref.srcId, ref.name, ref.kind, ref.fileId, ref.line);
    }
  }

  public async deleteUnresolvedRefsByFileId(fileId: string): Promise<void> {
    const db = this.getDatabase();
    db.prepare("DELETE FROM unresolved_refs WHERE file_id = ?;").run(fileId);
  }

  public async deleteUnresolvedRef(id: string): Promise<void> {
    const db = this.getDatabase();
    db.prepare("DELETE FROM unresolved_refs WHERE id = ?;").run(id);
  }

  public async getUnresolvedRefsByName(name: string): Promise<readonly UnresolvedRefRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare(
        "SELECT id, src_id, name, kind, file_id, line FROM unresolved_refs WHERE name = ?;",
      )
      .all(name) as readonly Record<string, unknown>[];

    return rows.map((row) => ({
      id: String(row["id"]),
      srcId: String(row["src_id"]),
      name: String(row["name"]),
      kind: String(row["kind"]) as EdgeRecord["kind"],
      fileId: String(row["file_id"]),
      line: Number(row["line"]),
    }));
  }

  public async getAllUnresolvedRefs(): Promise<readonly UnresolvedRefRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare("SELECT id, src_id, name, kind, file_id, line FROM unresolved_refs;")
      .all() as readonly Record<string, unknown>[];

    return rows.map((row) => ({
      id: String(row["id"]),
      srcId: String(row["src_id"]),
      name: String(row["name"]),
      kind: String(row["kind"]) as EdgeRecord["kind"],
      fileId: String(row["file_id"]),
      line: Number(row["line"]),
    }));
  }

  // --- Full-text search (BM25) ---

  public async searchFts(query: string, limit = 20): Promise<readonly FtsSearchResult[]> {
    const db = this.getDatabase();
    const safeQuery = query.trim().replace(/['"]/g, "");
    if (!safeQuery) {
      return [];
    }

    const rows = db
      .prepare(`
        SELECT 
          n.id, n.file_id, n.kind, n.name, n.qualified_name, 
          n.start_line, n.end_line, n.signature, n.doc_comment, n.tokens,
          bm25(nodes_fts) as rank
        FROM nodes_fts f
        JOIN nodes n ON f.id = n.id
        WHERE nodes_fts MATCH ?
        ORDER BY rank
        LIMIT ?;
      `)
      .all(safeQuery, limit) as unknown as readonly (Record<string, unknown> & { rank: number })[];

    return rows.map((row) => ({
      node: this.mapNodeRecord(row),
      rank: Number(row["rank"]),
    }));
  }

  // --- Statistics ---

  public async getStats(): Promise<StorageStats> {
    const db = this.getDatabase();
    const fileRow = db.prepare("SELECT COUNT(*) as count FROM files;").get() as { count: number };
    const nodeRow = db.prepare("SELECT COUNT(*) as count FROM nodes;").get() as { count: number };
    const edgeRow = db.prepare("SELECT COUNT(*) as count FROM edges;").get() as { count: number };
    const unresRow = db.prepare("SELECT COUNT(*) as count FROM unresolved_refs;").get() as { count: number };

    return {
      fileCount: fileRow?.count ?? 0,
      nodeCount: nodeRow?.count ?? 0,
      edgeCount: edgeRow?.count ?? 0,
      unresolvedCount: unresRow?.count ?? 0,
    };
  }

  private mapNodeRecord(row: Record<string, unknown>): NodeRecord {
    return {
      id: String(row["id"]),
      fileId: String(row["file_id"]),
      kind: String(row["kind"]) as NodeRecord["kind"],
      name: String(row["name"]),
      qualifiedName: String(row["qualified_name"]),
      startLine: Number(row["start_line"]),
      endLine: Number(row["end_line"]),
      signature: row["signature"] ? String(row["signature"]) : null,
      docComment: row["doc_comment"] ? String(row["doc_comment"]) : null,
      tokens: String(row["tokens"]),
    };
  }

  private mapEdgeRecord(row: Record<string, unknown>): EdgeRecord {
    return {
      id: String(row["id"]),
      srcId: String(row["src_id"]),
      dstId: String(row["dst_id"]),
      kind: String(row["kind"]) as EdgeRecord["kind"],
      alpha: Number(row["alpha"]),
      beta: Number(row["beta"]),
      evidenceJson: row["evidence_json"] ? String(row["evidence_json"]) : null,
    };
  }

  // --- Vibe Memory & AI Working Context ---

  public async saveVibeMemory(memory: VibeMemoryRecord): Promise<void> {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO vibe_memories (
        id, timestamp, intent, active_files, architectural_notes, pending_decisions, session_tag, symbol_focus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      memory.id,
      memory.timestamp,
      memory.intent,
      JSON.stringify(memory.activeFiles),
      memory.architecturalNotes,
      JSON.stringify(memory.pendingDecisions),
      memory.sessionTag ?? null,
      memory.symbolFocus ? JSON.stringify(memory.symbolFocus) : null,
    );
  }

  public async getLatestVibeMemory(): Promise<VibeMemoryRecord | null> {
    const db = this.getDatabase();
    const row = db
      .prepare("SELECT * FROM vibe_memories ORDER BY timestamp DESC LIMIT 1;")
      .get() as Record<string, unknown> | undefined;

    if (!row) return null;
    return this.mapVibeMemoryRecord(row);
  }

  public async getAllVibeMemories(limit = 20): Promise<readonly VibeMemoryRecord[]> {
    const db = this.getDatabase();
    const rows = db
      .prepare("SELECT * FROM vibe_memories ORDER BY timestamp DESC LIMIT ?;")
      .all(limit) as Record<string, unknown>[];

    return rows.map((r) => this.mapVibeMemoryRecord(r));
  }

  private mapVibeMemoryRecord(row: Record<string, unknown>): VibeMemoryRecord {
    let activeFiles: string[] = [];
    try {
      activeFiles = JSON.parse(String(row["active_files"] || "[]"));
    } catch {
      activeFiles = [];
    }

    let pendingDecisions: string[] = [];
    try {
      pendingDecisions = JSON.parse(String(row["pending_decisions"] || "[]"));
    } catch {
      pendingDecisions = [];
    }

    let symbolFocus: string[] | undefined = undefined;
    if (row["symbol_focus"]) {
      try {
        symbolFocus = JSON.parse(String(row["symbol_focus"]));
      } catch {
        symbolFocus = undefined;
      }
    }

    return {
      id: String(row["id"]),
      timestamp: Number(row["timestamp"]),
      intent: String(row["intent"]),
      activeFiles,
      architecturalNotes: String(row["architectural_notes"] || ""),
      pendingDecisions,
      sessionTag: row["session_tag"] ? String(row["session_tag"]) : undefined,
      symbolFocus,
    };
  }
}

