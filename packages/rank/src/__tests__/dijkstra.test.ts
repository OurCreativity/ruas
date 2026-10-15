import { describe, expect, it } from "vitest";
import type { EdgeRecord, NodeRecord } from "@ruas/core";
import { DijkstraEngine, MinPriorityQueue } from "../dijkstra.js";

describe("DijkstraEngine & MinPriorityQueue", () => {
  it("MinPriorityQueue pops items in ascending priority order", () => {
    const pq = new MinPriorityQueue<string>();
    pq.push("medium", 5);
    pq.push("lowest", 10);
    pq.push("highest", 1);
    pq.push("sub-highest", 2);

    expect(pq.size).toBe(4);
    expect(pq.pop()).toBe("highest");
    expect(pq.pop()).toBe("sub-highest");
    expect(pq.pop()).toBe("medium");
    expect(pq.pop()).toBe("lowest");
    expect(pq.isEmpty()).toBe(true);
  });

  const mockNodes: NodeRecord[] = [
    {
      id: "n_router",
      fileId: "f1",
      kind: "route",
      name: "checkoutEndpoint",
      qualifiedName: "src/api/checkout.ts:checkoutEndpoint",
      startLine: 1,
      endLine: 10,
      signature: "@app.post('/checkout')",
      docComment: null,
      tokens: "checkout endpoint",
    },
    {
      id: "n_service",
      fileId: "f2",
      kind: "class",
      name: "PaymentService",
      qualifiedName: "src/services/payment.ts:PaymentService",
      startLine: 1,
      endLine: 20,
      signature: "class PaymentService",
      docComment: null,
      tokens: "payment service",
    },
    {
      id: "n_qris",
      fileId: "f3",
      kind: "function",
      name: "processQRIS",
      qualifiedName: "src/gateways/qris.ts:processQRIS",
      startLine: 1,
      endLine: 15,
      signature: "function processQRIS()",
      docComment: null,
      tokens: "process qris",
    },
    {
      id: "n_va",
      fileId: "f4",
      kind: "function",
      name: "processVA",
      qualifiedName: "src/gateways/va.ts:processVA",
      startLine: 1,
      endLine: 15,
      signature: "function processVA()",
      docComment: null,
      tokens: "process va",
    },
    {
      id: "n_db",
      fileId: "f5",
      kind: "function",
      name: "saveTransaction",
      qualifiedName: "src/db/repo.ts:saveTransaction",
      startLine: 1,
      endLine: 15,
      signature: "function saveTransaction()",
      docComment: null,
      tokens: "save transaction",
    },
  ];

  // Route -> Service -> QRIS -> DB (Primary path, high confidence)
  // Route -> Service -> VA -> DB (Alternative secondary path, slightly lower confidence)
  const mockEdges: EdgeRecord[] = [
    {
      id: "e1",
      srcId: "n_router",
      dstId: "n_service",
      kind: "calls",
      alpha: 19, // 19 / 20 = 0.95
      beta: 1,
      evidenceJson: null,
    },
    {
      id: "e2",
      srcId: "n_service",
      dstId: "n_qris",
      kind: "calls",
      alpha: 18, // 18 / 20 = 0.90
      beta: 2,
      evidenceJson: null,
    },
    {
      id: "e3",
      srcId: "n_qris",
      dstId: "n_db",
      kind: "calls",
      alpha: 19, // 19 / 20 = 0.95
      beta: 1,
      evidenceJson: null,
    },
    {
      id: "e4",
      srcId: "n_service",
      dstId: "n_va",
      kind: "calls",
      alpha: 14, // 14 / 20 = 0.70
      beta: 6,
      evidenceJson: null,
    },
    {
      id: "e5",
      srcId: "n_va",
      dstId: "n_db",
      kind: "calls",
      alpha: 15, // 15 / 20 = 0.75
      beta: 5,
      evidenceJson: null,
    },
  ];

  it("finds the optimal Bayesian shortest path using Dijkstra", () => {
    const result = DijkstraEngine.findShortestPath("n_router", "n_db", mockNodes, mockEdges);

    expect(result.found).toBe(true);
    expect(result.hops).toBe(3);
    // Path should choose QRIS over VA because 0.95 * 0.90 * 0.95 (0.812) > 0.95 * 0.70 * 0.75 (0.498)
    expect(result.path.map((s) => s.node.name)).toEqual([
      "checkoutEndpoint",
      "PaymentService",
      "processQRIS",
      "saveTransaction",
    ]);
    expect(result.cumulativeConfidence).toBeGreaterThan(0.8);
  });

  it("finds K-Shortest Paths (primary route and alternative fallback route)", () => {
    const kResult = DijkstraEngine.findKShortestPaths("n_router", "n_db", mockNodes, mockEdges, 2);

    expect(kResult.totalPathsFound).toBe(2);

    // Primary route: via QRIS
    const path1 = kResult.paths[0]!;
    expect(path1.path.map((s) => s.node.name)).toContain("processQRIS");

    // Secondary route: via VA
    const path2 = kResult.paths[1]!;
    expect(path2.path.map((s) => s.node.name)).toContain("processVA");
    expect(path2.cumulativeConfidence).toBeLessThan(path1.cumulativeConfidence);
  });

  it("computes Single-Source Shortest Path (SSSP) Dijkstra horizon with probability decay", () => {
    const horizon = DijkstraEngine.computeDijkstraHorizon("n_router", mockNodes, mockEdges, 3, 0.1);

    expect(horizon.origin.name).toBe("checkoutEndpoint");
    expect(horizon.reachableCount).toBe(4); // PaymentService, processQRIS, processVA, saveTransaction

    // Closest should be PaymentService (hop 1)
    expect(horizon.horizon[0]?.node.name).toBe("PaymentService");
    expect(horizon.horizon[0]?.cumulativeConfidence).toBeCloseTo(0.95, 2);
  });
});
