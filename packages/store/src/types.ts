import type {
  EdgeRecord,
  FileRecord,
  NodeRecord,
  UnresolvedRefRecord,
} from "@ruas/core";

export interface FtsSearchResult {
  readonly node: NodeRecord;
  readonly rank: number;
}

export interface StorageStats {
  readonly fileCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly unresolvedCount: number;
}

export interface Storage {
  init(): Promise<void>;
  close(): Promise<void>;

  // File operations
  upsertFile(file: FileRecord): Promise<void>;
  getFile(path: string): Promise<FileRecord | null>;
  getAllFiles(): Promise<readonly FileRecord[]>;
  deleteFile(path: string): Promise<void>;

  // Node operations
  upsertNodes(nodes: readonly NodeRecord[]): Promise<void>;
  deleteNodesByFileId(fileId: string): Promise<void>;
  getNodesByFileId(fileId: string): Promise<readonly NodeRecord[]>;
  getNodeById(id: string): Promise<NodeRecord | null>;
  findNodesByName(name: string): Promise<readonly NodeRecord[]>;
  getAllNodes(): Promise<readonly NodeRecord[]>;

  // Edge operations
  upsertEdges(edges: readonly EdgeRecord[]): Promise<void>;
  deleteEdgesByFileId(fileId: string): Promise<void>;
  getOutboundEdges(srcId: string): Promise<readonly EdgeRecord[]>;
  getInboundEdges(dstId: string): Promise<readonly EdgeRecord[]>;
  getAllEdges(): Promise<readonly EdgeRecord[]>;

  // Unresolved references
  upsertUnresolvedRefs(refs: readonly UnresolvedRefRecord[]): Promise<void>;
  deleteUnresolvedRefsByFileId(fileId: string): Promise<void>;
  deleteUnresolvedRef(id: string): Promise<void>;
  getUnresolvedRefsByName(name: string): Promise<readonly UnresolvedRefRecord[]>;
  getAllUnresolvedRefs(): Promise<readonly UnresolvedRefRecord[]>;

  // Full-Text Search
  searchFts(query: string, limit?: number): Promise<readonly FtsSearchResult[]>;

  // Vibe Memory & Working Context
  saveVibeMemory(memory: import("@ruas/core").VibeMemoryRecord): Promise<void>;
  getLatestVibeMemory(): Promise<import("@ruas/core").VibeMemoryRecord | null>;
  getAllVibeMemories(limit?: number): Promise<readonly import("@ruas/core").VibeMemoryRecord[]>;

  // Statistics
  getStats(): Promise<StorageStats>;
}
