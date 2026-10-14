/**
 * Evidence rules and Bayesian Beta priors for cross-file symbol resolution.
 */

export interface EvidenceEvaluation {
  readonly rule: string;
  readonly alpha: number;
  readonly beta: number;
  readonly metadata: Record<string, unknown>;
}

export class EvidenceRules {
  /**
   * Rule 1: Explicit direct import match (caller file imports callee symbol/module).
   */
  public static exactImport(sourcePath: string): EvidenceEvaluation {
    return {
      rule: "exact_import",
      alpha: 10,
      beta: 0.5,
      metadata: { importSource: sourcePath },
    };
  }

  /**
   * Rule 2: Same-file / lexical scope declaration.
   */
  public static sameScope(filePath: string): EvidenceEvaluation {
    return {
      rule: "same_scope",
      alpha: 8,
      beta: 1.0,
      metadata: { filePath },
    };
  }

  /**
   * Rule 3: Single candidate match across the entire codebase.
   */
  public static uniqueCandidate(candidateId: string): EvidenceEvaluation {
    return {
      rule: "unique_candidate",
      alpha: 6,
      beta: 2.0,
      metadata: { candidateId },
    };
  }

  /**
   * Rule 4: Ambiguous multiple candidate matches without explicit import evidence.
   */
  public static ambiguousCandidates(candidateCount: number): EvidenceEvaluation {
    const k = Math.max(2, candidateCount);
    return {
      rule: "ambiguous_candidates",
      alpha: 2,
      beta: 2 * k,
      metadata: { candidateCount: k },
    };
  }
}
