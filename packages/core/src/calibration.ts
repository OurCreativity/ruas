/**
 * Expected Calibration Error (ECE) and Maximum Calibration Error (MCE)
 * calculation for evaluating probabilistic Bayesian edge priors.
 *
 * Clean-room implementation derived from standard statistical calibration literature
 * (Naeini et al., AAAI 2015; Guo et al., ICML 2017).
 */

export interface CalibrationSample {
  readonly predictedProb: number; // in [0, 1]
  readonly trueLabel: 0 | 1;
}

export interface CalibrationBin {
  readonly binIndex: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly sampleCount: number;
  readonly meanConfidence: number;
  readonly accuracy: number;
  readonly absoluteError: number;
}

export interface CalibrationReport {
  readonly totalSamples: number;
  readonly numBins: number;
  readonly ece: number;
  readonly mce: number;
  readonly bins: readonly CalibrationBin[];
  readonly isWellCalibrated: boolean; // ECE <= 0.15
}

/**
 * Calculates Expected Calibration Error (ECE) across M equally spaced probability bins.
 * ECE = sum_{m=1}^M (|B_m| / N) * |acc(B_m) - conf(B_m)|
 */
export function calculateExpectedCalibrationError(
  samples: readonly CalibrationSample[],
  numBins = 10,
): CalibrationReport {
  const N = samples.length;
  if (N === 0) {
    return {
      totalSamples: 0,
      numBins,
      ece: 0,
      mce: 0,
      bins: [],
      isWellCalibrated: true,
    };
  }

  const binStep = 1.0 / numBins;
  const binCounts = new Array<number>(numBins).fill(0);
  const binProbSums = new Array<number>(numBins).fill(0);
  const binLabelSums = new Array<number>(numBins).fill(0);

  for (const s of samples) {
    const prob = Math.max(0, Math.min(1, s.predictedProb));
    let binIdx = Math.floor(prob / binStep);
    if (binIdx >= numBins) {
      binIdx = numBins - 1; // handle boundary 1.0
    }

    const currentCount = binCounts[binIdx] ?? 0;
    binCounts[binIdx] = currentCount + 1;
    const currentProbSum = binProbSums[binIdx] ?? 0;
    binProbSums[binIdx] = currentProbSum + prob;
    const currentLabelSum = binLabelSums[binIdx] ?? 0;
    binLabelSums[binIdx] = currentLabelSum + s.trueLabel;
  }

  let weightedEceSum = 0;
  let maxCalibrationError = 0;
  const bins: CalibrationBin[] = [];

  for (let m = 0; m < numBins; m++) {
    const count = binCounts[m]!;
    const lower = m * binStep;
    const upper = (m + 1) * binStep;

    if (count === 0) {
      bins.push({
        binIndex: m,
        lowerBound: lower,
        upperBound: upper,
        sampleCount: 0,
        meanConfidence: (lower + upper) / 2,
        accuracy: (lower + upper) / 2,
        absoluteError: 0,
      });
      continue;
    }

    const meanConf = binProbSums[m]! / count;
    const accuracy = binLabelSums[m]! / count;
    const absError = Math.abs(accuracy - meanConf);

    weightedEceSum += (count / N) * absError;
    if (absError > maxCalibrationError) {
      maxCalibrationError = absError;
    }

    bins.push({
      binIndex: m,
      lowerBound: lower,
      upperBound: upper,
      sampleCount: count,
      meanConfidence: meanConf,
      accuracy,
      absoluteError: absError,
    });
  }

  return {
    totalSamples: N,
    numBins,
    ece: weightedEceSum,
    mce: maxCalibrationError,
    bins,
    isWellCalibrated: weightedEceSum <= 0.15,
  };
}
