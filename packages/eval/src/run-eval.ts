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

    console.log("\n[STATISTICAL RIGOR]");
    console.log(`- Paired Wilcoxon signed-rank test p-value: ${report.pValueFullVsBm25.toExponential(4)}`);
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
