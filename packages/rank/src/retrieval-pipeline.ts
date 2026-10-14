import {
  type EdgeRecord,
  type NodeRecord,
  computeBetaCredibleInterval,
} from "@ruas/core";
import { GlossaryExpander } from "@ruas/nlp";
import type { Storage } from "@ruas/store";
import { TrigramMatcher } from "./trigram-matcher.js";
import { PersonalizedPageRank } from "./personalized-pagerank.js";
import { ReciprocalRankFusion } from "./reciprocal-rank-fusion.js";

export interface RetrievedSymbol {
  readonly node: NodeRecord;
  readonly rrfScore: number;
  readonly ranks: Record<string, number>;
  readonly outboundEdges: readonly EdgeRecord[];
  readonly inboundEdges: readonly EdgeRecord[];
  readonly riskLevel: "low" | "medium" | "high" | "critical";
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
    // Prioritize symbol nodes over container file nodes for code symbol queries
    const allLexicalNodes = ftsHits.map((h) => h.node);
    const symbolLexicalNodes = allLexicalNodes.filter((n) => n.kind !== "file");
    const lexicalNodes = symbolLexicalNodes.length > 0 ? symbolLexicalNodes : allLexicalNodes;

    // 3. Trigram Fuzzy Search (across lexical symbols)
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
    const fuzzyCandidates: { node: NodeRecord; similarity: number }[] = [];
    for (const token of expanded.tokens) {
      if (token.length >= 4 && !STOP_TOKENS.has(token)) {
        const matches = TrigramMatcher.matchCandidates(token, lexicalNodes, 0.65);
        for (const m of matches) {
          fuzzyCandidates.push(m);
        }
      }
    }
    fuzzyCandidates.sort((a, b) => b.similarity - a.similarity);
    const trigramNodes: NodeRecord[] = [];
    const seenTrigram = new Set<string>();
    for (const f of fuzzyCandidates) {
      if (!seenTrigram.has(f.node.id)) {
        seenTrigram.add(f.node.id);
        trigramNodes.push(f.node);
      }
    }

    // 4. Personalized PageRank
    const edges = await this.storage.getAllEdges();
    const candidateIds = new Set<string>();
    for (const n of lexicalNodes) {
      candidateIds.add(n.id);
    }
    for (const n of trigramNodes) {
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
      // Seed weight drops with FTS rank position
      seeds.set(node.id, 1.0 / (i + 1));
    }

    const pprScores = this.ppr.compute(graphNodeIds, edges, seeds);
    const pprNodeMap = new Map<string, NodeRecord>();
    for (const n of lexicalNodes) {
      pprNodeMap.set(n.id, n);
    }
    for (const n of trigramNodes) {
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
      ["trigram", trigramNodes],
      ["ppr", pprRankedNodes],
    ]);

    const weights = new Map<string, number>([
      ["bm25", 1.0],
      ["ppr", 0.25],
      ["trigram", 0.2],
    ]);

    const fused = this.rrf.fuse(systems, (n) => n.id, weights);
    const topHits = fused.slice(0, limit);

    // 6. Enrich with edges, confidence, and emotional damage risk
    const symbols: RetrievedSymbol[] = [];

    for (const hit of topHits) {
      const outbound = await this.storage.getOutboundEdges(hit.item.id);
      const inbound = await this.storage.getInboundEdges(hit.item.id);

      const ranksObj: Record<string, number> = {};
      for (const [sys, r] of hit.rankings.entries()) {
        ranksObj[sys] = r;
      }

      // Compute blast radius risk level
      const totalDependents = inbound.length;
      let riskLevel: RetrievedSymbol["riskLevel"] = "low";
      if (totalDependents > 10) {
        riskLevel = "critical";
      } else if (totalDependents > 5) {
        riskLevel = "high";
      } else if (totalDependents > 2) {
        riskLevel = "medium";
      }

      let roastComment: string | undefined = undefined;
      if (enableRoast) {
        roastComment = this.generateEmotionalDamageRoast(
          hit.item,
          inbound.length,
          outbound.length,
          riskLevel,
        );
      }

      symbols.push({
        node: hit.item,
        rrfScore: Math.round(hit.rrfScore * 10000) / 10000,
        ranks: ranksObj,
        outboundEdges: outbound,
        inboundEdges: inbound,
        riskLevel,
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
  ): string {
    if (risk === "critical") {
      return `💥 Hati-hati: '${node.name}' dipakai di ${inboundCount} tempat. Senggol dikit, deploy hari Jumat langsung bikin customer service nangis.`;
    }
    if (inboundCount > 0 && outboundCount > 5) {
      return `🍝 Fungsi '${node.name}' manggil ${outboundCount} dependensi lain. Bau-bau spaghetti code yang siap meledak pas dipanggil concurrency tinggi.`;
    }
    if (inboundCount === 0 && node.kind === "function") {
      return `👻 '${node.name}' sepertinya dead code / zombie function. Gak ada yang manggil di codebase, tapi masih numpang hidup di repo.`;
    }
    return `⚡ '${node.name}' terhubung ke ${outboundCount} outbound call. Pastikan error handling gak cuma 'console.log(err)'.`;
  }
}
