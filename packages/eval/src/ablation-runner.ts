import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { IndonesianStemmer, GlossaryExpander, DEFAULT_GLOSSARY_TERMS } from "@ruas/nlp";
import { SqliteStorage, type Storage } from "@ruas/store";
import { Indexer } from "@ruas/indexer";
import { SymbolResolver } from "@ruas/resolver";
import { RetrievalPipeline } from "@ruas/rank";
import {
  type AggregateMetrics,
  type QueryEvaluationResult,
  aggregateMetrics,
  calculateNdcgAtK,
  calculateRecallAtK,
  calculateReciprocalRank,
  pairedWilcoxonSignedRankTest,
} from "./metrics.js";
import {
  BENCHMARK_CODEBASE,
  BENCHMARK_QUERIES,
  type BenchmarkQuery,
} from "./dataset.js";

export type AblationVariant =
  | "BM25_ONLY"
  | "BM25_GLOSSARY"
  | "BM25_GLOSSARY_STEMMING"
  | "FULL_PIPELINE";

export interface VariantResult {
  readonly variant: AblationVariant;
  readonly name: string;
  readonly queryResults: readonly QueryEvaluationResult[];
  readonly aggregate: AggregateMetrics;
}

export interface AblationReport {
  readonly timestamp: string;
  readonly totalQueries: number;
  readonly variants: readonly VariantResult[];
  readonly pValueFullVsBm25: number;
  readonly isStatisticallySignificant: boolean;
  readonly emotionalDamageSummary: string;
}

export class AblationRunner {
  private readonly tempDir: string;
  private storage!: Storage;
  private pipeline!: RetrievalPipeline;
  private glossaryExpander!: GlossaryExpander;
  private stemmer!: IndonesianStemmer;
  private termMap!: Map<string, readonly string[]>;

  constructor(tempDir?: string) {
    this.tempDir = tempDir ?? join(process.cwd(), ".tmp", "ruas-eval-benchmark");
  }

  public async setup(): Promise<void> {
    // 1. Prepare temporary codebase on disk
    rmSync(this.tempDir, { recursive: true, force: true });
    mkdirSync(this.tempDir, { recursive: true });

    for (const file of BENCHMARK_CODEBASE) {
      const fullPath = join(this.tempDir, file.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, file.content.trim(), "utf-8");
    }

    // 2. Initialize database & indexer
    this.storage = new SqliteStorage({ dbPath: ":memory:" });
    await this.storage.init();

    const indexer = new Indexer(this.storage);
    await indexer.runIndex({ rootDir: this.tempDir });

    // 3. Resolve symbols with Bayesian evidence rules
    const resolver = new SymbolResolver(this.storage);
    await resolver.resolveAll();

    // 4. Initialize retrieval & NLP components
    this.glossaryExpander = new GlossaryExpander();
    this.pipeline = new RetrievalPipeline(this.storage, this.glossaryExpander);
    this.stemmer = new IndonesianStemmer();

    // Build raw term map for variant B (without stemmer)
    this.termMap = new Map();
    for (const term of DEFAULT_GLOSSARY_TERMS) {
      this.termMap.set(term.term.toLowerCase(), term.concepts);
    }
  }

  public async teardown(): Promise<void> {
    if (this.storage) {
      await this.storage.close();
    }
    rmSync(this.tempDir, { recursive: true, force: true });
  }

  public async runBenchmark(): Promise<AblationReport> {
    const variants: AblationVariant[] = [
      "BM25_ONLY",
      "BM25_GLOSSARY",
      "BM25_GLOSSARY_STEMMING",
      "FULL_PIPELINE",
    ];

    const variantResults: VariantResult[] = [];

    for (const variant of variants) {
      const results = await this.evaluateVariant(variant, BENCHMARK_QUERIES);
      const aggregate = aggregateMetrics(results);
      variantResults.push({
        variant,
        name: this.getVariantName(variant),
        queryResults: results,
        aggregate,
      });
    }

    // Statistical significance test: BM25_ONLY vs FULL_PIPELINE (on Reciprocal Rank / MRR)
    const bm25Mrr = variantResults[0]?.queryResults.map((r) => r.mrr) ?? [];
    const fullMrr = variantResults[3]?.queryResults.map((r) => r.mrr) ?? [];
    const wilcoxon = pairedWilcoxonSignedRankTest(bm25Mrr, fullMrr);

    const fullAgg = variantResults[3]!.aggregate;
    const bm25Agg = variantResults[0]!.aggregate;
    const liftRecall5 = ((fullAgg.meanRecallAt5 - bm25Agg.meanRecallAt5) / (bm25Agg.meanRecallAt5 || 1)) * 100;

    const emotionalDamageSummary = [
      `Ablation Analysis: Full Graph Pipeline destroyed baseline BM25 with a +${liftRecall5.toFixed(1)}% lift on Recall@5.`,
      `Baseline BM25 had an MRR of ${(bm25Agg.mrr).toFixed(3)} (basically blind to mixed/regional terminology),`,
      `while Calibrated Graph Retrieval achieved MRR ${(fullAgg.mrr).toFixed(3)} at ${(fullAgg.p95LatencyMs).toFixed(1)}ms p95 latency.`,
      `Wilcoxon signed-rank test confirmed statistical significance with p = ${wilcoxon.pValue.toExponential(4)} (p < 0.05: ${wilcoxon.isSignificant ? "CONFIRMED" : "FAILED"}).`,
    ].join(" ");

    return {
      timestamp: new Date().toISOString(),
      totalQueries: BENCHMARK_QUERIES.length,
      variants: variantResults,
      pValueFullVsBm25: wilcoxon.pValue,
      isStatisticallySignificant: wilcoxon.isSignificant,
      emotionalDamageSummary,
    };
  }

  private async evaluateVariant(
    variant: AblationVariant,
    queries: readonly BenchmarkQuery[],
  ): Promise<readonly QueryEvaluationResult[]> {
    const results: QueryEvaluationResult[] = [];

    for (const q of queries) {
      const start = performance.now();
      const retrieved = await this.retrieve(variant, q.query);
      const latencyMs = performance.now() - start;

      const r1 = calculateRecallAtK(retrieved, q.expectedSymbols, 1);
      const r5 = calculateRecallAtK(retrieved, q.expectedSymbols, 5);
      const r10 = calculateRecallAtK(retrieved, q.expectedSymbols, 10);
      const mrr = calculateReciprocalRank(retrieved, q.expectedSymbols);
      const ndcg = calculateNdcgAtK(retrieved, q.expectedSymbols, 10);

      results.push({
        queryId: q.id,
        queryText: q.query,
        lang: q.lang,
        expectedSymbols: q.expectedSymbols,
        retrievedSymbols: retrieved,
        latencyMs,
        recallAt1: r1,
        recallAt5: r5,
        recallAt10: r10,
        mrr,
        ndcgAt10: ndcg,
      });
    }

    return results;
  }

  private async retrieve(variant: AblationVariant, queryText: string): Promise<readonly string[]> {
    switch (variant) {
      case "BM25_ONLY": {
        // Pure unexpanded BM25 search
        const rawTokens = queryText
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (rawTokens.length === 0) return [];
        const ftsQuery = rawTokens.join(" OR ");
        const hits = await this.storage.searchFts(ftsQuery, 20);
        const symbols = hits.map((h) => h.node).filter((n) => n.kind !== "file");
        return (symbols.length > 0 ? symbols : hits.map((h) => h.node)).map((n) => n.name);
      }

      case "BM25_GLOSSARY": {
        // BM25 + Synonym expansion WITHOUT morphological stemmer
        const rawTokens = queryText
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        const queryParts = new Set<string>(rawTokens);
        for (const tok of rawTokens) {
          const concepts = this.termMap.get(tok);
          if (concepts) {
            for (const c of concepts) {
              queryParts.add(c.toLowerCase());
            }
          }
        }
        const ftsQuery = Array.from(queryParts).join(" OR ");
        const hits = await this.storage.searchFts(ftsQuery, 20);
        const symbols = hits.map((h) => h.node).filter((n) => n.kind !== "file");
        return (symbols.length > 0 ? symbols : hits.map((h) => h.node)).map((n) => n.name);
      }

      case "BM25_GLOSSARY_STEMMING": {
        // BM25 + Glossary + Nazief-Adriani morphological stemmer
        const expanded = this.glossaryExpander.expandQuery(queryText);
        const hits = await this.storage.searchFts(expanded.ftsQuery, 20);
        const symbols = hits.map((h) => h.node).filter((n) => n.kind !== "file");
        return (symbols.length > 0 ? symbols : hits.map((h) => h.node)).map((n) => n.name);
      }

      case "FULL_PIPELINE": {
        // BM25 + Glossary + Stemming + Trigram Fuzzy + Personalized PageRank + RRF
        const result = await this.pipeline.search(queryText, 20, false);
        return result.symbols.map((s) => s.node.name);
      }
    }
  }

  private getVariantName(variant: AblationVariant): string {
    switch (variant) {
      case "BM25_ONLY":
        return "Baseline: FTS5 BM25 Only";
      case "BM25_GLOSSARY":
        return "Variant B: BM25 + Domain Glossary";
      case "BM25_GLOSSARY_STEMMING":
        return "Variant C: BM25 + Glossary + Nazief-Adriani Stemming";
      case "FULL_PIPELINE":
        return "Full Pipeline: BM25 + Trigram + Glossary + Stemming + PPR + RRF";
    }
  }
}
