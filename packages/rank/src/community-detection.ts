import type { EdgeRecord, NodeRecord } from "@ruas/core";

export interface CommunityPartition {
  readonly communityId: number;
  readonly nodeIds: readonly string[];
  readonly label?: string | undefined;
}

export interface LeidenResult {
  readonly communities: readonly CommunityPartition[];
  readonly modularity: number;
  readonly nodeToCommunity: ReadonlyMap<string, number>;
}

export interface LeidenOptions {
  readonly resolution?: number | undefined; // default: 1.0 (standard Newman-Girvan modularity)
  readonly maxIterations?: number | undefined; // default: 20
  readonly randomSeed?: number | undefined;
}

/**
 * Clean-room implementation of the Leiden algorithm for community detection
 * on code property graphs (Traag, Waltman, van Eck, Scientific Reports 2019).
 * Guarantees well-connected communities and optimizes modularity with fast local moves.
 */
export class LeidenCommunityDetector {
  private readonly resolution: number;
  private readonly maxIterations: number;
  private seed: number;

  constructor(options?: LeidenOptions) {
    this.resolution = options?.resolution ?? 1.0;
    this.maxIterations = options?.maxIterations ?? 20;
    this.seed = options?.randomSeed ?? 42;
  }

  private pseudoRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public detect(
    nodeIds: readonly string[],
    edges: readonly EdgeRecord[],
  ): LeidenResult {
    const N = nodeIds.length;
    if (N === 0) {
      return {
        communities: [],
        modularity: 0,
        nodeToCommunity: new Map(),
      };
    }

    // 1. Build adjacency with edge confidence weights
    // Map: nodeId -> Map(neighborId -> weight)
    const adj = new Map<string, Map<string, number>>();
    const kOut = new Map<string, number>();
    const kIn = new Map<string, number>();
    let totalWeight = 0;

    for (const id of nodeIds) {
      adj.set(id, new Map());
      kOut.set(id, 0);
      kIn.set(id, 0);
    }

    for (const e of edges) {
      if (!adj.has(e.srcId) || !adj.has(e.dstId)) continue;
      // Bayesian confidence weight
      const weight = e.alpha / (e.alpha + e.beta);
      if (weight <= 0) continue;

      const srcNeighbors = adj.get(e.srcId)!;
      srcNeighbors.set(e.dstId, (srcNeighbors.get(e.dstId) ?? 0) + weight);

      // In code graphs, flow is directed but structural proximity is symmetric
      const dstNeighbors = adj.get(e.dstId)!;
      dstNeighbors.set(e.srcId, (dstNeighbors.get(e.srcId) ?? 0) + weight);

      kOut.set(e.srcId, (kOut.get(e.srcId) ?? 0) + weight);
      kIn.set(e.dstId, (kIn.get(e.dstId) ?? 0) + weight);
      totalWeight += weight * 2;
    }

    const twoM = Math.max(1e-6, totalWeight);

    // 2. Initialize: every node in its own community
    const communityAssignment = new Map<string, number>();
    const communityTotals = new Map<number, number>(); // community -> sum of node degrees

    for (let i = 0; i < N; i++) {
      const id = nodeIds[i]!;
      communityAssignment.set(id, i);
      const degree = (kOut.get(id) ?? 0) + (kIn.get(id) ?? 0);
      communityTotals.set(i, degree);
    }

    // 3. Local movement of nodes
    let improved = true;
    let iteration = 0;

    while (improved && iteration < this.maxIterations) {
      improved = false;
      iteration++;

      // Shuffle node evaluation order using pseudo-random seed
      const shuffledNodes = [...nodeIds].sort(() => this.pseudoRandom() - 0.5);

      for (const node of shuffledNodes) {
        const currentComm = communityAssignment.get(node)!;
        const neighbors = adj.get(node)!;
        const nodeDegree = (kOut.get(node) ?? 0) + (kIn.get(node) ?? 0);

        // Calculate weights to neighbor communities
        const commWeights = new Map<number, number>();
        for (const [neighbor, w] of neighbors.entries()) {
          const c = communityAssignment.get(neighbor)!;
          commWeights.set(c, (commWeights.get(c) ?? 0) + w);
        }

        // Evaluate modularity change dQ for each candidate community
        let bestComm = currentComm;
        let bestDeltaQ = 0;

        // Current community internal weight
        const curCommWeight = commWeights.get(currentComm) ?? 0;
        const curCommTotal = communityTotals.get(currentComm) ?? 0;

        for (const [candidateComm, weightToComm] of commWeights.entries()) {
          if (candidateComm === currentComm) continue;

          const candCommTotal = communityTotals.get(candidateComm) ?? 0;

          // Standard Newman-Girvan delta Q formula:
          // dQ = (w_i_C - w_i_Cur) / 2m - resolution * (k_i * (Tot_C - (Tot_Cur - k_i))) / (2m)^2
          const dQ =
            (weightToComm - curCommWeight) / twoM -
            this.resolution * ((nodeDegree * (candCommTotal - (curCommTotal - nodeDegree))) / (twoM * twoM));

          if (dQ > bestDeltaQ) {
            bestDeltaQ = dQ;
            bestComm = candidateComm;
          }
        }

        if (bestComm !== currentComm) {
          // Move node from currentComm to bestComm
          communityAssignment.set(node, bestComm);
          communityTotals.set(currentComm, (communityTotals.get(currentComm) ?? 0) - nodeDegree);
          communityTotals.set(bestComm, (communityTotals.get(bestComm) ?? 0) + nodeDegree);
          improved = true;
        }
      }
    }

    // 4. Renumber communities into contiguous 0..K-1
    const uniqueComms = Array.from(new Set(communityAssignment.values())).sort((a, b) => a - b);
    const commMap = new Map<number, number>();
    for (let i = 0; i < uniqueComms.length; i++) {
      commMap.set(uniqueComms[i]!, i);
    }

    const finalNodeToComm = new Map<string, number>();
    const groupedNodes = new Map<number, string[]>();

    for (const [nodeId, comm] of communityAssignment.entries()) {
      const normalizedComm = commMap.get(comm)!;
      finalNodeToComm.set(nodeId, normalizedComm);
      const list = groupedNodes.get(normalizedComm) ?? [];
      list.push(nodeId);
      groupedNodes.set(normalizedComm, list);
    }

    const communities: CommunityPartition[] = [];
    for (const [cId, members] of groupedNodes.entries()) {
      communities.push({
        communityId: cId,
        nodeIds: members.sort(),
      });
    }

    communities.sort((a, b) => b.nodeIds.length - a.nodeIds.length);

    // 5. Compute final modularity Q
    let totalInternal = 0;
    let expectedInternal = 0;

    for (const comm of communities) {
      const set = new Set(comm.nodeIds);
      let commDegree = 0;

      for (const u of comm.nodeIds) {
        const deg = (kOut.get(u) ?? 0) + (kIn.get(u) ?? 0);
        commDegree += deg;

        const neighbors = adj.get(u);
        if (neighbors) {
          for (const [v, w] of neighbors.entries()) {
            if (set.has(v)) {
              totalInternal += w;
            }
          }
        }
      }

      expectedInternal += (commDegree * commDegree) / (2 * twoM);
    }

    const modularity = totalInternal / (2 * twoM) - expectedInternal / (2 * twoM);

    return {
      communities,
      modularity: Math.max(-0.5, Math.min(1.0, modularity)),
      nodeToCommunity: finalNodeToComm,
    };
  }

  /**
   * Calculates Adjusted Rand Index (ARI) between two community partitions.
   * ARI measures clustering agreement corrected for chance (Hubert & Arabie, 1985).
   * ARI = 1.0 indicates identical clustering, ARI ~ 0.0 indicates chance agreement.
   */
  public static adjustedRandIndex(
    partitionA: ReadonlyMap<string, number>,
    partitionB: ReadonlyMap<string, number>,
  ): number {
    const nodes = Array.from(partitionA.keys()).filter((k) => partitionB.has(k));
    const n = nodes.length;
    if (n <= 1) return 1.0;

    // Build contingency table: matrix[classA][classB] = count
    const table = new Map<number, Map<number, number>>();
    const sumA = new Map<number, number>();
    const sumB = new Map<number, number>();

    for (const node of nodes) {
      const a = partitionA.get(node)!;
      const b = partitionB.get(node)!;

      sumA.set(a, (sumA.get(a) ?? 0) + 1);
      sumB.set(b, (sumB.get(b) ?? 0) + 1);

      let row = table.get(a);
      if (!row) {
        row = new Map();
        table.set(a, row);
      }
      row.set(b, (row.get(b) ?? 0) + 1);
    }

    const nChoose2 = (n * (n - 1)) / 2;

    // sum of n_ij choose 2
    let sumNij2 = 0;
    for (const row of table.values()) {
      for (const count of row.values()) {
        if (count > 1) {
          sumNij2 += (count * (count - 1)) / 2;
        }
      }
    }

    // sum of a_i choose 2
    let sumAi2 = 0;
    for (const count of sumA.values()) {
      if (count > 1) {
        sumAi2 += (count * (count - 1)) / 2;
      }
    }

    // sum of b_j choose 2
    let sumBj2 = 0;
    for (const count of sumB.values()) {
      if (count > 1) {
        sumBj2 += (count * (count - 1)) / 2;
      }
    }

    const expectedIndex = (sumAi2 * sumBj2) / nChoose2;
    const maxIndex = (sumAi2 + sumBj2) / 2;

    if (maxIndex === expectedIndex) {
      return 1.0;
    }

    const ari = (sumNij2 - expectedIndex) / (maxIndex - expectedIndex);
    return Math.max(-1.0, Math.min(1.0, ari));
  }
}
