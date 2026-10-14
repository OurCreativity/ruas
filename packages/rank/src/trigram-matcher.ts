import type { NodeRecord } from "@ruas/core";

export interface FuzzyMatchResult {
  readonly node: NodeRecord;
  readonly similarity: number;
}

export class TrigramMatcher {
  public static generateTrigrams(text: string): readonly string[] {
    const padded = `$$${text.toLowerCase()}$$`;
    const trigrams: string[] = [];
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.push(padded.slice(i, i + 3));
    }
    return trigrams;
  }

  public static similarity(a: string, b: string): number {
    if (a.toLowerCase() === b.toLowerCase()) {
      return 1.0;
    }
    const triA = TrigramMatcher.generateTrigrams(a);
    const triB = TrigramMatcher.generateTrigrams(b);

    if (triA.length === 0 || triB.length === 0) {
      return 0.0;
    }

    const countsA = new Map<string, number>();
    for (const t of triA) {
      countsA.set(t, (countsA.get(t) ?? 0) + 1);
    }

    let intersection = 0;
    for (const t of triB) {
      const count = countsA.get(t);
      if (count && count > 0) {
        intersection += 1;
        countsA.set(t, count - 1);
      }
    }

    return (2.0 * intersection) / (triA.length + triB.length);
  }

  public static matchCandidates(
    queryWord: string,
    nodes: readonly NodeRecord[],
    threshold = 0.45,
  ): readonly FuzzyMatchResult[] {
    const results: FuzzyMatchResult[] = [];
    const query = queryWord.toLowerCase().trim();

    for (const node of nodes) {
      const nameSim = TrigramMatcher.similarity(query, node.name);
      const qnameSim = TrigramMatcher.similarity(query, node.qualifiedName);
      const maxSim = Math.max(nameSim, qnameSim);

      if (maxSim >= threshold) {
        results.push({
          node,
          similarity: maxSim,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results;
  }
}
