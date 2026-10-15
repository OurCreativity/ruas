import type {
  ArchitectureHealthReport,
  CycleInfo,
  DijkstraHorizonResult,
  EdgeRecord,
  KPathResult,
  NodeRecord,
  OrphanInfo,
  PathResult,
  SubsystemCoupling,
} from "@ruas/core";
import { DijkstraEngine } from "./dijkstra.js";

export class ArchitectureAnalyzer {
  /**
   * Detects circular dependency cycles using Tarjan's Strongly Connected Components algorithm
   * and cycle path reconstruction over dependency edges (calls, imports, extends, implements, references).
   */
  public static detectCycles(
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): readonly CycleInfo[] {
    const nodeMap = new Map<string, NodeRecord>(nodes.map((n) => [n.id, n]));
    const dependencyKinds = new Set(["calls", "imports", "extends", "implements", "references"]);

    // Build adjacency list for dependency edges only (filter out hierarchical 'contains')
    const adj = new Map<string, string[]>();
    for (const node of nodes) {
      adj.set(node.id, []);
    }
    for (const edge of edges) {
      if (dependencyKinds.has(edge.kind) && adj.has(edge.srcId) && nodeMap.has(edge.dstId)) {
        adj.get(edge.srcId)!.push(edge.dstId);
      }
    }

    // Tarjan's Strongly Connected Components
    let index = 0;
    const indices = new Map<string, number>();
    const lowlinks = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];

    const strongConnect = (v: string) => {
      indices.set(v, index);
      lowlinks.set(v, index);
      index++;
      stack.push(v);
      onStack.add(v);

      const neighbors = adj.get(v) ?? [];
      for (const w of neighbors) {
        if (!indices.has(w)) {
          strongConnect(w);
          lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
        } else if (onStack.has(w)) {
          lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
        }
      }

      if (lowlinks.get(v) === indices.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);

        // A component is a cycle if it has > 1 node OR a self-loop
        if (scc.length > 1 || (scc.length === 1 && (adj.get(scc[0]!) ?? []).includes(scc[0]!))) {
          sccs.push(scc);
        }
      }
    };

    for (const node of nodes) {
      if (!indices.has(node.id)) {
        strongConnect(node.id);
      }
    }

    const cycles: CycleInfo[] = [];
    let cycleCounter = 1;

    for (const scc of sccs) {
      const nodeNames = scc.map((id) => nodeMap.get(id)?.name ?? id);
      const filePaths = Array.from(new Set(scc.map((id) => nodeMap.get(id)?.fileId ?? ""))).filter(Boolean);

      cycles.push({
        id: `cycle-${cycleCounter++}`,
        length: scc.length,
        nodeIds: scc,
        nodeNames,
        files: filePaths,
      });
    }

    return cycles;
  }

  /**
   * Finds unreferenced orphan symbols that have 0 inbound dependency edges,
   * excluding file nodes, routes, and common entrypoint files.
   */
  public static detectOrphans(
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): readonly OrphanInfo[] {
    const dependencyKinds = new Set(["calls", "imports", "extends", "implements", "references"]);
    const inboundCount = new Map<string, number>();

    for (const n of nodes) {
      inboundCount.set(n.id, 0);
    }

    for (const e of edges) {
      if (dependencyKinds.has(e.kind)) {
        const count = inboundCount.get(e.dstId) ?? 0;
        inboundCount.set(e.dstId, count + 1);
      }
    }

    const orphans: OrphanInfo[] = [];

    for (const node of nodes) {
      // Ignore files and HTTP routes
      if (node.kind === "file" || node.kind === "route") {
        continue;
      }

      // Ignore common entrypoint files (index, main, app, cli)
      const qname = node.qualifiedName.toLowerCase();
      if (
        qname.includes("index.") ||
        qname.includes("main.") ||
        qname.includes("app.") ||
        qname.includes("server.")
      ) {
        continue;
      }

      // If in-degree is 0, it's an orphan
      const inDegree = inboundCount.get(node.id) ?? 0;
      if (inDegree === 0) {
        orphans.push({
          node,
          reason: `Zero inbound references in graph (${node.kind} '${node.name}')`,
        });
      }
    }

    return orphans;
  }

  /**
   * Computes Robert C. Martin's Package Coupling Metrics (Ca, Ce, Instability)
   * and overall Architecture Health Score.
   */
  public static calculateHealth(
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): ArchitectureHealthReport {
    const cycles = ArchitectureAnalyzer.detectCycles(nodes, edges);
    const orphans = ArchitectureAnalyzer.detectOrphans(nodes, edges);

    // Group nodes by top-level subsystem directory
    const nodeSubsystem = new Map<string, string>();
    const subsystemNodes = new Map<string, NodeRecord[]>();

    for (const node of nodes) {
      const parts = node.qualifiedName.split(":");
      const filePath = parts[0] ?? "";
      const pathSegments = filePath.split("/").filter(Boolean);
      // Determine subsystem: either first 2 path segments or 'root'
      const subsystem = pathSegments.length > 1
        ? `${pathSegments[0]}/${pathSegments[1]}`
        : pathSegments[0] ?? "root";

      nodeSubsystem.set(node.id, subsystem);
      if (!subsystemNodes.has(subsystem)) {
        subsystemNodes.set(subsystem, []);
      }
      subsystemNodes.get(subsystem)!.push(node);
    }

    // Calculate Afferent (Ca) and Efferent (Ce) coupling per subsystem
    const afferentMap = new Map<string, Set<string>>();
    const efferentMap = new Map<string, Set<string>>();

    for (const sub of subsystemNodes.keys()) {
      afferentMap.set(sub, new Set());
      efferentMap.set(sub, new Set());
    }

    const dependencyKinds = new Set(["calls", "imports", "extends", "implements", "references"]);

    for (const edge of edges) {
      if (!dependencyKinds.has(edge.kind)) continue;
      const srcSub = nodeSubsystem.get(edge.srcId);
      const dstSub = nodeSubsystem.get(edge.dstId);

      if (srcSub && dstSub && srcSub !== dstSub) {
        // Outbound for src
        efferentMap.get(srcSub)?.add(dstSub);
        // Inbound for dst
        afferentMap.get(dstSub)?.add(srcSub);
      }
    }

    const subsystemCouplings: SubsystemCoupling[] = [];
    for (const [sub, subNodeList] of subsystemNodes.entries()) {
      const ca = afferentMap.get(sub)?.size ?? 0;
      const ce = efferentMap.get(sub)?.size ?? 0;
      const total = ca + ce;
      const instability = total === 0 ? 0 : Math.round((ce / total) * 100) / 100;

      subsystemCouplings.push({
        subsystem: sub,
        afferentCoupling: ca,
        efferentCoupling: ce,
        instability,
        nodeCount: subNodeList.length,
      });
    }

    // Identify God Nodes (symbols with high total degree)
    const degreeMap = new Map<string, number>();
    for (const n of nodes) degreeMap.set(n.id, 0);
    for (const e of edges) {
      if (dependencyKinds.has(e.kind)) {
        degreeMap.set(e.srcId, (degreeMap.get(e.srcId) ?? 0) + 1);
        degreeMap.set(e.dstId, (degreeMap.get(e.dstId) ?? 0) + 1);
      }
    }

    const degrees = Array.from(degreeMap.values()).sort((a, b) => b - a);
    const p90 = degrees.length > 0 ? degrees[Math.floor(degrees.length * 0.1)] ?? 5 : 5;
    const godThreshold = Math.max(8, p90);

    const godNodes = nodes
      .filter((n) => n.kind !== "file" && (degreeMap.get(n.id) ?? 0) >= godThreshold)
      .map((n) => ({
        node: n,
        degree: degreeMap.get(n.id) ?? 0,
        role: "Central Hub / God Symbol",
      }))
      .slice(0, 5);

    // Compute Overall Health Score (0 - 100)
    let score = 100;

    // Deduct for cycles (10 points per cycle, max 35)
    const cycleDeduction = Math.min(35, cycles.length * 10);
    score -= cycleDeduction;

    // Deduct for orphans ratio (max 25)
    const nonFileNodes = nodes.filter((n) => n.kind !== "file");
    const orphanRatio = nonFileNodes.length > 0 ? orphans.length / nonFileNodes.length : 0;
    const orphanDeduction = Math.min(25, Math.round(orphanRatio * 50));
    score -= orphanDeduction;

    // Deduct for high god nodes density (max 15)
    const godDeduction = Math.min(15, godNodes.length * 3);
    score -= godDeduction;

    score = Math.max(10, Math.min(100, score));

    let grade: "A" | "B" | "C" | "D" | "F" = "F";
    if (score >= 90) grade = "A";
    else if (score >= 80) grade = "B";
    else if (score >= 70) grade = "C";
    else if (score >= 60) grade = "D";

    return {
      score,
      grade,
      totalCycles: cycles.length,
      cycles,
      totalOrphans: orphans.length,
      orphans,
      subsystemCouplings,
      godNodes,
    };
  }

  /**
   * Finds the shortest call/dependency path between a Source Node and a Target Node
   * using Dijkstra's algorithm weighted by Bayesian edge confidence (-ln(p)).
   */
  public static findPath(
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): PathResult {
    return DijkstraEngine.findShortestPath(sourceId, targetId, nodes, edges);
  }

  /**
   * Finds the top K alternative shortest paths between source and target using Yen's algorithm.
   */
  public static findKPaths(
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    k = 3,
  ): KPathResult {
    return DijkstraEngine.findKShortestPaths(sourceId, targetId, nodes, edges, k);
  }

  /**
   * Computes Single-Source Shortest Path (SSSP) Dijkstra horizon from originId.
   */
  public static computeDijkstraHorizon(
    originId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    maxHops = 4,
    minConfidence = 0.05,
  ): DijkstraHorizonResult {
    return DijkstraEngine.computeDijkstraHorizon(originId, nodes, edges, maxHops, minConfidence);
  }
}
