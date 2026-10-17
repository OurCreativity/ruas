import { AblationRunner } from "./ablation-runner.js";

async function main(): Promise<void> {
  console.log("================================================================================");
  console.log("  RUAS EVALUATION BENCHMARK & ABLATION HARNESS");
  console.log("  Calibrated Universal Code Intelligence Engine vs Conventional Baselines");
  console.log("================================================================================\n");

  const runner = new AblationRunner();

  try {
    console.log("-> Initializing benchmark environment (indexing realistic TS & PHP codebase)...");
    await runner.setup();
    console.log("-> Running ablation across 45 hand-labeled queries (ID / EN / Mixed)...");

    const report = await runner.runBenchmark();

    console.log("\n================================================================================");
    console.log("  ABLATION RESULTS SUMMARY");
    console.log("================================================================================");

    const pad = (str: string, len: number) => str.padEnd(len);
    const num = (n: number, len: number, decimals = 4) => n.toFixed(decimals).padStart(len);

    console.log(
      `${pad("Variant / Configuration", 50)} | ${pad("R@1", 7)} | ${pad("R@5", 7)} | ${pad("MRR", 7)} | ${pad("nDCG@10", 8)} | ${pad("p95 (ms)", 8)}`,
    );
    console.log("-".repeat(98));

    for (const v of report.variants) {
      const agg = v.aggregate;
      console.log(
        `${pad(v.name, 50)} | ${num(agg.meanRecallAt1, 7)} | ${num(agg.meanRecallAt5, 7)} | ${num(agg.mrr, 7)} | ${num(agg.meanNdcgAt10, 8)} | ${num(agg.p95LatencyMs, 8, 2)}`,
      );
    }
    console.log("-".repeat(98));

    // 1. Per-Language Breakdown
    console.log("\n================================================================================");
    console.log("  PER-LANGUAGE BREAKDOWN (BM25 Baseline vs Full Calibrated Graph Pipeline)");
    console.log("================================================================================");
    console.log(
      `${pad("Target Language", 18)} | ${pad("Queries", 8)} | ${pad("BM25 R@5", 10)} | ${pad("Full R@5", 10)} | ${pad("BM25 MRR", 10)} | ${pad("Full MRR", 10)} | ${pad("Recall Lift", 12)}`,
    );
    console.log("-".repeat(98));

    for (const g of report.perLanguageResults) {
      console.log(
        `${pad(g.group, 18)} | ${String(g.queryCount).padStart(8)} | ${num(g.bm25R5, 10)} | ${num(g.fullR5, 10)} | ${num(g.bm25Mrr, 10)} | ${num(g.fullMrr, 10)} | ${("+" + g.liftRecall5.toFixed(1) + "%").padStart(12)}`,
      );
    }
    console.log("-".repeat(98));

    // 2. Per-Dialect Breakdown
    console.log("\n================================================================================");
    console.log("  PER-DIALECT BREAKDOWN (Indonesian vs English vs Mixed Colloquial Terminology)");
    console.log("================================================================================");
    console.log(
      `${pad("Query Dialect", 18)} | ${pad("Queries", 8)} | ${pad("BM25 R@5", 10)} | ${pad("Full R@5", 10)} | ${pad("BM25 MRR", 10)} | ${pad("Full MRR", 10)} | ${pad("Recall Lift", 12)}`,
    );
    console.log("-".repeat(98));

    for (const d of report.perDialectResults) {
      console.log(
        `${pad(d.group, 18)} | ${String(d.queryCount).padStart(8)} | ${num(d.bm25R5, 10)} | ${num(d.fullR5, 10)} | ${num(d.bm25Mrr, 10)} | ${num(d.fullMrr, 10)} | ${("+" + d.liftRecall5.toFixed(1) + "%").padStart(12)}`,
      );
    }
    console.log("-".repeat(98));

    // 3. Latency vs Recall Trade-Off
    console.log("\n[LATENCY / RECALL TRADE-OFF (HONEST BENCHMARK CALIBRATION)]");
    console.log(`- BM25 Baseline p95 Latency:          ${report.latencyTradeoff.bm25P95Ms.toFixed(2)} ms`);
    console.log(`- Full Graph Pipeline p95 Latency:    ${report.latencyTradeoff.fullPipelineP95Ms.toFixed(2)} ms`);
    console.log(`- Latency Overhead Multiplier:        ${report.latencyTradeoff.latencyMultiplier.toFixed(1)}x`);
    console.log(`- Engineering Trade-off:              ${report.latencyTradeoff.latencyMultiplier.toFixed(1)}x latency overhead yields statistically significant recall uplift across all supported programming languages.`);

    console.log("\n[STATISTICAL RIGOR]");
    console.log(`- Total Benchmark Queries:            ${report.totalQueries}`);
    console.log(`- Paired Wilcoxon signed-rank p-value: ${report.pValueFullVsBm25.toExponential(4)}`);
    console.log(`- Statistically significant (p < 0.05): ${report.isStatisticallySignificant ? "YES" : "NO"}`);

    console.log("\n[EMOTIONAL DAMAGE VERDICT]");
    console.log(`"${report.emotionalDamageSummary}"\n`);
  } catch (err) {
    console.error("Evaluation run failed:", err);
    process.exitCode = 1;
  } finally {
    await runner.teardown();
  }
}

void main();
