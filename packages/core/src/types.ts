/**
 * Core domain types and enumerations for the Ruas knowledge graph.
 */

export type SupportedLanguage =
  | "typescript"
  | "javascript"
  | "tsx"
  | "jsx"
  | "php"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "csharp";

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

export interface CycleInfo {
  readonly id: string;
  readonly length: number;
  readonly nodeIds: readonly string[];
  readonly nodeNames: readonly string[];
  readonly files: readonly string[];
}

export interface OrphanInfo {
  readonly node: NodeRecord;
  readonly reason: string;
}

export interface SubsystemCoupling {
  readonly subsystem: string;
  readonly afferentCoupling: number; // Ca
  readonly efferentCoupling: number; // Ce
  readonly instability: number; // I = Ce / (Ca + Ce)
  readonly nodeCount: number;
}

export interface FuzzySmellItem {
  readonly node: NodeRecord;
  readonly smellType: "DeadCode" | "GodComponent" | "FragileBridge";
  readonly evaluation: FuzzyEvaluationResult;
}

export interface ArchitectureHealthReport {
  readonly score: number; // 0 - 100
  readonly grade: "A" | "B" | "C" | "D" | "F";
  readonly totalCycles: number;
  readonly cycles: readonly CycleInfo[];
  readonly totalOrphans: number;
  readonly orphans: readonly OrphanInfo[];
  readonly subsystemCouplings: readonly SubsystemCoupling[];
  readonly godNodes: readonly {
    readonly node: NodeRecord;
    readonly degree: number;
    readonly role: string;
  }[];
  readonly fuzzyEvaluation?: FuzzyEvaluationResult | undefined;
  readonly fuzzySmells?: readonly FuzzySmellItem[] | undefined;
}

export interface ArchitectureRule {
  readonly from: string;
  readonly disallow: readonly string[];
  readonly message?: string | undefined;
}

export interface ArchitectureConfig {
  readonly layers: Record<string, readonly string[]>;
  readonly rules: readonly ArchitectureRule[];
}

export interface ArchitecturalViolation {
  readonly rule: ArchitectureRule;
  readonly srcNode: NodeRecord;
  readonly srcLayer: string;
  readonly dstNode: NodeRecord;
  readonly dstLayer: string;
  readonly edge: EdgeRecord;
  readonly severity: "Critical" | "Warning" | "Info";
  readonly fuzzySeverity?: FuzzyLinguisticGrade | undefined;
  readonly fuzzyViolationDegree: number; // in [0, 1]
  readonly message: string;
  readonly remediation?: string | undefined;
}

export interface ArchitectureLinterReport {
  readonly purityScore: number; // 0 to 100
  readonly grade: "A" | "B" | "C" | "D" | "F";
  readonly totalViolations: number;
  readonly violations: readonly ArchitecturalViolation[];
  readonly layerStats: readonly {
    readonly layer: string;
    readonly symbolCount: number;
    readonly outboundCalls: number;
    readonly violationCount: number;
  }[];
  readonly fuzzyEvaluation?: FuzzyEvaluationResult | undefined;
  readonly summary: string;
}

export interface PathResult {
  readonly sourceNode: NodeRecord;
  readonly targetNode: NodeRecord;
  readonly found: boolean;
  readonly path: readonly {
    readonly node: NodeRecord;
    readonly edgeToNext?: EdgeRecord | undefined;
    readonly confidence?: number | undefined;
    readonly fuzzyStepImpedance?: number | undefined;
  }[];
  readonly cumulativeConfidence: number;
  readonly hops: number;
  readonly cost?: number;
  readonly fuzzyResistance?: number | undefined;
  readonly fuzzyEvaluation?: FuzzyEvaluationResult | undefined;
}

export interface DijkstraHorizonNode {
  readonly node: NodeRecord;
  readonly distance: number; // sum of -ln(p)
  readonly cumulativeConfidence: number; // product of edge probabilities
  readonly hops: number;
}

export interface DijkstraHorizonResult {
  readonly origin: NodeRecord;
  readonly reachableCount: number;
  readonly horizon: readonly DijkstraHorizonNode[];
}

export interface KPathResult {
  readonly sourceNode: NodeRecord;
  readonly targetNode: NodeRecord;
  readonly paths: readonly PathResult[];
  readonly totalPathsFound: number;
  readonly found: boolean;
}

export interface VibeMemoryRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly intent: string;
  readonly activeFiles: readonly string[];
  readonly architecturalNotes: string;
  readonly pendingDecisions: readonly string[];
  readonly sessionTag?: string | undefined;
  readonly symbolFocus?: readonly string[] | undefined;
  readonly tokenDensityScore?: number | undefined;
}

export interface AiNativeContextManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedAt: string;
  readonly targetProject: string;
  readonly totalSymbols: number;
  readonly totalEdges: number;
  readonly godSymbols: readonly {
    readonly id: string;
    readonly name: string;
    readonly kind: string;
    readonly inDegree: number;
    readonly outDegree: number;
  }[];
  readonly criticalTrajectories: readonly {
    readonly source: string;
    readonly target: string;
    readonly pathSignature: string;
    readonly bayesianConfidence: number;
  }[];
  readonly activeVibeMemory?: VibeMemoryRecord | undefined;
  readonly rawMarkdown: string;
}

/**
 * Systematic Fuzzy Logic Types and Models (Zadeh 1965)
 */
export type FuzzyMembershipFunction = "trimf" | "trapmf" | "sigmf" | "gaussmf";

export interface FuzzySetDefinition {
  readonly name: string;
  readonly mf: FuzzyMembershipFunction;
  readonly params: readonly number[];
}

export interface LinguisticVariable {
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly sets: readonly FuzzySetDefinition[];
}

export type FuzzyLinguisticGrade = "Minimal" | "Low" | "Moderate" | "High" | "Critical";

export interface FuzzyEvaluationResult {
  readonly rawScore: number; // Defuzzified continuous value in [0, 100]
  readonly crispGrade: FuzzyLinguisticGrade;
  readonly linguisticDistribution: Record<string, number>; // degrees of truth in [0, 1]
  readonly rationale: string;
}

export interface FuzzyMatchCandidate {
  readonly node: NodeRecord;
  readonly score: number; // Overall fuzzy similarity in [0, 1]
  readonly details: {
    readonly editDistanceSim: number;
    readonly trigramSim: number;
    readonly acronymMatch: boolean;
    readonly prefixBonus: number;
  };
}
