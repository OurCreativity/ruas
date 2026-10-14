import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteStorage } from "@ruas/store";
import type { EdgeRecord, FileRecord, NodeRecord } from "@ruas/core";
import {
  PersonalizedPageRank,
  ReciprocalRankFusion,
  RetrievalPipeline,
  TrigramMatcher,
} from "../index.js";

describe("@ruas/rank TrigramMatcher", () => {
  it("computes high similarity for typos and partial matches", () => {
    expect(TrigramMatcher.similarity("diskon", "diskon")).toBe(1.0);
    const typoSim = TrigramMatcher.similarity("diskon", "dikson");
    expect(typoSim).toBeGreaterThanOrEqual(0.5);

    const unrelatedSim = TrigramMatcher.similarity("diskon", "zebra");
    expect(unrelatedSim).toBeLessThan(0.2);
  });
});

describe("@ruas/rank PersonalizedPageRank", () => {
  it("boosts nodes with inbound confidence edges from seed nodes", () => {
    const ppr = new PersonalizedPageRank();
    const nodeIds = ["node_A", "node_B", "node_C"];
    const edges: EdgeRecord[] = [
      {
        id: "e1",
        srcId: "node_A",
        dstId: "node_B",
        kind: "calls",
        alpha: 10,
        beta: 0.5,
        evidenceJson: null,
      },
      {
        id: "e2",
        srcId: "node_B",
        dstId: "node_C",
        kind: "calls",
        alpha: 8,
        beta: 1.0,
        evidenceJson: null,
      },
    ];

    // Seed A with 1.0
    const seeds = new Map([["node_A", 1.0]]);
    const scores = ppr.compute(nodeIds, edges, seeds);

    expect(scores.length).toBe(3);
    const scoreA = scores.find((s) => s.nodeId === "node_A")?.score ?? 0;
    const scoreB = scores.find((s) => s.nodeId === "node_B")?.score ?? 0;
    expect(scoreA).toBeGreaterThan(0);
    expect(scoreB).toBeGreaterThan(0);
  });
});

describe("@ruas/rank ReciprocalRankFusion", () => {
  it("combines multiple ranked lists effectively", () => {
    const rrf = new ReciprocalRankFusion(60);
    const system1 = ["doc_A", "doc_B", "doc_C"];
    const system2 = ["doc_B", "doc_A", "doc_D"];

    const systems = new Map([
      ["sys1", system1],
      ["sys2", system2],
    ]);

    const fused = rrf.fuse(systems, (x) => x);
    expect(fused.length).toBe(4);
    // doc_A and doc_B are in both systems in top 2, should beat doc_C and doc_D
    expect(fused[0]?.item === "doc_A" || fused[0]?.item === "doc_B").toBe(true);
  });
});

describe("@ruas/rank RetrievalPipeline", () => {
  let storage: SqliteStorage;

  beforeEach(async () => {
    storage = new SqliteStorage({ dbPath: ":memory:" });
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  it("retrieves English code from Indonesian query with emotional damage roast", async () => {
    const file: FileRecord = {
      id: "f_promo",
      path: "src/discount.ts",
      lang: "typescript",
      contentHash: "hash123",
      size: 500,
      mtime: 1000,
      indexedAt: 1000,
    };
    await storage.upsertFile(file);

    const node1: NodeRecord = {
      id: "n_calc",
      fileId: "f_promo",
      kind: "function",
      name: "calculateCustomerDiscount",
      qualifiedName: "calculateCustomerDiscount",
      startLine: 1,
      endLine: 20,
      signature: "(customer: Customer): number",
      docComment: "Calculates discount rebate for customer",
      tokens: "calculate customer discount rebate",
    };

    const node2: NodeRecord = {
      id: "n_unrelated",
      fileId: "f_promo",
      kind: "function",
      name: "renderHeader",
      qualifiedName: "renderHeader",
      startLine: 21,
      endLine: 30,
      signature: "()",
      docComment: null,
      tokens: "render header ui",
    };

    await storage.upsertNodes([node1, node2]);

    const pipeline = new RetrievalPipeline(storage);
    const result = await pipeline.search("fungsi hitung diskon pelanggan", 5, true);

    expect(result.detectedLang).toBe("id");
    expect(result.expandedConcepts).toContain("discount");
    expect(result.symbols.length).toBeGreaterThan(0);

    const topHit = result.symbols[0]!;
    expect(topHit.node.name).toBe("calculateCustomerDiscount");
    expect(topHit.roastComment).toBeDefined();
    expect(typeof topHit.roastComment).toBe("string");
  });
});
