export interface RankedItem<T> {
  readonly item: T;
  readonly score: number;
}

export interface FusionResult<T> {
  readonly item: T;
  readonly rrfScore: number;
  readonly rankings: ReadonlyMap<string, number>; // systemName -> 1-based rank
}

export class ReciprocalRankFusion {
  private readonly k: number;

  constructor(k = 60) {
    this.k = k;
  }

  /**
   * Fuses multiple ranked result lists into a single consolidated ranking.
   * @param rankedSystems Map of system name -> list of items sorted by decreasing score.
   * @param idSelector Function extracting a unique string key per item.
   * @param weights Optional map of system name -> weight multiplier (default 1.0).
   */
  public fuse<T>(
    rankedSystems: ReadonlyMap<string, readonly T[]>,
    idSelector: (item: T) => string,
    weights?: ReadonlyMap<string, number>,
  ): readonly FusionResult<T>[] {
    const itemMap = new Map<string, T>();
    const itemRankings = new Map<string, Map<string, number>>();
    const scores = new Map<string, number>();

    for (const [systemName, items] of rankedSystems.entries()) {
      const weight = weights?.get(systemName) ?? 1.0;
      if (weight <= 0) continue;

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const id = idSelector(item);

        itemMap.set(id, item);

        let systemRanks = itemRankings.get(id);
        if (!systemRanks) {
          systemRanks = new Map<string, number>();
          itemRankings.set(id, systemRanks);
        }

        const rank1Based = i + 1;
        systemRanks.set(systemName, rank1Based);

        const currentScore = scores.get(id) ?? 0;
        scores.set(id, currentScore + weight * (1.0 / (this.k + rank1Based)));
      }
    }

    const results: FusionResult<T>[] = [];
    for (const [id, item] of itemMap.entries()) {
      const rrfScore = scores.get(id) ?? 0;
      const rankings = itemRankings.get(id) ?? new Map<string, number>();
      results.push({ item, rrfScore, rankings });
    }

    results.sort((a, b) => b.rrfScore - a.rrfScore);
    return results;
  }
}
