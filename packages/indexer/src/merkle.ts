import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { FileRecord } from "@ruas/core";
import type { WalkedFile } from "./file-walker.js";

export interface FileManifestEntry {
  readonly path: string;
  readonly contentHash: string;
  readonly size: number;
  readonly mtime: number;
}

export interface DirtySet {
  readonly added: readonly WalkedFile[];
  readonly modified: readonly WalkedFile[];
  readonly deleted: readonly FileRecord[];
  readonly unchanged: readonly WalkedFile[];
  readonly isCold: boolean;
}

export class MerkleTree {
  public static hashContent(content: string | Buffer): string {
    return createHash("sha256").update(content).digest("hex");
  }

  public static hashFile(absolutePath: string): string {
    const buffer = readFileSync(absolutePath);
    return MerkleTree.hashContent(buffer);
  }

  /**
   * Computes hierarchical directory Merkle hashes from a map of relative paths to content hashes.
   */
  public static computeDirectoryMerkle(
    fileHashes: ReadonlyMap<string, string>,
  ): ReadonlyMap<string, string> {
    const dirMap = new Map<string, string[]>();

    for (const [relPath, hash] of fileHashes.entries()) {
      const parts = relPath.split("/");
      parts.pop(); // Remove filename
      const dirPath = parts.join("/") || ".";

      const existing = dirMap.get(dirPath) ?? [];
      existing.push(`${relPath}:${hash}`);
      dirMap.set(dirPath, existing);
    }

    const dirHashes = new Map<string, string>();
    for (const [dir, entries] of dirMap.entries()) {
      entries.sort();
      const combined = entries.join(";");
      dirHashes.set(dir, MerkleTree.hashContent(combined));
    }

    return dirHashes;
  }

  /**
   * Detects dirty set (added, modified, deleted, unchanged) comparing current disk files
   * against the database snapshot.
   */
  public static detectDirtySet(
    currentDiskFiles: readonly WalkedFile[],
    storedFiles: readonly FileRecord[],
  ): DirtySet {
    const storedByPath = new Map<string, FileRecord>();
    for (const sf of storedFiles) {
      storedByPath.set(sf.path, sf);
    }

    const added: WalkedFile[] = [];
    const modified: WalkedFile[] = [];
    const unchanged: WalkedFile[] = [];
    const seenStoredPaths = new Set<string>();

    for (const diskFile of currentDiskFiles) {
      const stored = storedByPath.get(diskFile.relativePath);
      if (!stored) {
        added.push(diskFile);
      } else {
        seenStoredPaths.add(diskFile.relativePath);
        // Fast path: if mtime and size match, usually unchanged; verify by hash
        const currentHash = MerkleTree.hashFile(diskFile.absolutePath);
        if (currentHash !== stored.contentHash) {
          modified.push(diskFile);
        } else {
          unchanged.push(diskFile);
        }
      }
    }

    const deleted: FileRecord[] = [];
    for (const sf of storedFiles) {
      if (!seenStoredPaths.has(sf.path)) {
        deleted.push(sf);
      }
    }

    return {
      added,
      modified,
      deleted,
      unchanged,
      isCold: storedFiles.length === 0,
    };
  }
}
