import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteStorage } from "../index.js";
import type { EdgeRecord, FileRecord, NodeRecord, UnresolvedRefRecord } from "@ruas/core";

describe("@ruas/store SqliteStorage", () => {
  let storage: SqliteStorage;

  beforeEach(async () => {
    storage = new SqliteStorage({ dbPath: ":memory:" });
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  it("handles file lifecycle correctly", async () => {
    const file: FileRecord = {
      id: "file_1",
      path: "src/discount.ts",
      lang: "typescript",
      contentHash: "hash_abc",
      size: 1024,
      mtime: 1700000000,
      indexedAt: 1700000100,
    };

    await storage.upsertFile(file);
    const retrieved = await storage.getFile("src/discount.ts");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("file_1");
    expect(retrieved?.contentHash).toBe("hash_abc");

    const allFiles = await storage.getAllFiles();
    expect(allFiles.length).toBe(1);

    await storage.deleteFile("src/discount.ts");
    const afterDelete = await storage.getFile("src/discount.ts");
    expect(afterDelete).toBeNull();
  });

  it("stores and queries AST nodes with FTS5", async () => {
    const file: FileRecord = {
      id: "file_2",
      path: "src/promo.ts",
      lang: "typescript",
      contentHash: "hash_promo",
      size: 512,
      mtime: 1700000000,
      indexedAt: 1700000100,
    };
    await storage.upsertFile(file);

    const node1: NodeRecord = {
      id: "node_promo_1",
      fileId: "file_2",
      kind: "function",
      name: "hitungDiskonPelanggan",
      qualifiedName: "hitungDiskonPelanggan",
      startLine: 1,
      endLine: 20,
      signature: "(pelanggan: Customer): number",
      docComment: "Menghitung total diskon belanja pelanggan",
      tokens: "hitung diskon pelanggan belanja",
    };

    const node2: NodeRecord = {
      id: "node_promo_2",
      fileId: "file_2",
      kind: "function",
      name: "applyVoucher",
      qualifiedName: "applyVoucher",
      startLine: 22,
      endLine: 40,
      signature: "(code: string): boolean",
      docComment: "Apply coupon code",
      tokens: "apply voucher coupon code",
    };

    await storage.upsertNodes([node1, node2]);

    const byFile = await storage.getNodesByFileId("file_2");
    expect(byFile.length).toBe(2);

    const byName = await storage.findNodesByName("hitungDiskonPelanggan");
    expect(byName.length).toBe(1);
    expect(byName[0]?.id).toBe("node_promo_1");

    // Test FTS5 matching
    const searchHits = await storage.searchFts("diskon");
    expect(searchHits.length).toBeGreaterThan(0);
    expect(searchHits[0]?.node.name).toBe("hitungDiskonPelanggan");

    const englishHits = await storage.searchFts("voucher");
    expect(englishHits.length).toBeGreaterThan(0);
    expect(englishHits[0]?.node.name).toBe("applyVoucher");
  });

  it("stores edges with Beta-Bernoulli confidence", async () => {
    const file: FileRecord = {
      id: "file_3",
      path: "src/service.ts",
      lang: "typescript",
      contentHash: "hash_srv",
      size: 500,
      mtime: 1700000000,
      indexedAt: 1700000100,
    };
    await storage.upsertFile(file);

    const n1: NodeRecord = {
      id: "n_caller",
      fileId: "file_3",
      kind: "function",
      name: "checkout",
      qualifiedName: "checkout",
      startLine: 1,
      endLine: 10,
      signature: "()",
      docComment: null,
      tokens: "checkout",
    };
    const n2: NodeRecord = {
      id: "n_callee",
      fileId: "file_3",
      kind: "function",
      name: "calculateDiscount",
      qualifiedName: "calculateDiscount",
      startLine: 11,
      endLine: 20,
      signature: "()",
      docComment: null,
      tokens: "calculate discount",
    };
    await storage.upsertNodes([n1, n2]);

    const edge: EdgeRecord = {
      id: "edge_1",
      srcId: "n_caller",
      dstId: "n_callee",
      kind: "calls",
      alpha: 10,
      beta: 0.5,
      evidenceJson: JSON.stringify({ rule: "direct_import" }),
    };

    await storage.upsertEdges([edge]);

    const outbound = await storage.getOutboundEdges("n_caller");
    expect(outbound.length).toBe(1);
    expect(outbound[0]?.dstId).toBe("n_callee");
    expect(outbound[0]?.alpha).toBe(10);

    const inbound = await storage.getInboundEdges("n_callee");
    expect(inbound.length).toBe(1);
    expect(inbound[0]?.srcId).toBe("n_caller");
  });

  it("stores and removes unresolved references", async () => {
    const file: FileRecord = {
      id: "file_4",
      path: "src/unres.ts",
      lang: "typescript",
      contentHash: "hash_u",
      size: 300,
      mtime: 1700000000,
      indexedAt: 1700000100,
    };
    await storage.upsertFile(file);

    const node: NodeRecord = {
      id: "n_unres",
      fileId: "file_4",
      kind: "function",
      name: "processOrder",
      qualifiedName: "processOrder",
      startLine: 1,
      endLine: 15,
      signature: "()",
      docComment: null,
      tokens: "process order",
    };
    await storage.upsertNodes([node]);

    const ref: UnresolvedRefRecord = {
      id: "ref_1",
      srcId: "n_unres",
      name: "sendNotification",
      kind: "calls",
      fileId: "file_4",
      line: 12,
    };
    await storage.upsertUnresolvedRefs([ref]);

    const matching = await storage.getUnresolvedRefsByName("sendNotification");
    expect(matching.length).toBe(1);
    expect(matching[0]?.srcId).toBe("n_unres");

    const stats = await storage.getStats();
    expect(stats.fileCount).toBe(1);
    expect(stats.nodeCount).toBe(1);
    expect(stats.unresolvedCount).toBe(1);
  });
});
