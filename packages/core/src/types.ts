/**
 * Core domain types and enumerations for the Ruas knowledge graph.
 */

export type SupportedLanguage = "typescript" | "javascript" | "tsx" | "jsx" | "php";

export const NODE_KINDS = [
  "file",
  "module",
  "class",
  "interface",
  "function",
  "method",
  "variable",
  "route",
  "doc_section",
  "concept",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = [
  "imports",
  "calls",
  "extends",
  "implements",
  "references",
  "contains",
  "routes_to",
  "documents",
] as const;

export type EdgeKind = (typeof EDGE_KINDS)[number];

export interface FileRecord {
  readonly id: string;
  readonly path: string;
  readonly lang: SupportedLanguage;
  readonly contentHash: string;
  readonly size: number;
  readonly mtime: number;
  readonly indexedAt: number;
}

export interface NodeRecord {
  readonly id: string;
  readonly fileId: string;
  readonly kind: NodeKind;
  readonly name: string;
  readonly qualifiedName: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly signature: string | null;
  readonly docComment: string | null;
  readonly tokens: string;
}

export interface EdgeRecord {
  readonly id: string;
  readonly srcId: string;
  readonly dstId: string;
  readonly kind: EdgeKind;
  readonly alpha: number;
  readonly beta: number;
  readonly evidenceJson: string | null;
}

export interface UnresolvedRefRecord {
  readonly id: string;
  readonly srcId: string;
  readonly name: string;
  readonly kind: EdgeKind;
  readonly fileId: string;
  readonly line: number;
}

export interface GlossaryTerm {
  readonly term: string;
  readonly lang: string;
  readonly concepts: readonly string[];
  readonly weight: number;
}

export interface CredibleInterval {
  readonly lower: number;
  readonly mean: number;
  readonly upper: number;
}

/**
 * Computes posterior mean and approximate 95% credible interval for Beta(alpha, beta).
 * Uses normal approximation to the Beta distribution for variance.
 */
export function computeBetaCredibleInterval(alpha: number, beta: number): CredibleInterval {
  const sum = alpha + beta;
  if (sum <= 0) {
    return { lower: 0, mean: 0.5, upper: 1 };
  }
  const mean = alpha / sum;
  const variance = (alpha * beta) / (sum * sum * (sum + 1));
  const stdDev = Math.sqrt(variance);

  // 1.96 standard deviations for 95% two-sided interval
  const lower = Math.max(0, mean - 1.96 * stdDev);
  const upper = Math.min(1, mean + 1.96 * stdDev);

  return {
    lower: Math.round(lower * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    upper: Math.round(upper * 1000) / 1000,
  };
}

export interface ProjectConfig {
  readonly rootDir: string;
  readonly dbPath: string;
  readonly languages: readonly SupportedLanguage[];
  readonly excludePatterns: readonly string[];
  readonly maxFileSize: number; // in bytes, default 1MB
  readonly debounceMs: number; // default 800ms
}
