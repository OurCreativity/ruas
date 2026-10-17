import { describe, expect, it } from "vitest";
import {
  calculateNdcgAtK,
  calculateRecallAtK,
  calculateReciprocalRank,
  pairedWilcoxonSignedRankTest,
} from "../metrics.js";
import { AblationRunner } from "../ablation-runner.js";

describe("@ruas/eval Metric Calculations", () => {
  it("calculates Recall@k accurately", () => {
    const retrieved = ["symbolA", "symbolB", "symbolC", "symbolD"];
    const expected = ["symbolB", "symbolD"];

    // Top 1: ["symbolA"] -> 0/2
    expect(calculateRecallAtK(retrieved, expected, 1)).toBe(0);

    // Top 2: ["symbolA", "symbolB"] -> 1/2 = 0.5
    expect(calculateRecallAtK(retrieved, expected, 2)).toBe(0.5);

    // Top 4: ["symbolA", "symbolB", "symbolC", "symbolD"] -> 2/2 = 1.0
    expect(calculateRecallAtK(retrieved, expected, 4)).toBe(1.0);
  });

  it("calculates Reciprocal Rank (RR) accurately", () => {
    const expected = ["targetSymbol"];

    expect(calculateReciprocalRank(["targetSymbol", "other"], expected)).toBe(1.0);
    expect(calculateReciprocalRank(["other", "targetSymbol"], expected)).toBe(0.5);
    expect(calculateReciprocalRank(["other1", "other2", "targetSymbol"], expected)).toBe(1 / 3);
    expect(calculateReciprocalRank(["other1", "other2"], expected)).toBe(0);
  });

  it("calculates nDCG@k under binary relevance", () => {
    const expected = ["sym1", "sym2"];

    // Perfect ranking: top 2 are relevant -> nDCG = 1.0
    expect(calculateNdcgAtK(["sym1", "sym2", "sym3"], expected, 2)).toBe(1.0);

    // Suboptimal ranking: relevant at rank 2 and 3
    const score = calculateNdcgAtK(["sym3", "sym1", "sym2"], expected, 3);
    expect(score).toBeLessThan(1.0);
    expect(score).toBeGreaterThan(0.5);
  });

  it("computes Paired Wilcoxon signed-rank test", () => {
    const baseline = [0.1, 0.2, 0.0, 0.1, 0.0, 0.2, 0.1, 0.0, 0.1, 0.0];
    const improved = [0.9, 0.8, 0.7, 0.9, 0.8, 1.0, 0.7, 0.9, 0.8, 1.0];

    const result = pairedWilcoxonSignedRankTest(baseline, improved);
    expect(result.pValue).toBeLessThan(0.01);
    expect(result.isSignificant).toBe(true);
  });
});

describe("@ruas/eval End-to-End Ablation Benchmark", () => {
  it("executes ablation benchmark and confirms Full Pipeline superiority over BM25 (p < 0.05)", async () => {
    const runner = new AblationRunner();

    try {
      await runner.setup();
      const report = await runner.runBenchmark();

      expect(report.totalQueries).toBe(90);
      expect(report.variants.length).toBe(4);
      expect(report.perLanguageResults.length).toBeGreaterThanOrEqual(4);
      expect(report.perDialectResults.length).toBe(3);

      const bm25Agg = report.variants[0]!.aggregate;
      const fullAgg = report.variants[3]!.aggregate;

      // Full Pipeline must significantly beat pure BM25 on Recall@5 and MRR
      expect(fullAgg.meanRecallAt5).toBeGreaterThan(bm25Agg.meanRecallAt5);
      expect(fullAgg.mrr).toBeGreaterThan(bm25Agg.mrr);
      expect(report.pValueFullVsBm25).toBeLessThan(0.05);
      expect(report.isStatisticallySignificant).toBe(true);
      expect(report.emotionalDamageSummary).toContain("Ablation Analysis");
    } finally {
      await runner.teardown();
    }
  }, 90_000); // 90s timeout for complete 90-query 4-variant benchmark
});
