import type {
  FuzzyEvaluationResult,
  FuzzyLinguisticGrade,
  NodeRecord,
} from "@ruas/core";

export class FuzzyInferenceEngine {
  /**
   * Triangular Membership Function: trimf(x, [a, b, c])
   */
  public static trimf(x: number, a: number, b: number, c: number): number {
    if (x <= a || x >= c) return 0.0;
    if (x === b) return 1.0;
    if (x > a && x < b) return (x - a) / (b - a);
    return (c - x) / (c - b);
  }

  /**
   * Trapezoidal Membership Function: trapmf(x, [a, b, c, d])
   */
  public static trapmf(x: number, a: number, b: number, c: number, d: number): number {
    if (x <= a || x >= d) return 0.0;
    if (x >= b && x <= c) return 1.0;
    if (x > a && x < b) return (x - a) / (b - a);
    return (d - x) / (d - c);
  }

  /**
   * Sigmoidal Membership Function: sigmf(x, [a, c])
   */
  public static sigmf(x: number, a: number, c: number): number {
    return 1.0 / (1.0 + Math.exp(-a * (x - c)));
  }

  /**
   * Gaussian Membership Function: gaussmf(x, [sigma, c])
   */
  public static gaussmf(x: number, sigma: number, c: number): number {
    if (sigma <= 0) return 0.0;
    return Math.exp(-Math.pow(x - c, 2) / (2 * Math.pow(sigma, 2)));
  }

  /**
   * Zadeh T-Norm (AND) operation: min(a, b)
   */
  public static and(a: number, b: number): number {
    return Math.min(a, b);
  }

  /**
   * Zadeh S-Norm / T-Conorm (OR) operation: max(a, b)
   */
  public static or(a: number, b: number): number {
    return Math.max(a, b);
  }

  /**
   * Zadeh Negation (NOT) operation: 1 - a
   */
  public static not(a: number): number {
    return Math.max(0.0, 1.0 - a);
  }

  /**
   * Evaluates the blast radius risk and structural fragility of a symbol
   * using a Mamdani Fuzzy Inference System with centroid defuzzification.
   */
  public static evaluateSymbolRisk(
    node: NodeRecord,
    inboundCount: number,
    outboundCount: number,
    meanEdgeConfidence = 0.85,
  ): FuzzyEvaluationResult {
    const Ca = inboundCount;
    const Ce = outboundCount;
    const totalCoupling = Ca + Ce;
    const instability = totalCoupling > 0 ? Ce / totalCoupling : 0.0;

    // 1. Fuzzification of Inputs
    // Afferent Coupling (Inbound Callers)
    const caIsolated = FuzzyInferenceEngine.trapmf(Ca, -1, 0, 0, 1.5);
    const caModest = FuzzyInferenceEngine.trimf(Ca, 1, 3, 5);
    const caHeavy = FuzzyInferenceEngine.trimf(Ca, 3, 6, 10);
    const caCriticalHub = FuzzyInferenceEngine.trapmf(Ca, 7, 10, 1000, 1000);

    // Efferent Coupling (Outbound Dependencies)
    const cePure = FuzzyInferenceEngine.trapmf(Ce, -1, 0, 0, 1.5);
    const ceCompact = FuzzyInferenceEngine.trimf(Ce, 1, 3, 6);
    const ceSprawling = FuzzyInferenceEngine.trimf(Ce, 4, 8, 14);
    const ceGodNode = FuzzyInferenceEngine.trapmf(Ce, 10, 15, 1000, 1000);

    // Confidence Level
    const confHigh = FuzzyInferenceEngine.trapmf(meanEdgeConfidence, 0.7, 0.85, 1.0, 1.0);
    const confUncertain = FuzzyInferenceEngine.trapmf(meanEdgeConfidence, 0.0, 0.0, 0.6, 0.75);

    // 2. Mamdani Fuzzy Rule Base
    // Centers of gravity for output sets: Minimal=10, Low=30, Moderate=55, High=75, Critical=95
    let wMinimal = 0.0;
    let wLow = 0.0;
    let wModerate = 0.0;
    let wHigh = 0.0;
    let wCritical = 0.0;

    // Rule 1: IF Ca is CriticalHub THEN Risk is Critical
    wCritical = FuzzyInferenceEngine.or(wCritical, caCriticalHub);

    // Rule 2: IF Ca is Heavy AND Ce is Sprawling THEN Risk is Critical
    wCritical = FuzzyInferenceEngine.or(
      wCritical,
      FuzzyInferenceEngine.and(caHeavy, ceSprawling),
    );

    // Rule 3: IF Ca is Heavy AND Ce is Compact THEN Risk is High
    wHigh = FuzzyInferenceEngine.or(
      wHigh,
      FuzzyInferenceEngine.and(caHeavy, ceCompact),
    );

    // Rule 4: IF Ca is Modest AND Ce is GodNode THEN Risk is High
    wHigh = FuzzyInferenceEngine.or(
      wHigh,
      FuzzyInferenceEngine.and(caModest, ceGodNode),
    );

    // Rule 5: IF Ca is Modest AND Ce is (Compact OR Pure) THEN Risk is Moderate
    wModerate = FuzzyInferenceEngine.or(
      wModerate,
      FuzzyInferenceEngine.and(caModest, FuzzyInferenceEngine.or(ceCompact, cePure)),
    );

    // Rule 6: IF Ca is Isolated AND Ce is Pure THEN Risk is Minimal
    wMinimal = FuzzyInferenceEngine.or(
      wMinimal,
      FuzzyInferenceEngine.and(caIsolated, cePure),
    );

    // Rule 7: IF Ca is Isolated AND Ce is (Sprawling OR GodNode) THEN Risk is Low
    wLow = FuzzyInferenceEngine.or(
      wLow,
      FuzzyInferenceEngine.and(caIsolated, FuzzyInferenceEngine.or(ceSprawling, ceGodNode)),
    );

    // Rule 8: IF Confidence is Uncertain AND Ca is Heavy THEN Risk is bumped
    const uncertainShock = FuzzyInferenceEngine.and(confUncertain, caHeavy);
    wHigh = FuzzyInferenceEngine.or(wHigh, uncertainShock);

    // 3. Centroid Defuzzification (Weighted Average of Centers)
    const centers = {
      Minimal: 10,
      Low: 30,
      Moderate: 55,
      High: 75,
      Critical: 95,
    };

    const denominator = wMinimal + wLow + wModerate + wHigh + wCritical;
    let rawScore = 30.0; // default to low/moderate neutral

    if (denominator > 0.0001) {
      rawScore =
        (wMinimal * centers.Minimal +
          wLow * centers.Low +
          wModerate * centers.Moderate +
          wHigh * centers.High +
          wCritical * centers.Critical) /
        denominator;
    } else {
      // Fallback interpolation if between rules
      rawScore = Math.min(100, Math.max(0, Ca * 8 + Ce * 2));
    }

    rawScore = Math.round(rawScore * 10) / 10;

    // 4. Map to Crisp Grade
    let crispGrade: FuzzyLinguisticGrade = "Low";
    if (rawScore >= 85) {
      crispGrade = "Critical";
    } else if (rawScore >= 65) {
      crispGrade = "High";
    } else if (rawScore >= 45) {
      crispGrade = "Moderate";
    } else if (rawScore >= 20) {
      crispGrade = "Low";
    } else {
      crispGrade = "Minimal";
    }

    // 5. Build Human-Readable Rationale
    let rationale = "";
    if (crispGrade === "Critical") {
      rationale = `Critical hub with high afferent coupling (Ca=${Ca}) and extensive dependents. Any modification incurs extreme blast radius risk.`;
    } else if (crispGrade === "High") {
      rationale = `Elevated fragility due to high coupling (Ca=${Ca}, Ce=${Ce}). Refactoring requires regression testing on calling modules.`;
    } else if (crispGrade === "Moderate") {
      rationale = `Balanced coupling (Ca=${Ca}, Ce=${Ce}). Standard blast radius; safe for localized modifications.`;
    } else if (crispGrade === "Low") {
      rationale = `Minimal dependents (Ca=${Ca}, Ce=${Ce}). Low risk of unintended downstream cascade.`;
    } else {
      rationale = `Isolated symbol with zero external callers (Ca=0). Potential dead-code candidate or leaf utility.`;
    }

    return {
      rawScore,
      crispGrade,
      linguisticDistribution: {
        Minimal: Math.round(wMinimal * 100) / 100,
        Low: Math.round(wLow * 100) / 100,
        Moderate: Math.round(wModerate * 100) / 100,
        High: Math.round(wHigh * 100) / 100,
        Critical: Math.round(wCritical * 100) / 100,
      },
      rationale,
    };
  }

  /**
   * Evaluates the impedance and friction multiplier of a directed edge in the code graph
   * using a Mamdani Fuzzy Inference System.
   *
   * Higher impedance means higher structural risk, crossing module boundaries,
   * or traversing uncertain/high-friction dependencies.
   */
  public static evaluateEdgeImpedance(
    edgeConfidence: number,
    src: NodeRecord,
    dst: NodeRecord,
    dstDegree = 1,
  ): {
    frictionMultiplier: number;
    rawImpedance: number;
    linguisticGrade: FuzzyLinguisticGrade;
    rationale: string;
  } {
    const uncertainty = Math.max(0.0, Math.min(1.0, 1.0 - edgeConfidence));
    const crossFile = src.fileId !== dst.fileId ? 1.0 : 0.0;
    const coupling = Math.max(0, dstDegree);

    // 1. Fuzzification
    // Uncertainty: Low, Moderate, High
    const uLow = FuzzyInferenceEngine.trapmf(uncertainty, -0.1, 0.0, 0.15, 0.3);
    const uMed = FuzzyInferenceEngine.trimf(uncertainty, 0.15, 0.35, 0.6);
    const uHigh = FuzzyInferenceEngine.trapmf(uncertainty, 0.4, 0.65, 1.0, 1.1);

    // Destination Coupling: Modular, Dense, Hub
    const cModular = FuzzyInferenceEngine.trapmf(coupling, -1, 0, 3, 6);
    const cDense = FuzzyInferenceEngine.trimf(coupling, 4, 8, 14);
    const cHub = FuzzyInferenceEngine.trapmf(coupling, 10, 16, 1000, 1000);

    // Boundary: Internal vs External
    const bInternal = crossFile === 0.0 ? 1.0 : 0.0;
    const bCross = crossFile === 1.0 ? 1.0 : 0.0;

    // 2. Mamdani Rules for Friction Multiplier f in [1.0, 3.5]
    // Centers of friction: Minimal=1.1, Low=1.4, Moderate=1.9, High=2.5, Critical=3.2
    let wMinimal = 0.0;
    let wLow = 0.0;
    let wModerate = 0.0;
    let wHigh = 0.0;
    let wCritical = 0.0;

    // Rule 1: IF Uncertainty is High OR Destination is Hub THEN Friction is Critical
    wCritical = FuzzyInferenceEngine.or(wCritical, FuzzyInferenceEngine.or(uHigh, cHub));

    // Rule 2: IF Uncertainty is Med AND Boundary is Cross THEN Friction is High
    wHigh = FuzzyInferenceEngine.or(wHigh, FuzzyInferenceEngine.and(uMed, bCross));

    // Rule 3: IF Destination is Dense AND Boundary is Cross THEN Friction is High
    wHigh = FuzzyInferenceEngine.or(wHigh, FuzzyInferenceEngine.and(cDense, bCross));

    // Rule 4: IF Destination is Dense AND Boundary is Internal THEN Friction is Moderate
    wModerate = FuzzyInferenceEngine.or(wModerate, FuzzyInferenceEngine.and(cDense, bInternal));

    // Rule 5: IF Uncertainty is Med AND Boundary is Internal THEN Friction is Low
    wLow = FuzzyInferenceEngine.or(wLow, FuzzyInferenceEngine.and(uMed, bInternal));

    // Rule 6: IF Uncertainty is Low AND Destination is Modular AND Boundary is Internal THEN Friction is Minimal
    wMinimal = FuzzyInferenceEngine.or(
      wMinimal,
      FuzzyInferenceEngine.and(uLow, FuzzyInferenceEngine.and(cModular, bInternal)),
    );

    // Rule 7: IF Uncertainty is Low AND Boundary is Cross THEN Friction is Low
    wLow = FuzzyInferenceEngine.or(wLow, FuzzyInferenceEngine.and(uLow, bCross));

    // 3. Centroid Defuzzification
    const centers = { Minimal: 1.1, Low: 1.4, Moderate: 1.9, High: 2.5, Critical: 3.2 };
    const denom = wMinimal + wLow + wModerate + wHigh + wCritical;

    let frictionMultiplier = 1.0;
    if (denom > 0.0001) {
      frictionMultiplier =
        (wMinimal * centers.Minimal +
          wLow * centers.Low +
          wModerate * centers.Moderate +
          wHigh * centers.High +
          wCritical * centers.Critical) /
        denom;
    } else {
      frictionMultiplier = 1.0 + uncertainty * 1.5;
    }
    frictionMultiplier = Math.round(frictionMultiplier * 100) / 100;

    // Continuous raw impedance in [0, 100]
    const rawImpedance = Math.min(100, Math.round(((frictionMultiplier - 1.0) / 2.2) * 100 * 10) / 10);

    let linguisticGrade: FuzzyLinguisticGrade = "Minimal";
    if (rawImpedance >= 80) linguisticGrade = "Critical";
    else if (rawImpedance >= 55) linguisticGrade = "High";
    else if (rawImpedance >= 35) linguisticGrade = "Moderate";
    else if (rawImpedance >= 15) linguisticGrade = "Low";

    let rationale = "";
    if (linguisticGrade === "Critical") {
      rationale = `High impedance: destination is a congested hub (degree ${dstDegree}) or carries high uncertainty (${(uncertainty * 100).toFixed(0)}%).`;
    } else if (linguisticGrade === "High") {
      rationale = `Elevated friction across module boundary (${src.qualifiedName} -> ${dst.qualifiedName}) with non-trivial coupling.`;
    } else if (linguisticGrade === "Moderate") {
      rationale = `Moderate impedance: standard inter-file dependency with reliable Bayesian calibration.`;
    } else if (linguisticGrade === "Low") {
      rationale = `Low impedance: cohesive dependency with high confidence.`;
    } else {
      rationale = `Minimal impedance: intra-file direct invocation with high certainty.`;
    }

    return {
      frictionMultiplier,
      rawImpedance,
      linguisticGrade,
      rationale,
    };
  }

  /**
   * Evaluates the end-to-end impedance and risk of a full call/dependency path.
   */
  public static evaluatePathImpedance(
    steps: readonly {
      node: NodeRecord;
      confidence?: number | undefined;
      fuzzyStepImpedance?: number | undefined;
    }[],
  ): FuzzyEvaluationResult {
    const hops = Math.max(0, steps.length - 1);
    if (hops === 0) {
      return {
        rawScore: 0,
        crispGrade: "Minimal",
        linguisticDistribution: { Minimal: 1.0, Low: 0.0, Moderate: 0.0, High: 0.0, Critical: 0.0 },
        rationale: "Self-referential or empty path with zero friction.",
      };
    }

    let sumImpedance = 0;
    let minConfidence = 1.0;
    for (const step of steps) {
      sumImpedance += step.fuzzyStepImpedance ?? 15;
      if (step.confidence !== undefined) {
        minConfidence = Math.min(minConfidence, step.confidence);
      }
    }

    const avgStepImpedance = sumImpedance / hops;
    const hopPenalty = Math.min(30, hops * 5);
    const confidencePenalty = (1.0 - minConfidence) * 40;

    let rawScore = Math.min(100, Math.round((avgStepImpedance * 0.5 + hopPenalty + confidencePenalty) * 10) / 10);

    // Fuzzification for Path Distribution
    const wMinimal = FuzzyInferenceEngine.trapmf(rawScore, -1, 0, 15, 25);
    const wLow = FuzzyInferenceEngine.trimf(rawScore, 15, 30, 45);
    const wModerate = FuzzyInferenceEngine.trimf(rawScore, 35, 55, 70);
    const wHigh = FuzzyInferenceEngine.trimf(rawScore, 60, 75, 88);
    const wCritical = FuzzyInferenceEngine.trapmf(rawScore, 80, 90, 100, 101);

    let crispGrade: FuzzyLinguisticGrade = "Minimal";
    if (rawScore >= 80) crispGrade = "Critical";
    else if (rawScore >= 60) crispGrade = "High";
    else if (rawScore >= 35) crispGrade = "Moderate";
    else if (rawScore >= 15) crispGrade = "Low";

    let rationale = "";
    if (crispGrade === "Critical") {
      rationale = `Hazardous trajectory with ${hops} hops and severe cumulative friction. Highly prone to brittle failure across transitions.`;
    } else if (crispGrade === "High") {
      rationale = `Elevated path resistance across ${hops} hops. Involves cross-cutting architectural boundaries or lower confidence edges.`;
    } else if (crispGrade === "Moderate") {
      rationale = `Balanced path traversal (${hops} hops) with standard architectural friction.`;
    } else if (crispGrade === "Low") {
      rationale = `Clean, direct path (${hops} hops) through well-calibrated, high-confidence nodes.`;
    } else {
      rationale = `Near-zero resistance path. Highly cohesive direct call chain.`;
    }

    return {
      rawScore,
      crispGrade,
      linguisticDistribution: {
        Minimal: Math.round(wMinimal * 100) / 100,
        Low: Math.round(wLow * 100) / 100,
        Moderate: Math.round(wModerate * 100) / 100,
        High: Math.round(wHigh * 100) / 100,
        Critical: Math.round(wCritical * 100) / 100,
      },
      rationale,
    };
  }

  /**
   * Evaluates the dead-code likelihood of a symbol using systematic fuzzy logic.
   */
  public static evaluateDeadCodeLikelihood(
    node: NodeRecord,
    inboundCount: number,
    outboundCount: number,
    isExported: boolean,
  ): FuzzyEvaluationResult {
    const Ca = inboundCount;

    // Fuzzification
    const caZero = Ca === 0 ? 1.0 : 0.0;
    const caNonZero = Ca > 0 ? 1.0 : 0.0;
    const expTrue = isExported ? 1.0 : 0.0;
    const expFalse = !isExported ? 1.0 : 0.0;

    let wMinimal = 0.0;
    let wLow = 0.0;
    let wModerate = 0.0;
    let wHigh = 0.0;
    let wCritical = 0.0;

    // Rule 1: IF Ca is Zero AND Not Exported THEN DeadCode is Critical
    wCritical = FuzzyInferenceEngine.and(caZero, expFalse);

    // Rule 2: IF Ca is Zero AND Exported THEN DeadCode is Low (likely Public API)
    wLow = FuzzyInferenceEngine.and(caZero, expTrue);

    // Rule 3: IF Ca > 0 THEN DeadCode is Minimal
    wMinimal = caNonZero;

    const centers = { Minimal: 5, Low: 25, Moderate: 50, High: 75, Critical: 95 };
    const denom = wMinimal + wLow + wModerate + wHigh + wCritical;
    const rawScore = denom > 0 ? (wMinimal * centers.Minimal + wLow * centers.Low + wCritical * centers.Critical) / denom : 5;

    let crispGrade: FuzzyLinguisticGrade = "Minimal";
    if (rawScore >= 80) crispGrade = "Critical";
    else if (rawScore >= 55) crispGrade = "High";
    else if (rawScore >= 35) crispGrade = "Moderate";
    else if (rawScore >= 15) crispGrade = "Low";

    let rationale = "";
    if (crispGrade === "Critical") {
      rationale = `Unreferenced internal symbol (${node.name}): 0 inbound callers and not exported. Very likely dead code.`;
    } else if (crispGrade === "Low") {
      rationale = `Exported symbol with 0 internal callers: likely public API entry point or framework hook.`;
    } else {
      rationale = `Active symbol with ${Ca} inbound callers. Not a dead code candidate.`;
    }

    return {
      rawScore: Math.round(rawScore * 10) / 10,
      crispGrade,
      linguisticDistribution: {
        Minimal: Math.round(wMinimal * 100) / 100,
        Low: Math.round(wLow * 100) / 100,
        Moderate: 0.0,
        High: 0.0,
        Critical: Math.round(wCritical * 100) / 100,
      },
      rationale,
    };
  }

  /**
   * Evaluates the God Component / Brain Class smell likelihood using systematic fuzzy logic.
   */
  public static evaluateGodComponentLikelihood(
    node: NodeRecord,
    degree: number,
  ): FuzzyEvaluationResult {
    // Fuzzification
    const degCompact = FuzzyInferenceEngine.trapmf(degree, -1, 0, 4, 7);
    const degModular = FuzzyInferenceEngine.trimf(degree, 5, 10, 16);
    const degDense = FuzzyInferenceEngine.trimf(degree, 12, 18, 25);
    const degMonstrous = FuzzyInferenceEngine.trapmf(degree, 20, 28, 1000, 1000);

    let wMinimal = degCompact;
    let wLow = degModular;
    let wModerate = degDense;
    let wCritical = degMonstrous;

    const centers = { Minimal: 5, Low: 25, Moderate: 55, Critical: 95 };
    const denom = wMinimal + wLow + wModerate + wCritical;
    const rawScore = denom > 0 ? (wMinimal * centers.Minimal + wLow * centers.Low + wModerate * centers.Moderate + wCritical * centers.Critical) / denom : 10;

    let crispGrade: FuzzyLinguisticGrade = "Minimal";
    if (rawScore >= 80) crispGrade = "Critical";
    else if (rawScore >= 55) crispGrade = "High";
    else if (rawScore >= 35) crispGrade = "Moderate";
    else if (rawScore >= 15) crispGrade = "Low";

    let rationale = "";
    if (crispGrade === "Critical") {
      rationale = `Severe God Component smell: excessive coupling (degree ${degree}). Breaches Single Responsibility Principle.`;
    } else if (crispGrade === "Moderate" || crispGrade === "High") {
      rationale = `Dense hub with coupling degree ${degree}. Candidate for modular decomposition.`;
    } else {
      rationale = `Well-bounded component with balanced degree ${degree}.`;
    }

    return {
      rawScore: Math.round(rawScore * 10) / 10,
      crispGrade,
      linguisticDistribution: {
        Minimal: Math.round(wMinimal * 100) / 100,
        Low: Math.round(wLow * 100) / 100,
        Moderate: Math.round(wModerate * 100) / 100,
        High: 0.0,
        Critical: Math.round(wCritical * 100) / 100,
      },
      rationale,
    };
  }
}
