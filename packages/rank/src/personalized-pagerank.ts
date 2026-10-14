import type { EdgeRecord } from "@ruas/core";

export interface PprNodeScore {
  readonly nodeId: string;
  readonly score: number;
}

export interface PprOptions {
  readonly damping?: number; // default 0.85
  readonly maxIterations?: number; // default 20
  readonly epsilon?: number; // default 1e-5
}

export class PersonalizedPageRank {
  private readonly damping: number;
  private readonly maxIterations: number;
  private readonly epsilon: number;

  constructor(options?: PprOptions) {
    this.damping = options?.damping ?? 0.85;
    this.maxIterations = options?.maxIterations ?? 20;
    this.epsilon = options?.epsilon ?? 1e-5;
  }

  public compute(
    allNodeIds: readonly string[],
    edges: readonly EdgeRecord[],
    seeds: ReadonlyMap<string, number>, // nodeId -> lexical seed weight
  ): readonly PprNodeScore[] {
    const N = allNodeIds.length;
    if (N === 0) {
      return [];
    }

    // 1. Build Adjacency with Confidence Weighting
    // Map: srcId -> list of { dstId, weight }
    const outEdges = new Map<string, Array<{ dstId: string; weight: number }>>();
    const outWeights = new Map<string, number>();

    for (const edge of edges) {
      // Calculate Bayesian edge confidence weight
      const conf = (edge.alpha) / (edge.alpha + edge.beta);
      let typeMultiplier = 1.0;
      switch (edge.kind) {
        case "calls":
          typeMultiplier = 1.2;
          break;
        case "extends":
        case "implements":
          typeMultiplier = 1.1;
          break;
        case "imports":
          typeMultiplier = 1.0;
          break;
        case "contains":
          typeMultiplier = 0.8;
          break;
      }
      const weight = Math.max(0.01, conf * typeMultiplier);

      const list = outEdges.get(edge.srcId) ?? [];
      list.push({ dstId: edge.dstId, weight });
      outEdges.set(edge.srcId, list);

      outWeights.set(edge.srcId, (outWeights.get(edge.srcId) ?? 0) + weight);
    }

    // 2. Normalize Personalization Seed Vector
    let totalSeedWeight = 0;
    for (const w of seeds.values()) {
      totalSeedWeight += w;
    }

    const s = new Map<string, number>();
    if (totalSeedWeight > 0) {
      for (const [id, w] of seeds.entries()) {
        s.set(id, w / totalSeedWeight);
      }
    } else {
      // Fallback uniform distribution
      const uniform = 1.0 / N;
      for (const id of allNodeIds) {
        s.set(id, uniform);
      }
    }

    // 3. Initialize probability vector p0 = s
    let p = new Map<string, number>();
    for (const id of allNodeIds) {
      p.set(id, s.get(id) ?? 0);
    }

    // 4. Power Iterations
    for (let iter = 0; iter < this.maxIterations; iter++) {
      const nextP = new Map<string, number>();
      for (const id of allNodeIds) {
        // Base teleport contribution: (1 - d) * s(v)
        nextP.set(id, (1.0 - this.damping) * (s.get(id) ?? 0));
      }

      // Distribute transition probabilities
      let danglingSum = 0;

      for (const id of allNodeIds) {
        const prob = p.get(id) ?? 0;
        if (prob === 0) {
          continue;
        }

        const outs = outEdges.get(id);
        const totalOutWeight = outWeights.get(id) ?? 0;

        if (!outs || outs.length === 0 || totalOutWeight === 0) {
          danglingSum += prob;
        } else {
          for (const edge of outs) {
            const transfer = prob * (edge.weight / totalOutWeight);
            const currentDstProb = nextP.get(edge.dstId) ?? 0;
            nextP.set(edge.dstId, currentDstProb + this.damping * transfer);
          }
        }
      }

      // Distribute dangling mass according to personalization vector s
      if (danglingSum > 0) {
        for (const id of allNodeIds) {
          const added = this.damping * danglingSum * (s.get(id) ?? 0);
          nextP.set(id, (nextP.get(id) ?? 0) + added);
        }
      }

      // Check convergence L1 norm
      let diff = 0;
      for (const id of allNodeIds) {
        diff += Math.abs((nextP.get(id) ?? 0) - (p.get(id) ?? 0));
      }

      p = nextP;
      if (diff < this.epsilon) {
        break;
      }
    }

    // Format output sorted descending by score
    const results: PprNodeScore[] = [];
    for (const [nodeId, score] of p.entries()) {
      results.push({ nodeId, score });
    }
    results.sort((a, b) => b.score - a.score);

    return results;
  }
}
