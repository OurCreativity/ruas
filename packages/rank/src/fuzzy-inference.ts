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
}
