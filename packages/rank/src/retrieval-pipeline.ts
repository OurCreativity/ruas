import {
  type EdgeRecord,
  type NodeRecord,
  type FuzzyEvaluationResult,
  type FuzzyMatchCandidate,
  computeBetaCredibleInterval,
} from "@ruas/core";
import { GlossaryExpander } from "@ruas/nlp";
import type { Storage } from "@ruas/store";
import { TrigramMatcher } from "./trigram-matcher.js";
import { FuzzyMatcher } from "./fuzzy-matcher.js";
import { FuzzyInferenceEngine } from "./fuzzy-inference.js";
import { PersonalizedPageRank } from "./personalized-pagerank.js";
import { ReciprocalRankFusion } from "./reciprocal-rank-fusion.js";

export interface RetrievedSymbol {
  readonly node: NodeRecord;
  readonly rrfScore: number;
  readonly ranks: Record<string, number>;
  readonly outboundEdges: readonly EdgeRecord[];
  readonly inboundEdges: readonly EdgeRecord[];
  readonly riskLevel: "low" | "medium" | "high" | "critical";
  readonly fuzzyEvaluation?: FuzzyEvaluationResult | undefined;
  readonly roastComment?: string | undefined;
}

export interface RetrievalResult {
  readonly query: string;
  readonly detectedLang: string;
  readonly expandedConcepts: readonly string[];
  readonly symbols: readonly RetrievedSymbol[];
  readonly durationMs: number;
}

export class RetrievalPipeline {
  private readonly storage: Storage;
  private readonly glossaryExpander: GlossaryExpander;
  private readonly ppr: PersonalizedPageRank;
  private readonly rrf: ReciprocalRankFusion;

  constructor(storage: Storage, glossaryExpander?: GlossaryExpander) {
    this.storage = storage;
    this.glossaryExpander = glossaryExpander ?? new GlossaryExpander();
    this.ppr = new PersonalizedPageRank({ damping: 0.5 });
    this.rrf = new ReciprocalRankFusion(60);
  }

  public async search(
    queryText: string,
    limit = 10,
    enableRoast = false,
  ): Promise<RetrievalResult> {
    const startTime = Date.now();

    // 1. Expand query via NLP glossary
    const expanded = this.glossaryExpander.expandQuery(queryText);

    // 2. Lexical BM25 Search
    const ftsHits = await this.storage.searchFts(expanded.ftsQuery, 50);
    // Prioritize symbol nodes over container file and module nodes for code symbol queries
    const allLexicalNodes = ftsHits.map((h) => h.node);
    const concreteSymbols = allLexicalNodes.filter(
      (n) => n.kind === "function" || n.kind === "method" || n.kind === "class" || n.kind === "interface" || n.kind === "route",
    );
    const nonFileNodes = allLexicalNodes.filter((n) => n.kind !== "file");
    const lexicalNodes = concreteSymbols.length > 0
      ? [...concreteSymbols, ...allLexicalNodes.filter((n) => !concreteSymbols.includes(n) && n.kind !== "file")]
      : nonFileNodes.length > 0
        ? nonFileNodes
        : allLexicalNodes;

    // 3. Systematic Fuzzy Matching (Acronyms, Damerau-Levenshtein, Trigrams, Sub-words)
    const STOP_TOKENS = new Set([
      "fungsi",
      "function",
      "method",
      "class",
      "cara",
      "buat",
      "bikin",
      "cek",
      "format",
    ]);

    // Gather candidate nodes for fuzzy matching: if lexical search was empty or sparse, pool all non-file nodes
    let fuzzySearchSpace = lexicalNodes;
    if (lexicalNodes.length < 5) {
      const allDbNodes = await this.storage.getAllNodes();
      const nonFileNodes = allDbNodes.filter((n) => n.kind !== "file");
      const combined = new Map<string, NodeRecord>();
      for (const n of lexicalNodes) combined.set(n.id, n);
      for (const n of nonFileNodes) combined.set(n.id, n);
      fuzzySearchSpace = Array.from(combined.values());
    }

    const fuzzyCandidates: FuzzyMatchCandidate[] = [];
    for (const token of expanded.tokens) {
      if (token.length >= 2 && !STOP_TOKENS.has(token)) {
        const matches = FuzzyMatcher.matchCandidates(token, fuzzySearchSpace, {
          threshold: 0.42,
          limit: 20,
        });
        for (const m of matches) {
          fuzzyCandidates.push(m);
        }
      }
    }

    fuzzyCandidates.sort((a, b) => b.score - a.score);
    const fuzzyRankedNodes: NodeRecord[] = [];
    const seenFuzzy = new Set<string>();
    for (const f of fuzzyCandidates) {
      if (!seenFuzzy.has(f.node.id)) {
        seenFuzzy.add(f.node.id);
        fuzzyRankedNodes.push(f.node);
      }
    }

    // 4. Personalized PageRank
    const edges = await this.storage.getAllEdges();
    const candidateIds = new Set<string>();
    for (const n of lexicalNodes) {
      candidateIds.add(n.id);
    }
    for (const n of fuzzyRankedNodes) {
      candidateIds.add(n.id);
    }

    // Add 1-hop neighbors of candidates to graph pool
    for (const e of edges) {
      if (candidateIds.has(e.srcId) || candidateIds.has(e.dstId)) {
        candidateIds.add(e.srcId);
        candidateIds.add(e.dstId);
      }
    }

    const graphNodeIds = Array.from(candidateIds);
    const seeds = new Map<string, number>();
    for (let i = 0; i < lexicalNodes.length; i++) {
      const node = lexicalNodes[i]!;
      seeds.set(node.id, 1.0 / (i + 1));
    }
    // Also seed top fuzzy matches if lexical search was dry
    if (lexicalNodes.length === 0) {
      for (let i = 0; i < fuzzyRankedNodes.length; i++) {
        const node = fuzzyRankedNodes[i]!;
        seeds.set(node.id, 1.0 / (i + 1));
      }
    }

    const pprScores = this.ppr.compute(graphNodeIds, edges, seeds);
    const pprNodeMap = new Map<string, NodeRecord>();
    for (const n of lexicalNodes) {
      pprNodeMap.set(n.id, n);
    }
    for (const n of fuzzyRankedNodes) {
      pprNodeMap.set(n.id, n);
    }

    const pprRankedNodes: NodeRecord[] = [];
    for (const s of pprScores) {
      const node = pprNodeMap.get(s.nodeId);
      if (node && node.kind !== "file") {
        pprRankedNodes.push(node);
      }
    }

    // 5. Calibrated Weighted Reciprocal Rank Fusion
    const systems = new Map<string, readonly NodeRecord[]>([
      ["bm25", lexicalNodes],
      ["fuzzy", fuzzyRankedNodes],
      ["ppr", pprRankedNodes],
    ]);

    const weights = new Map<string, number>([
      ["bm25", 1.0],
      ["fuzzy", 0.20],
      ["ppr", 0.15],
    ]);

    const fused = this.rrf.fuse(systems, (n) => n.id, weights);
    const topHits = fused.slice(0, limit);

    // 6. Enrich with edges, confidence, and Mamdani Fuzzy Risk Evaluation
    const symbols: RetrievedSymbol[] = [];

    for (const hit of topHits) {
      const outbound = await this.storage.getOutboundEdges(hit.item.id);
      const inbound = await this.storage.getInboundEdges(hit.item.id);

      const ranksObj: Record<string, number> = {};
      for (const [sys, r] of hit.rankings.entries()) {
        ranksObj[sys] = r;
      }

      // Compute blast radius risk level using Mamdani Fuzzy Inference System
      const fuzzyEvaluation = FuzzyInferenceEngine.evaluateSymbolRisk(
        hit.item,
        inbound.length,
        outbound.length,
      );

      const riskLevel = fuzzyEvaluation.crispGrade.toLowerCase() as RetrievedSymbol["riskLevel"];

      let roastComment: string | undefined = undefined;
      if (enableRoast) {
        roastComment = this.generateEmotionalDamageRoast(
          hit.item,
          inbound.length,
          outbound.length,
          riskLevel,
          fuzzyEvaluation.rawScore,
        );
      }

      symbols.push({
        node: hit.item,
        rrfScore: Math.round(hit.rrfScore * 10000) / 10000,
        ranks: ranksObj,
        outboundEdges: outbound,
        inboundEdges: inbound,
        riskLevel,
        fuzzyEvaluation,
        roastComment,
      });
    }

    const durationMs = Date.now() - startTime;

    return {
      query: queryText,
      detectedLang: expanded.lang,
      expandedConcepts: expanded.expansions.map((e) => e.term),
      symbols,
      durationMs,
    };
  }

  private generateEmotionalDamageRoast(
    node: NodeRecord,
    inboundCount: number,
    outboundCount: number,
    risk: RetrievedSymbol["riskLevel"],
    fuzzyScore?: number,
  ): string {
    const scoreTag = fuzzyScore !== undefined ? ` [Fuzzy Risk: ${fuzzyScore}%]` : "";
    if (risk === "critical") {
      return `💥 Hati-hati: '${node.name}' dipakai di ${inboundCount} tempat${scoreTag}. Senggol dikit, deploy hari Jumat langsung bikin customer service nangis.`;
    }
    if (inboundCount > 0 && outboundCount > 5) {
      return `🍝 Fungsi '${node.name}' manggil ${outboundCount} dependensi lain${scoreTag}. Bau-bau spaghetti code yang siap meledak pas dipanggil concurrency tinggi.`;
    }
    if (inboundCount === 0 && node.kind === "function") {
      return `👻 '${node.name}' sepertinya dead code / zombie function${scoreTag}. Gak ada yang manggil di codebase, tapi masih numpang hidup di repo.`;
    }
    return `⚡ '${node.name}' terhubung ke ${outboundCount} outbound call${scoreTag}. Pastikan error handling gak cuma 'console.log(err)'.`;
  }
}
