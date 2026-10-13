import { createHash } from "node:crypto";
import type { EdgeKind, NodeKind } from "./types.js";

/**
 * Normalizes relative file paths across OS platforms (POSIX forward-slash).
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Creates deterministic ID for a file record based on its normalized path.
 */
export function createFileId(filePath: string): string {
  const norm = normalizePath(filePath);
  return createHash("sha256").update(`file:${norm}`).digest("hex").slice(0, 24);
}

/**
 * Creates deterministic ID for an AST node based on its file path, qualified name, and kind.
 */
export function createNodeId(
  filePath: string,
  qualifiedName: string,
  kind: NodeKind,
): string {
  const norm = normalizePath(filePath);
  const payload = `node:${norm}:${qualifiedName}:${kind}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

/**
 * Creates deterministic ID for a directed graph edge.
 */
export function createEdgeId(
  srcId: string,
  dstId: string,
  kind: EdgeKind,
): string {
  const payload = `edge:${srcId}:${dstId}:${kind}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}
