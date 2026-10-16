import type { NodeRecord, FuzzyMatchCandidate } from "@ruas/core";
import { TrigramMatcher } from "./trigram-matcher.js";

export interface FuzzyMatcherOptions {
  readonly threshold?: number; // Minimum composite score (default: 0.40)
  readonly limit?: number; // Max results to return
  readonly checkQualifiedName?: boolean; // Check qualified name as well as node name
}

export class FuzzyMatcher {
  /**
   * Computes Damerau-Levenshtein distance with adjacent transpositions.
   */
  public static damerauLevenshteinDistance(a: string, b: string): number {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    // DP table
    const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
      new Array<number>(len2 + 1).fill(0),
    );

    for (let i = 0; i <= len1; i++) dp[i]![0] = i;
    for (let j = 0; j <= len2; j++) dp[0]![j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1, // deletion
          dp[i]![j - 1]! + 1, // insertion
          dp[i - 1]![j - 1]! + cost, // substitution
        );

        // Transposition check
        if (
          i > 1 &&
          j > 1 &&
          s1[i - 1] === s2[j - 2] &&
          s1[i - 2] === s2[j - 1]
        ) {
          dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + 1);
        }
      }
    }

    return dp[len1]![len2]!;
  }

  /**
   * Normalized edit similarity in [0, 1].
   */
  public static editDistanceSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    const dist = FuzzyMatcher.damerauLevenshteinDistance(a, b);
    return Math.max(0, 1.0 - dist / maxLen);
  }

  /**
   * Breaks an identifier into sub-words (handling camelCase, PascalCase, snake_case, kebab-case).
   * E.g. "prosesQRIS" -> ["proses", "qris"], "InvoiceGenerator" -> ["invoice", "generator"]
   */
  public static splitIdentifier(name: string): readonly string[] {
    return name
      .replace(/([a-z\d])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1 $2")
      .replace(/[_.-]+/g, " ")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((s) => s.length > 0);
  }

  /**
   * Checks if query is an acronym or camelCase abbreviation for the target name.
   * E.g., "pQRIS" or "pqris" matches ["proses", "qris"]
   * E.g., "invGen" matches ["invoice", "generator"]
   */
  public static acronymSimilarity(query: string, targetName: string): number {
    const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (q.length < 2) return 0.0;

    const parts = FuzzyMatcher.splitIdentifier(targetName);
    if (parts.length === 0) return 0.0;

    // 1. Initial letter acronym: e.g. "ig" matches "InvoiceGenerator"
    const initials = parts.map((p) => p[0]).join("");
    if (initials === q) return 0.95;
    if (initials.startsWith(q)) return 0.85;

    // 2. Prefix acronym match: e.g. "pQRIS" where parts are ["proses", "qris"], "calcDisc" for ["calculate", "direct", "discount"]
    const queryParts = FuzzyMatcher.splitIdentifier(query);
    if (queryParts.length > 1 && queryParts.length <= parts.length) {
      let matched = 0;
      let targetIdx = 0;
      for (const qp of queryParts) {
        while (targetIdx < parts.length) {
          if (parts[targetIdx]!.startsWith(qp)) {
            matched++;
            targetIdx++;
            break;
          }
          targetIdx++;
        }
      }
      if (matched === queryParts.length) {
        return 0.88;
      }
    }

    // 3. Subsequence alignment of characters in target initials + starts
    let pi = 0;
    let qi = 0;
    while (pi < parts.length && qi < q.length) {
      if (parts[pi]!.startsWith(q[qi]!)) {
        qi++;
      }
      pi++;
    }
    if (qi === q.length && q.length >= 2) {
      return 0.75;
    }

    return 0.0;
  }

  /**
   * Prefix similarity bonus (up to 4 matching initial chars like Jaro-Winkler).
   */
  public static prefixBonus(a: string, b: string): number {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
    let prefix = 0;
    for (let i = 0; i < maxPrefix; i++) {
      if (s1[i] === s2[i]) {
        prefix++;
      } else {
        break;
      }
    }
    return prefix * 0.05; // Max +0.20 bonus
  }

  /**
   * Computes a multi-signal composite fuzzy similarity score between query and a symbol name.
   */
  public static computeSimilarity(query: string, targetName: string): {
    score: number;
    details: {
      editDistanceSim: number;
      trigramSim: number;
      acronymMatch: boolean;
      prefixBonus: number;
    };
  } {
    const q = query.trim().toLowerCase();
    const target = targetName.trim().toLowerCase();

    // Exact match
    if (q === target) {
      return {
        score: 1.0,
        details: {
          editDistanceSim: 1.0,
          trigramSim: 1.0,
          acronymMatch: false,
          prefixBonus: 0.2,
        },
      };
    }

    // Substring containment match
    const containsBonus = target.includes(q) ? 0.35 : 0.0;

    const editSim = FuzzyMatcher.editDistanceSimilarity(q, target);
    const trigramSim = TrigramMatcher.similarity(q, target);
    const acronymSim = FuzzyMatcher.acronymSimilarity(query, targetName);
    const pBonus = FuzzyMatcher.prefixBonus(q, target);

    // Weighted fusion of fuzzy signals
    let composite =
      editSim * 0.40 +
      trigramSim * 0.35 +
      containsBonus +
      pBonus;

    const isAcronym = acronymSim > 0.5;
    if (isAcronym) {
      composite = Math.max(composite, acronymSim);
    }

    const clampedScore = Math.min(1.0, Math.round(composite * 1000) / 1000);

    return {
      score: clampedScore,
      details: {
        editDistanceSim: Math.round(editSim * 1000) / 1000,
        trigramSim: Math.round(trigramSim * 1000) / 1000,
        acronymMatch: isAcronym,
        prefixBonus: Math.round(pBonus * 1000) / 1000,
      },
    };
  }

  /**
   * Finds matching candidates across a list of nodes using systematic fuzzy scoring.
   */
  public static matchCandidates(
    queryWord: string,
    nodes: readonly NodeRecord[],
    options: FuzzyMatcherOptions = {},
  ): readonly FuzzyMatchCandidate[] {
    const threshold = options.threshold ?? 0.40;
    const checkQName = options.checkQualifiedName ?? true;
    const candidates: FuzzyMatchCandidate[] = [];

    for (const node of nodes) {
      const nameMatch = FuzzyMatcher.computeSimilarity(queryWord, node.name);
      let bestMatch = nameMatch;

      if (checkQName && node.qualifiedName !== node.name) {
        const qMatch = FuzzyMatcher.computeSimilarity(queryWord, node.qualifiedName);
        if (qMatch.score > bestMatch.score) {
          bestMatch = qMatch;
        }
      }

      if (bestMatch.score >= threshold) {
        candidates.push({
          node,
          score: bestMatch.score,
          details: bestMatch.details,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    if (options.limit !== undefined && options.limit > 0) {
      return candidates.slice(0, options.limit);
    }

    return candidates;
  }
}
