/**
 * Information Retrieval evaluation metrics.
 * Implements Recall@k, Mean Reciprocal Rank (MRR), and Normalized Discounted Cumulative Gain (nDCG@k).
 * Clean-room implementation derived from standard IR textbook formulas.
 */

export interface QueryEvaluationResult {
  readonly queryId: string;
  readonly queryText: string;
  readonly lang: string;
  readonly expectedSymbols: readonly string[];
  readonly retrievedSymbols: readonly string[];
  readonly latencyMs: number;
  readonly recallAt1: number;
  readonly recallAt5: number;
  readonly recallAt10: number;
  readonly mrr: number;
  readonly ndcgAt10: number;
}

export interface AggregateMetrics {
  readonly totalQueries: number;
  readonly meanRecallAt1: number;
  readonly meanRecallAt5: number;
  readonly meanRecallAt10: number;
  readonly mrr: number;
  readonly meanNdcgAt10: number;
  readonly meanLatencyMs: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
}

/**
 * Calculates Recall@k for a ranked list against expected relevant symbols.
 * Formula: |Retrieved@k ∩ Relevant| / |Relevant|
 */
export function calculateRecallAtK(
  retrieved: readonly string[],
  expected: readonly string[],
  k: number,
): number {
  if (expected.length === 0) return 0;
  const topK = new Set(retrieved.slice(0, k));
  let matched = 0;
  for (const exp of expected) {
    if (topK.has(exp)) {
      matched++;
    }
  }
  return matched / expected.length;
}

/**
 * Calculates Reciprocal Rank (RR).
 * Formula: 1 / rank of first relevant symbol, or 0 if none found.
 */
export function calculateReciprocalRank(
  retrieved: readonly string[],
  expected: readonly string[],
): number {
  if (expected.length === 0) return 0;
  const expectedSet = new Set(expected);
  for (let i = 0; i < retrieved.length; i++) {
    const symbol = retrieved[i];
    if (symbol !== undefined && expectedSet.has(symbol)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Calculates Normalized Discounted Cumulative Gain at k (nDCG@k) under binary relevance.
 * Formula: DCG@k / IDCG@k
 * DCG@k = sum_{i=1}^k (rel_i / log2(i + 1))
 */
export function calculateNdcgAtK(
  retrieved: readonly string[],
  expected: readonly string[],
  k: number,
): number {
  if (expected.length === 0) return 0;
  const expectedSet = new Set(expected);

  let dcg = 0;
  const limit = Math.min(k, retrieved.length);
  for (let i = 0; i < limit; i++) {
    const symbol = retrieved[i];
    if (symbol !== undefined && expectedSet.has(symbol)) {
      dcg += 1 / Math.log2(i + 2); // i=0 -> log2(2) = 1
    }
  }

  // Calculate Ideal DCG (all relevant items at top positions)
  let idcg = 0;
  const idealLimit = Math.min(k, expected.length);
  for (let i = 0; i < idealLimit; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * Aggregates per-query evaluation results into macro averages and percentiles.
 */
export function aggregateMetrics(
  results: readonly QueryEvaluationResult[],
): AggregateMetrics {
  const n = results.length;
  if (n === 0) {
    return {
      totalQueries: 0,
      meanRecallAt1: 0,
      meanRecallAt5: 0,
      meanRecallAt10: 0,
      mrr: 0,
      meanNdcgAt10: 0,
      meanLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
    };
  }

  let sumR1 = 0;
  let sumR5 = 0;
  let sumR10 = 0;
  let sumMrr = 0;
  let sumNdcg = 0;
  let sumLatency = 0;
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

  for (const r of results) {
    sumR1 += r.recallAt1;
    sumR5 += r.recallAt5;
    sumR10 += r.recallAt10;
    sumMrr += r.mrr;
    sumNdcg += r.ndcgAt10;
    sumLatency += r.latencyMs;
  }

  const p50Index = Math.floor(n * 0.5);
  const p95Index = Math.min(n - 1, Math.floor(n * 0.95));

  return {
    totalQueries: n,
    meanRecallAt1: sumR1 / n,
    meanRecallAt5: sumR5 / n,
    meanRecallAt10: sumR10 / n,
    mrr: sumMrr / n,
    meanNdcgAt10: sumNdcg / n,
    meanLatencyMs: sumLatency / n,
    p50LatencyMs: latencies[p50Index] ?? 0,
    p95LatencyMs: latencies[p95Index] ?? 0,
  };
}

/**
 * Paired Wilcoxon Signed-Rank Test approximation or exact test for paired differences.
 * Computes the two-tailed p-value for whether method B is statistically significantly
 * superior to method A on metric scores (e.g. MRR).
 */
export function pairedWilcoxonSignedRankTest(
  scoresA: readonly number[],
  scoresB: readonly number[],
): { readonly statistic: number; readonly pValue: number; readonly isSignificant: boolean } {
  if (scoresA.length !== scoresB.length || scoresA.length === 0) {
    return { statistic: 0, pValue: 1.0, isSignificant: false };
  }

  // 1. Calculate non-zero differences
  const diffs: { diff: number; absDiff: number }[] = [];
  for (let i = 0; i < scoresA.length; i++) {
    const diff = (scoresB[i] ?? 0) - (scoresA[i] ?? 0);
    if (Math.abs(diff) > 1e-9) {
      diffs.push({ diff, absDiff: Math.abs(diff) });
    }
  }

  const n = diffs.length;
  if (n === 0) {
    return { statistic: 0, pValue: 1.0, isSignificant: false };
  }

  // 2. Rank absolute differences
  diffs.sort((a, b) => a.absDiff - b.absDiff);

  // Assign ranks with average rank for ties
  const ranks: number[] = new Array(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && Math.abs((diffs[j + 1]?.absDiff ?? 0) - (diffs[i]?.absDiff ?? 0)) < 1e-9) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranks[k] = avgRank;
    }
    i = j + 1;
  }

  // 3. Sum of positive and negative ranks
  let wPositive = 0;
  let wNegative = 0;
  for (let k = 0; k < n; k++) {
    const d = diffs[k]!;
    if (d.diff > 0) {
      wPositive += ranks[k]!;
    } else {
      wNegative += ranks[k]!;
    }
  }

  const w = Math.min(wPositive, wNegative);

  // For n >= 10, use normal approximation with continuity correction
  // Mean: mu_W = n * (n + 1) / 4
  // Variance: sigma_W = sqrt(n * (n + 1) * (2n + 1) / 24)
  const mu = (n * (n + 1)) / 4;
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);

  if (sigma === 0) {
    return { statistic: w, pValue: 1.0, isSignificant: false };
  }

  const z = (w - mu + 0.5) / sigma;
  // Standard normal two-tailed p-value via error function approximation
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  return {
    statistic: w,
    pValue,
    isSignificant: pValue < 0.05,
  };
}

/**
 * Standard Normal Cumulative Distribution Function approximation (Abramowitz and Stegun).
 */
function normalCdf(x: number): number {
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (x >= 0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp((-x * x) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
  const t = 1.0 / (1.0 - p * x);
  return c * Math.exp((-x * x) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
}
