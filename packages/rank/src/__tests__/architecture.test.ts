import { describe, expect, it } from "vitest";
import type { EdgeRecord, NodeRecord } from "@ruas/core";
import { ArchitectureAnalyzer } from "../architecture.js";

describe("ArchitectureAnalyzer", () => {
  const mockNodes: NodeRecord[] = [
    {
      id: "node_service_a",
      fileId: "file_a",
      kind: "function",
      name: "serviceA",
      qualifiedName: "src/services/serviceA.ts:serviceA",
      startLine: 1,
      endLine: 10,
      signature: "function serviceA()",
      docComment: null,
      tokens: "service a",
    },
    {
      id: "node_service_b",
      fileId: "file_b",
      kind: "function",
      name: "serviceB",
      qualifiedName: "src/services/serviceB.ts:serviceB",
      startLine: 1,
      endLine: 10,
      signature: "function serviceB()",
      docComment: null,
      tokens: "service b",
    },
    {
      id: "node_service_c",
      fileId: "file_c",
      kind: "function",
      name: "serviceC",
      qualifiedName: "src/services/serviceC.ts:serviceC",
      startLine: 1,
      endLine: 10,
      signature: "function serviceC()",
      docComment: null,
      tokens: "service c",
    },
    {
      id: "node_orphan",
      fileId: "file_orphan",
      kind: "function",
      name: "deadCodeHelper",
      qualifiedName: "src/utils/deadCode.ts:deadCodeHelper",
      startLine: 1,
      endLine: 10,
      signature: "function deadCodeHelper()",
      docComment: null,
      tokens: "dead code helper",
    },
  ];

  it("detects circular dependency cycles (A -> B -> C -> A)", () => {
    const cycleEdges: EdgeRecord[] = [
      {
        id: "e1",
        srcId: "node_service_a",
        dstId: "node_service_b",
        kind: "calls",
        alpha: 10,
        beta: 1,
        evidenceJson: null,
      },
      {
        id: "e2",
        srcId: "node_service_b",
        dstId: "node_service_c",
        kind: "calls",
        alpha: 10,
        beta: 1,
        evidenceJson: null,
      },
      {
        id: "e3",
        srcId: "node_service_c",
        dstId: "node_service_a",
        kind: "calls",
        alpha: 10,
        beta: 1,
        evidenceJson: null,
      },
    ];

    const cycles = ArchitectureAnalyzer.detectCycles(mockNodes, cycleEdges);
    expect(cycles.length).toBe(1);
    expect(cycles[0]?.length).toBe(3);
    expect(cycles[0]?.nodeNames).toEqual(expect.arrayContaining(["serviceA", "serviceB", "serviceC"]));
  });

  it("detects unreferenced orphan symbols", () => {
    const edges: EdgeRecord[] = [
      {
        id: "e1",
        srcId: "node_service_a",
        dstId: "node_service_b",
        kind: "calls",
        alpha: 10,
        beta: 1,
        evidenceJson: null,
      },
    ];

    const orphans = ArchitectureAnalyzer.detectOrphans(mockNodes, edges);
    expect(orphans.length).toBeGreaterThanOrEqual(1);
    const deadNode = orphans.find((o) => o.node.name === "deadCodeHelper");
    expect(deadNode).toBeDefined();
    expect(deadNode?.reason).toContain("Zero inbound references");
  });

  it("calculates architecture health report and coupling metrics", () => {
    const edges: EdgeRecord[] = [
      {
        id: "e1",
        srcId: "node_service_a",
        dstId: "node_service_b",
        kind: "calls",
        alpha: 10,
        beta: 1,
        evidenceJson: null,
      },
    ];

    const report = ArchitectureAnalyzer.calculateHealth(mockNodes, edges);
    expect(report.score).toBeGreaterThan(0);
    expect(["A", "B", "C", "D", "F"]).toContain(report.grade);
    expect(report.subsystemCouplings.length).toBeGreaterThan(0);
  });

  it("finds shortest weighted path with cumulative Bayesian confidence", () => {
    const edges: EdgeRecord[] = [
      {
        id: "e1",
        srcId: "node_service_a",
        dstId: "node_service_b",
        kind: "calls",
        alpha: 9, // confidence 0.9
        beta: 1,
        evidenceJson: null,
      },
      {
        id: "e2",
        srcId: "node_service_b",
        dstId: "node_service_c",
        kind: "calls",
        alpha: 8, // confidence 0.8
        beta: 2,
        evidenceJson: null,
      },
    ];

    const pathResult = ArchitectureAnalyzer.findPath(
      "node_service_a",
      "node_service_c",
      mockNodes,
      edges,
    );

    expect(pathResult.found).toBe(true);
    expect(pathResult.hops).toBe(2);
    expect(pathResult.cumulativeConfidence).toBeCloseTo(0.72, 2);
    expect(pathResult.path.map((p) => p.node.name)).toEqual(["serviceA", "serviceB", "serviceC"]);
  });
});
