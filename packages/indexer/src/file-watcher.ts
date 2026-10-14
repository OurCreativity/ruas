import { EventEmitter } from "node:events";
import { type FSWatcher, watch } from "node:fs";
import ignore, { type Ignore } from "ignore";
import type { Indexer, IndexSummary } from "./indexer.js";

export interface FileWatcherOptions {
  readonly rootDir: string;
  readonly debounceMs?: number | undefined; // default 500ms
  readonly ignoredPatterns?: readonly string[] | undefined;
}

export interface FileChangeEvent {
  readonly filename: string;
  readonly eventType: string;
}

export class FileWatcher extends EventEmitter {
  private readonly rootDir: string;
  private readonly debounceMs: number;
  private readonly indexer: Indexer;
  private readonly ignoreFilter: Ignore;
  private fsWatcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly pendingChanges = new Set<string>();
  private isIndexing = false;

  constructor(indexer: Indexer, options: FileWatcherOptions) {
    super();
    this.indexer = indexer;
    this.rootDir = options.rootDir;
    this.debounceMs = options.debounceMs ?? 500;
    this.ignoreFilter = ignore();
    this.ignoreFilter.add([
      "node_modules",
      "dist",
      ".git",
      ".ruas",
      "coverage",
      "*.log",
      ".DS_Store",
      ".tmp",
      "tmp",
      ...(options.ignoredPatterns ?? []),
    ]);
  }

  public start(): void {
    if (this.fsWatcher) {
      return;
    }

    try {
      this.fsWatcher = watch(
        this.rootDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;

          const rel = filename.toString();
          if (this.isIgnored(rel)) return;

          this.pendingChanges.add(rel);
          this.emit("change", { filename: rel, eventType });

          this.scheduleReindex();
        },
      );
    } catch (err) {
      this.emit("error", err);
    }
  }

  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
    }
  }

  public isIgnored(relPath: string): boolean {
    const normalized = relPath.replace(/\\/g, "/");
    // Ignore internal dot-files and folders directly
    if (
      normalized.startsWith(".git") ||
      normalized.startsWith(".ruas") ||
      normalized.startsWith(".tmp") ||
      normalized.startsWith("node_modules")
    ) {
      return true;
    }
    return this.ignoreFilter.ignores(normalized);
  }

  public async triggerIndex(): Promise<IndexSummary | null> {
    if (this.isIndexing) {
      this.scheduleReindex();
      return null;
    }

    this.isIndexing = true;
    this.pendingChanges.clear();

    try {
      const summary = await this.indexer.runIndex({ rootDir: this.rootDir });
      this.emit("indexed", summary);
      return summary;
    } catch (err) {
      this.emit("error", err);
      return null;
    } finally {
      this.isIndexing = false;
    }
  }

  private scheduleReindex(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      void this.triggerIndex();
    }, this.debounceMs);
  }
}
