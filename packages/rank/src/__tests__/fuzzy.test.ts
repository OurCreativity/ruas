import { describe, it, expect } from "vitest";
import type { NodeRecord } from "@ruas/core";
import { FuzzyMatcher } from "../fuzzy-matcher.js";
import { FuzzyInferenceEngine } from "../fuzzy-inference.js";
import { ArchitectureAnalyzer } from "../architecture.js";

describe("FuzzyMatcher (Systematic Fuzzy String & Acronym Matching)", () => {
  it("computes Damerau-Levenshtein distance with adjacent transpositions", () => {
    expect(FuzzyMatcher.damerauLevenshteinDistance("proses", "proses")).toBe(0);
    expect(FuzzyMatcher.damerauLevenshteinDistance("proses", "prses")).toBe(1); // deletion
    expect(FuzzyMatcher.damerauLevenshteinDistance("proses", "prosess")).toBe(1); // insertion
    expect(FuzzyMatcher.damerauLevenshteinDistance("proses", "praxis")).toBe(3); // 3 substitutions
    expect(FuzzyMatcher.damerauLevenshteinDistance("qris", "rqis")).toBe(1); // adjacent transposition
  });

  it("splits identifiers correctly into sub-tokens", () => {
    expect(FuzzyMatcher.splitIdentifier("prosesQRIS")).toEqual(["proses", "qris"]);
    expect(FuzzyMatcher.splitIdentifier("InvoiceGenerator")).toEqual(["invoice", "generator"]);
    expect(FuzzyMatcher.splitIdentifier("calculate_direct_discount")).toEqual([
      "calculate",
      "direct",
      "discount",
    ]);
    expect(FuzzyMatcher.splitIdentifier("verifySession")).toEqual(["verify", "session"]);
  });

  it("recognizes acronyms and camelCase sub-word prefixes", () => {
    expect(FuzzyMatcher.acronymSimilarity("pQRIS", "prosesQRIS")).toBeGreaterThanOrEqual(0.85);
    expect(FuzzyMatcher.acronymSimilarity("invGen", "InvoiceGenerator")).toBeGreaterThanOrEqual(0.85);
    expect(FuzzyMatcher.acronymSimilarity("ig", "InvoiceGenerator")).toBeGreaterThanOrEqual(0.85);
    expect(FuzzyMatcher.acronymSimilarity("calcDisc", "calculateDirectDiscount")).toBeGreaterThanOrEqual(0.75);
    expect(FuzzyMatcher.acronymSimilarity("xyz", "prosesQRIS")).toBe(0.0);
  });

  it("matches candidate symbols with typos, acronyms, and prefix bonus", () => {
    const mockNodes: NodeRecord[] = [
      {
        id: "1",
        fileId: "f1",
        kind: "function",
        name: "prosesQRIS",
        qualifiedName: "src/payment.ts:prosesQRIS",
        startLine: 1,
        endLine: 10,
        signature: "function prosesQRIS()",
        docComment: null,
        tokens: "proses qris",
      },
      {
        id: "2",
        fileId: "f1",
        kind: "class",
        name: "InvoiceGenerator",
        qualifiedName: "src/billing.ts:InvoiceGenerator",
        startLine: 1,
        endLine: 20,
        signature: "class InvoiceGenerator",
        docComment: null,
        tokens: "invoice generator",
      },
      {
        id: "3",
        fileId: "f1",
        kind: "function",
        name: "verifySession",
        qualifiedName: "src/auth.ts:verifySession",
        startLine: 1,
        endLine: 5,
        signature: "function verifySession()",
        docComment: null,
        tokens: "verify session",
      },
    ];

    // Typo match
    const typoHits = FuzzyMatcher.matchCandidates("prosessQRIS", mockNodes, { threshold: 0.5 });
    expect(typoHits.length).toBeGreaterThan(0);
    expect(typoHits[0]!.node.name).toBe("prosesQRIS");

    // Acronym match
    const acronymHits = FuzzyMatcher.matchCandidates("invGen", mockNodes, { threshold: 0.5 });
    expect(acronymHits.length).toBeGreaterThan(0);
    expect(acronymHits[0]!.node.name).toBe("InvoiceGenerator");

    // Qualified name match
    const qHits = FuzzyMatcher.matchCandidates("auth", mockNodes, { threshold: 0.4 });
    expect(qHits.some((h) => h.node.name === "verifySession")).toBe(true);
  });
});

describe("FuzzyInferenceEngine (Mamdani Model & Zadeh Operations)", () => {
  it("evaluates mathematical membership functions correctly", () => {
    // trimf(x, [0, 5, 10])
    expect(FuzzyInferenceEngine.trimf(-1, 0, 5, 10)).toBe(0.0);
    expect(FuzzyInferenceEngine.trimf(5, 0, 5, 10)).toBe(1.0);
    expect(FuzzyInferenceEngine.trimf(2.5, 0, 5, 10)).toBe(0.5);
    expect(FuzzyInferenceEngine.trimf(7.5, 0, 5, 10)).toBe(0.5);
    expect(FuzzyInferenceEngine.trimf(11, 0, 5, 10)).toBe(0.0);

    // trapmf(x, [0, 2, 8, 10])
    expect(FuzzyInferenceEngine.trapmf(5, 0, 2, 8, 10)).toBe(1.0);
    expect(FuzzyInferenceEngine.trapmf(1, 0, 2, 8, 10)).toBe(0.5);
    expect(FuzzyInferenceEngine.trapmf(9, 0, 2, 8, 10)).toBe(0.5);
    expect(FuzzyInferenceEngine.trapmf(12, 0, 2, 8, 10)).toBe(0.0);

    // sigmf and gaussmf
    expect(FuzzyInferenceEngine.sigmf(5, 1, 5)).toBe(0.5);
    expect(FuzzyInferenceEngine.gaussmf(5, 2, 5)).toBe(1.0);
  });

  it("computes Zadeh T-Norm (AND), S-Norm (OR), and Negation (NOT)", () => {
    expect(FuzzyInferenceEngine.and(0.7, 0.4)).toBe(0.4);
    expect(FuzzyInferenceEngine.or(0.7, 0.4)).toBe(0.7);
    expect(FuzzyInferenceEngine.not(0.3)).toBeCloseTo(0.7);
  });

  it("evaluates symbol blast radius risk with Mamdani inference", () => {
    const mockNode: NodeRecord = {
      id: "hub-1",
      fileId: "f1",
      kind: "function",
      name: "corePaymentRouter",
      qualifiedName: "src/router.ts:corePaymentRouter",
      startLine: 1,
      endLine: 20,
      signature: "function corePaymentRouter()",
      docComment: null,
      tokens: "core payment router",
    };

    // Critical God Node / Hub (High Ca, Sprawling Ce)
    const criticalResult = FuzzyInferenceEngine.evaluateSymbolRisk(mockNode, 15, 12);
    expect(criticalResult.rawScore).toBeGreaterThanOrEqual(80);
    expect(criticalResult.crispGrade).toBe("Critical");
    expect(criticalResult.linguisticDistribution.Critical).toBeGreaterThan(0.5);
    expect(criticalResult.rationale).toContain("Critical hub");

    // Isolated Leaf Utility (Ca = 0, Ce = 0)
    const leafResult = FuzzyInferenceEngine.evaluateSymbolRisk(mockNode, 0, 0);
    expect(leafResult.rawScore).toBeLessThanOrEqual(25);
    expect(leafResult.crispGrade).toBe("Minimal");
    expect(leafResult.linguisticDistribution.Minimal).toBeGreaterThan(0.5);

    // Moderate coupling symbol
    const modResult = FuzzyInferenceEngine.evaluateSymbolRisk(mockNode, 3, 2);
    expect(modResult.crispGrade).toBe("Moderate");
    expect(modResult.rawScore).toBeGreaterThanOrEqual(40);
    expect(modResult.rawScore).toBeLessThanOrEqual(75);
  });

  it("integrates fuzzy evaluation into ArchitectureAnalyzer health report", () => {
    const mockNodes: NodeRecord[] = [
      {
        id: "a",
        fileId: "f1",
        kind: "function",
        name: "foo",
        qualifiedName: "src/a.ts:foo",
        startLine: 1,
        endLine: 5,
        signature: null,
        docComment: null,
        tokens: "foo",
      },
      {
        id: "b",
        fileId: "f2",
        kind: "function",
        name: "bar",
        qualifiedName: "src/b.ts:bar",
        startLine: 1,
        endLine: 5,
        signature: null,
        docComment: null,
        tokens: "bar",
      },
    ];

    const report = ArchitectureAnalyzer.calculateHealth(mockNodes, []);
    expect(report.fuzzyEvaluation).toBeDefined();
    expect(report.fuzzyEvaluation!.rawScore).toBe(75);
    expect(report.fuzzyEvaluation!.linguisticDistribution).toBeDefined();
    expect(report.fuzzyEvaluation!.linguisticDistribution.Fair).toBeGreaterThan(0);
  });
});
