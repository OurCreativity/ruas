import type { NodeRecord } from "@ruas/core";
import type { CommunityPartition } from "./community-detection.js";

const STOP_WORDS = new Set([
  // Programming keywords
  "function",
  "method",
  "class",
  "interface",
  "export",
  "import",
  "return",
  "const",
  "let",
  "var",
  "public",
  "private",
  "protected",
  "string",
  "number",
  "boolean",
  "void",
  "any",
  "null",
  "undefined",
  "true",
  "false",
  "async",
  "await",
  "promise",
  "type",
  // English stop words
  "the",
  "a",
  "an",
  "and",
  "or",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "this",
  "that",
  // Indonesian stop words
  "yang",
  "dan",
  "atau",
  "di",
  "ke",
  "dari",
  "pada",
  "untuk",
  "dengan",
  "adalah",
  "ini",
  "itu",
  "oleh",
  "dalam",
  "bisa",
  "akan",
  "sudah",
  "jika",
]);

export class SubsystemLabeler {
  /**
   * Generates descriptive architectural labels for detected communities using TF-IDF
   * over AST identifiers, tokens, and documentation comments (zero external LLM required).
   */
  public static labelCommunities(
    communities: readonly CommunityPartition[],
    nodes: readonly NodeRecord[],
    topTermsPerLabel = 3,
  ): readonly CommunityPartition[] {
    const nodeMap = new Map<string, NodeRecord>();
    for (const n of nodes) {
      nodeMap.set(n.id, n);
    }

    const totalCommunities = communities.length;
    if (totalCommunities === 0) return [];

    // 1. Extract vocabulary per community
    const communityDocs: Array<Map<string, number>> = [];
    const termDocFreq = new Map<string, number>();

    for (const comm of communities) {
      const termCounts = new Map<string, number>();

      for (const nodeId of comm.nodeIds) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        const rawText = `${node.name} ${node.tokens} ${node.docComment ?? ""}`;
        const words = rawText
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

        for (const w of words) {
          termCounts.set(w, (termCounts.get(w) ?? 0) + 1);
        }
      }

      communityDocs.push(termCounts);

      // Track document frequency (how many communities contain term w)
      for (const w of termCounts.keys()) {
        termDocFreq.set(w, (termDocFreq.get(w) ?? 0) + 1);
      }
    }

    // 2. Compute TF-IDF for each community and pick top terms
    const labeledCommunities: CommunityPartition[] = [];

    for (let c = 0; c < totalCommunities; c++) {
      const comm = communities[c]!;
      const termCounts = communityDocs[c]!;

      let totalTokens = 0;
      for (const cnt of termCounts.values()) {
        totalTokens += cnt;
      }

      const scoredTerms: { term: string; score: number }[] = [];

      for (const [term, count] of termCounts.entries()) {
        const tf = count / (totalTokens || 1);
        const df = termDocFreq.get(term) ?? 1;
        const idf = Math.log(1.0 + totalCommunities / df);
        const tfidf = tf * idf;

        scoredTerms.push({ term, score: tfidf });
      }

      scoredTerms.sort((a, b) => b.score - a.score);

      const topTerms = scoredTerms.slice(0, topTermsPerLabel).map((t) => t.term);
      const label = topTerms.length > 0 ? topTerms.join(":") : `subsystem-${comm.communityId}`;

      labeledCommunities.push({
        communityId: comm.communityId,
        nodeIds: comm.nodeIds,
        label,
      });
    }

    return labeledCommunities;
  }
}
