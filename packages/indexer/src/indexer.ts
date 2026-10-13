import { readFileSync } from "node:fs";
import { type FileRecord, createFileId } from "@ruas/core";
import { CodeParser } from "@ruas/parser";
import type { Storage } from "@ruas/store";
import { FileWalker, type WalkedFile } from "./file-walker.js";
import { MerkleTree } from "./merkle.js";

export interface IndexOptions {
  readonly rootDir: string;
  readonly forceRebuild?: boolean | undefined;
  readonly maxFileSize?: number | undefined;
}

export interface IndexSummary {
  readonly totalFiles: number;
  readonly indexedFiles: number;
  readonly dirtyFiles: number;
  readonly deletedFiles: number;
  readonly nodesCount: number;
  readonly edgesCount: number;
  readonly durationMs: number;
  readonly isCold: boolean;
}

export class Indexer {
  private readonly storage: Storage;
  private readonly parser: CodeParser;

  constructor(storage: Storage, parser?: CodeParser) {
    this.storage = storage;
    this.parser = parser ?? new CodeParser();
  }

  public async runIndex(options: IndexOptions): Promise<IndexSummary> {
    const startTime = Date.now();
    await this.storage.init();
    await this.parser.init();

    // 1. Walk files
    const walker = new FileWalker({
      rootDir: options.rootDir,
      maxFileSize: options.maxFileSize,
    });
    const currentFiles = await walker.walk();

    // 2. Query stored files
    const storedFiles = await this.storage.getAllFiles();

    // 3. Detect dirty set
    const dirtySet = options.forceRebuild
      ? {
          added: currentFiles,
          modified: [] as readonly WalkedFile[],
          deleted: storedFiles,
          unchanged: [] as readonly WalkedFile[],
          isCold: true,
        }
      : MerkleTree.detectDirtySet(currentFiles, storedFiles);

    // 4. Process deletions
    for (const del of dirtySet.deleted) {
      await this.storage.deleteFile(del.path);
    }

    // 5. Process added and modified files
    const toIndex = [...dirtySet.added, ...dirtySet.modified];
    const now = Date.now();

    for (const file of toIndex) {
      const content = readFileSync(file.absolutePath, "utf-8");
      const contentHash = MerkleTree.hashContent(content);
      const fileId = createFileId(file.relativePath);

      // If modified, clear old AST nodes and outbound/inbound edges for this file
      if (!dirtySet.isCold) {
        await this.storage.deleteNodesByFileId(fileId);
        await this.storage.deleteEdgesByFileId(fileId);
        await this.storage.deleteUnresolvedRefsByFileId(fileId);
      }

      // Upsert file record
      const fileRecord: FileRecord = {
        id: fileId,
        path: file.relativePath,
        lang: file.lang,
        contentHash,
        size: file.size,
        mtime: file.mtime,
        indexedAt: now,
      };
      await this.storage.upsertFile(fileRecord);

      // Parse AST
      const parseResult = await this.parser.parseFile(
        file.relativePath,
        content,
        file.lang,
      );

      // Store nodes, edges, unresolved refs
      await this.storage.upsertNodes(parseResult.nodes);
      await this.storage.upsertEdges(parseResult.edges);
      await this.storage.upsertUnresolvedRefs(parseResult.unresolvedRefs);
    }

    const durationMs = Date.now() - startTime;
    const stats = await this.storage.getStats();

    return {
      totalFiles: currentFiles.length,
      indexedFiles: toIndex.length,
      dirtyFiles: toIndex.length,
      deletedFiles: dirtySet.deleted.length,
      nodesCount: stats.nodeCount,
      edgesCount: stats.edgeCount,
      durationMs,
      isCold: dirtySet.isCold,
    };
  }
}
