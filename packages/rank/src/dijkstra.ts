import type {
  DijkstraHorizonNode,
  DijkstraHorizonResult,
  EdgeRecord,
  KPathResult,
  NodeRecord,
  PathResult,
} from "@ruas/core";

interface QueueItem<T> {
  readonly element: T;
  readonly priority: number;
}

/**
 * High-performance Binary Min-Heap Priority Queue for Dijkstra's algorithm.
 * Guarantees O(log V) push and pop operations.
 */
export class MinPriorityQueue<T> {
  private heap: QueueItem<T>[] = [];

  public get size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public push(element: T, priority: number): void {
    this.heap.push({ element, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0]!.element;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(idx: number): void {
    const item = this.heap[idx]!;
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx]!;
      if (item.priority >= parent.priority) break;
      this.heap[idx] = parent;
      this.heap[parentIdx] = item;
      idx = parentIdx;
    }
  }

  private sinkDown(idx: number): void {
    const length = this.heap.length;
    const item = this.heap[idx]!;
    while (true) {
      const leftChildIdx = 2 * idx + 1;
      const rightChildIdx = 2 * idx + 2;
      let swapIdx: number | null = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx]!.priority < item.priority) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const rightPriority = this.heap[rightChildIdx]!.priority;
        const currentMin = swapIdx === null ? item.priority : this.heap[leftChildIdx]!.priority;
        if (rightPriority < currentMin) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[idx] = this.heap[swapIdx]!;
      this.heap[swapIdx] = item;
      idx = swapIdx;
    }
  }
}

export interface DijkstraEdge {
  readonly target: string;
  readonly edge: EdgeRecord;
  readonly weight: number;
}

/**
 * Dijkstra Code Property Graph Engine.
 *
 * Mathematical Foundations:
 * Given a directed code property graph G = (V, E) where each edge e has posterior
 * Bayesian probability p(e) = alpha / (alpha + beta) in (0, 1].
 * The joint probability of a call chain e_1, e_2, ... e_k is P = product(p(e_i)).
 *
 * By mapping weight w(e) = -ln(p(e)) >= 0, minimizing path weight sum(w(e_i))
 * is mathematically equivalent to maximizing joint Bayesian confidence:
 *   min sum(-ln(p_i)) = min(-ln(product(p_i))) <=> max product(p_i)
 *
 * This satisfies Dijkstra's non-negative edge weight prerequisite strictly.
 */
export class DijkstraEngine {
  private static readonly DEPENDENCY_KINDS = new Set([
    "calls",
    "imports",
    "extends",
    "implements",
    "references",
    "contains",
  ]);

  /**
   * Builds an adjacency list with Bayesian negative log-likelihood edge weights.
   */
  public static buildAdjacencyList(
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    excludedEdgeIds: ReadonlySet<string> = new Set(),
  ): Map<string, DijkstraEdge[]> {
    const nodeMap = new Map<string, NodeRecord>(nodes.map((n) => [n.id, n]));
    const adj = new Map<string, DijkstraEdge[]>();

    for (const n of nodes) {
      adj.set(n.id, []);
    }

    for (const e of edges) {
      if (excludedEdgeIds.has(e.id)) continue;
      if (DijkstraEngine.DEPENDENCY_KINDS.has(e.kind) && adj.has(e.srcId) && nodeMap.has(e.dstId)) {
        const p = e.alpha / (e.alpha + e.beta);
        const cost = Math.max(0.001, -Math.log(Math.max(0.001, p)));
        adj.get(e.srcId)!.push({ target: e.dstId, edge: e, weight: cost });
      }
    }

    return adj;
  }

  /**
   * Finds the shortest directed path between source and target using O((V + E) log V) Dijkstra.
   */
  public static findShortestPath(
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    excludedEdgeIds: ReadonlySet<string> = new Set(),
  ): PathResult {
    const nodeMap = new Map<string, NodeRecord>(nodes.map((n) => [n.id, n]));
    const srcNode = nodeMap.get(sourceId);
    const dstNode = nodeMap.get(targetId);

    if (!srcNode || !dstNode) {
      throw new Error(`Source or Target node not found in graph.`);
    }

    if (sourceId === targetId) {
      return {
        sourceNode: srcNode,
        targetNode: dstNode,
        found: true,
        path: [{ node: srcNode }],
        cumulativeConfidence: 1.0,
        hops: 0,
      };
    }

    const adj = DijkstraEngine.buildAdjacencyList(nodes, edges, excludedEdgeIds);

    const dist = new Map<string, number>();
    const prev = new Map<string, { prevNodeId: string; edge: EdgeRecord }>();
    const visited = new Set<string>();

    for (const n of nodes) {
      dist.set(n.id, Infinity);
    }
    dist.set(sourceId, 0);

    const pq = new MinPriorityQueue<string>();
    pq.push(sourceId, 0);

    while (!pq.isEmpty()) {
      const u = pq.pop()!;
      if (visited.has(u)) continue;
      visited.add(u);

      if (u === targetId) break;

      const currentDist = dist.get(u) ?? Infinity;
      const neighbors = adj.get(u) ?? [];

      for (const { target: v, edge, weight } of neighbors) {
        if (visited.has(v)) continue;
        const newDist = currentDist + weight;
        if (newDist < (dist.get(v) ?? Infinity)) {
          dist.set(v, newDist);
          prev.set(v, { prevNodeId: u, edge });
          pq.push(v, newDist);
        }
      }
    }

    if (!prev.has(targetId)) {
      return {
        sourceNode: srcNode,
        targetNode: dstNode,
        found: false,
        path: [],
        cumulativeConfidence: 0,
        hops: 0,
      };
    }

    // Reconstruct path
    const pathNodes: { node: NodeRecord; edgeToNext?: EdgeRecord | undefined; confidence?: number | undefined }[] = [];
    let curr = targetId;
    let cumulativeProb = 1.0;

    const sequence: { node: NodeRecord; edge: EdgeRecord; conf: number }[] = [];
    while (curr !== sourceId) {
      const step = prev.get(curr);
      if (!step) break;
      const node = nodeMap.get(curr)!;
      const p = step.edge.alpha / (step.edge.alpha + step.edge.beta);
      cumulativeProb *= p;
      sequence.unshift({ node, edge: step.edge, conf: p });
      curr = step.prevNodeId;
    }

    if (sequence.length > 0) {
      pathNodes.push({
        node: srcNode,
        edgeToNext: sequence[0]?.edge,
        confidence: sequence[0]?.conf,
      });

      for (let i = 0; i < sequence.length; i++) {
        const item = sequence[i]!;
        const nextItem = sequence[i + 1];
        if (nextItem) {
          pathNodes.push({
            node: item.node,
            edgeToNext: nextItem.edge,
            confidence: nextItem.conf,
          });
        } else {
          pathNodes.push({
            node: item.node,
          });
        }
      }
    } else {
      pathNodes.push({ node: srcNode });
    }

    return {
      sourceNode: srcNode,
      targetNode: dstNode,
      found: true,
      path: pathNodes,
      cumulativeConfidence: Math.round(cumulativeProb * 1000) / 1000,
      hops: sequence.length,
      cost: Math.round((dist.get(targetId) ?? 0) * 1000) / 1000,
    };
  }

  /**
   * Finds the top K alternative shortest paths between source and target
   * using a modified Yen's K-Shortest Path algorithm.
   */
  public static findKShortestPaths(
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    k = 3,
  ): KPathResult {
    const nodeMap = new Map<string, NodeRecord>(nodes.map((n) => [n.id, n]));
    const srcNode = nodeMap.get(sourceId);
    const dstNode = nodeMap.get(targetId);

    if (!srcNode || !dstNode) {
      throw new Error(`Source or Target node not found.`);
    }

    const firstPath = DijkstraEngine.findShortestPath(sourceId, targetId, nodes, edges);
    if (!firstPath.found) {
      return {
        sourceNode: srcNode,
        targetNode: dstNode,
        paths: [],
        totalPathsFound: 0,
        found: false,
      };
    }

    const A: PathResult[] = [firstPath];
    const candidatePaths: PathResult[] = [];

    for (let kIdx = 1; kIdx < k; kIdx++) {
      const prev = A[kIdx - 1];
      if (!prev) break;

      // The spur node ranges from the first node up to the second-to-last node in the previous path
      for (let i = 0; i < prev.path.length - 1; i++) {
        const spurNode = prev.path[i]!.node;
        const rootPath = prev.path.slice(0, i + 1);

        const excludedEdges = new Set<string>();

        // 1. For each path in A that shares the same rootPath up to i, remove the next edge
        for (const p of A) {
          if (p.path.length > i + 1) {
            let matches = true;
            for (let r = 0; r <= i; r++) {
              if (p.path[r]!.node.id !== rootPath[r]!.node.id) {
                matches = false;
                break;
              }
            }
            if (matches && p.path[i]?.edgeToNext) {
              excludedEdges.add(p.path[i]!.edgeToNext!.id);
            }
          }
        }

        // 2. Nodes in rootPath (except spurNode) should not be revisited
        const rootNodeIds = new Set(rootPath.slice(0, i).map((r) => r.node.id));
        const nodesForSpur = nodes.filter((n) => !rootNodeIds.has(n.id));

        try {
          const spurPath = DijkstraEngine.findShortestPath(
            spurNode.id,
            targetId,
            nodesForSpur,
            edges,
            excludedEdges,
          );

          if (spurPath.found && spurPath.path.length > 1) {
            const combinedSteps: {
              node: NodeRecord;
              edgeToNext?: EdgeRecord | undefined;
              confidence?: number | undefined;
            }[] = [];

            // Add root steps up to i - 1
            for (let r = 0; r < i; r++) {
              combinedSteps.push({
                node: rootPath[r]!.node,
                edgeToNext: rootPath[r]!.edgeToNext,
                confidence: rootPath[r]!.confidence,
              });
            }

            // Add spur path
            for (let s = 0; s < spurPath.path.length; s++) {
              combinedSteps.push({
                node: spurPath.path[s]!.node,
                edgeToNext: spurPath.path[s]!.edgeToNext,
                confidence: spurPath.path[s]!.confidence,
              });
            }

            let cumProb = 1.0;
            for (const step of combinedSteps) {
              if (step.confidence !== undefined) {
                cumProb *= step.confidence;
              }
            }

            const candidate: PathResult = {
              sourceNode: srcNode,
              targetNode: dstNode,
              found: true,
              path: combinedSteps,
              cumulativeConfidence: Math.round(cumProb * 1000) / 1000,
              hops: combinedSteps.length - 1,
              cost: Math.round(-Math.log(Math.max(1e-6, cumProb)) * 1000) / 1000,
            };

            const sig = candidate.path.map((s) => s.node.id).join("->");
            if (
              !A.some((p) => p.path.map((s) => s.node.id).join("->") === sig) &&
              !candidatePaths.some((p) => p.path.map((s) => s.node.id).join("->") === sig)
            ) {
              candidatePaths.push(candidate);
            }
          }
        } catch {
          // No spur path possible from this spur node
        }
      }

      if (candidatePaths.length === 0) break;

      // Sort candidate paths by highest cumulative confidence (lowest distance)
      candidatePaths.sort((a, b) => b.cumulativeConfidence - a.cumulativeConfidence);
      const bestCandidate = candidatePaths.shift()!;
      A.push(bestCandidate);
    }

    return {
      sourceNode: srcNode,
      targetNode: dstNode,
      paths: A,
      totalPathsFound: A.length,
      found: A.length > 0,
    };
  }

  /**
   * Computes Single-Source Shortest Path (SSSP) Dijkstra horizon from originId.
   * Returns all reachable nodes ordered by Dijkstra distance (decreasing Bayesian probability).
   */
  public static computeDijkstraHorizon(
    originId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    maxHops = 4,
    minConfidence = 0.05,
  ): DijkstraHorizonResult {
    const nodeMap = new Map<string, NodeRecord>(nodes.map((n) => [n.id, n]));
    const originNode = nodeMap.get(originId);

    if (!originNode) {
      throw new Error(`Origin node '${originId}' not found.`);
    }

    const adj = DijkstraEngine.buildAdjacencyList(nodes, edges);

    const dist = new Map<string, number>();
    const hops = new Map<string, number>();
    const visited = new Set<string>();

    for (const n of nodes) {
      dist.set(n.id, Infinity);
      hops.set(n.id, 0);
    }
    dist.set(originId, 0);

    const pq = new MinPriorityQueue<string>();
    pq.push(originId, 0);

    while (!pq.isEmpty()) {
      const u = pq.pop()!;
      if (visited.has(u)) continue;
      visited.add(u);

      const d = dist.get(u) ?? Infinity;
      const h = hops.get(u) ?? 0;

      if (h >= maxHops) continue;

      const neighbors = adj.get(u) ?? [];
      for (const { target: v, weight } of neighbors) {
        if (visited.has(v)) continue;
        const newDist = d + weight;
        const prob = Math.exp(-newDist);
        if (prob < minConfidence) continue;

        if (newDist < (dist.get(v) ?? Infinity)) {
          dist.set(v, newDist);
          hops.set(v, h + 1);
          pq.push(v, newDist);
        }
      }
    }

    const horizonNodes: DijkstraHorizonNode[] = [];
    for (const [id, distance] of dist.entries()) {
      if (id === originId || distance === Infinity) continue;
      const node = nodeMap.get(id);
      if (!node) continue;
      const prob = Math.exp(-distance);
      horizonNodes.push({
        node,
        distance: Math.round(distance * 1000) / 1000,
        cumulativeConfidence: Math.round(prob * 1000) / 1000,
        hops: hops.get(id) ?? 1,
      });
    }

    horizonNodes.sort((a, b) => a.distance - b.distance);

    return {
      origin: originNode,
      reachableCount: horizonNodes.length,
      horizon: horizonNodes,
    };
  }
}
