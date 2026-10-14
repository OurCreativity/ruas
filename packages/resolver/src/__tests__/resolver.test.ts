import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteStorage } from "@ruas/store";
import { computeBetaCredibleInterval, type FileRecord, type NodeRecord, type UnresolvedRefRecord } from "@ruas/core";
import { SymbolResolver } from "../index.js";

describe("@ruas/resolver SymbolResolver", () => {
  let storage: SqliteStorage;

  beforeEach(async () => {
    storage = new SqliteStorage({ dbPath: ":memory:" });
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  it("resolves same-scope, unique, import, and ambiguous references with calibrated Beta priors", async () => {
    // 1. Files
    const fileA: FileRecord = {
      id: "f_a",
      path: "src/service.ts",
      lang: "typescript",
      contentHash: "hash_a",
      size: 100,
      mtime: 1000,
      indexedAt: 1000,
    };
    const fileB: FileRecord = {
      id: "f_b",
      path: "src/repo.ts",
      lang: "typescript",
      contentHash: "hash_b",
      size: 100,
      mtime: 1000,
      indexedAt: 1000,
    };
    const fileC: FileRecord = {
      id: "f_c",
      path: "src/ambiguous.ts",
      lang: "typescript",
      contentHash: "hash_c",
      size: 100,
      mtime: 1000,
      indexedAt: 1000,
    };
    await storage.upsertFile(fileA);
    await storage.upsertFile(fileB);
    await storage.upsertFile(fileC);

    // 2. Nodes
    const caller: NodeRecord = {
      id: "n_caller",
      fileId: "f_a",
      kind: "function",
      name: "checkout",
      qualifiedName: "checkout",
      startLine: 1,
      endLine: 10,
      signature: "()",
      docComment: null,
      tokens: "checkout",
    };
    const sameFileTarget: NodeRecord = {
      id: "n_same_file",
      fileId: "f_a",
      kind: "function",
      name: "applyPromo",
      qualifiedName: "applyPromo",
      startLine: 12,
      endLine: 20,
      signature: "()",
      docComment: null,
      tokens: "apply promo",
    };
    const uniqueTarget: NodeRecord = {
      id: "n_unique",
      fileId: "f_b",
      kind: "function",
      name: "queryDatabase",
      qualifiedName: "queryDatabase",
      startLine: 1,
      endLine: 10,
      signature: "()",
      docComment: null,
      tokens: "query database",
    };
    const ambiguous1: NodeRecord = {
      id: "n_amb_1",
      fileId: "f_b",
      kind: "function",
      name: "formatDate",
      qualifiedName: "formatDate",
      startLine: 20,
      endLine: 25,
      signature: "()",
      docComment: null,
      tokens: "format date",
    };
    const ambiguous2: NodeRecord = {
      id: "n_amb_2",
      fileId: "f_c",
      kind: "function",
      name: "formatDate",
      qualifiedName: "formatDate",
      startLine: 1,
      endLine: 5,
      signature: "()",
      docComment: null,
      tokens: "format date",
    };

    await storage.upsertNodes([caller, sameFileTarget, uniqueTarget, ambiguous1, ambiguous2]);

    // 3. Unresolved refs
    const refSameScope: UnresolvedRefRecord = {
      id: "ref_same",
      srcId: "n_caller",
      name: "applyPromo",
      kind: "calls",
      fileId: "f_a",
      line: 5,
    };
    const refUnique: UnresolvedRefRecord = {
      id: "ref_unique",
      srcId: "n_caller",
      name: "queryDatabase",
      kind: "calls",
      fileId: "f_a",
      line: 6,
    };
    const refAmbiguous: UnresolvedRefRecord = {
      id: "ref_amb",
      srcId: "n_caller",
      name: "formatDate",
      kind: "calls",
      fileId: "f_a",
      line: 7,
    };

    await storage.upsertUnresolvedRefs([refSameScope, refUnique, refAmbiguous]);

    // 4. Run Resolver
    const resolver = new SymbolResolver(storage);
    const summary = await resolver.resolveAll();

    expect(summary.totalRefsEvaluated).toBe(3);
    expect(summary.edgesCreated).toBe(4); // 1 same-file + 1 unique + 2 ambiguous
    expect(summary.highConfidenceEdges).toBe(1); // same-scope is p=0.889 (>=0.85), unique is p=0.75

    // Verify same-file edge
    const sameEdges = await storage.getOutboundEdges("n_caller");
    const sameEdge = sameEdges.find((e) => e.dstId === "n_same_file");
    expect(sameEdge).toBeDefined();
    expect(sameEdge?.alpha).toBe(8);
    expect(sameEdge?.beta).toBe(1);
    const sameInterval = computeBetaCredibleInterval(sameEdge!.alpha, sameEdge!.beta);
    expect(sameInterval.mean).toBe(0.889);

    // Verify unique edge
    const uniqueEdge = sameEdges.find((e) => e.dstId === "n_unique");
    expect(uniqueEdge).toBeDefined();
    expect(uniqueEdge?.alpha).toBe(6);
    expect(uniqueEdge?.beta).toBe(2);

    // Verify ambiguous edges
    const ambEdge1 = sameEdges.find((e) => e.dstId === "n_amb_1");
    expect(ambEdge1).toBeDefined();
    expect(ambEdge1?.alpha).toBe(2);
    expect(ambEdge1?.beta).toBe(4); // 2 * 2 candidates
    const ambInterval = computeBetaCredibleInterval(ambEdge1!.alpha, ambEdge1!.beta);
    expect(ambInterval.mean).toBe(0.333);

    // Verify unresolved table is now empty
    const remainingRefs = await storage.getAllUnresolvedRefs();
    expect(remainingRefs.length).toBe(0);
  });
});
