import { describe, expect, it } from "vitest";
import {
  computeBetaCredibleInterval,
  createEdgeId,
  createFileId,
  createNodeId,
  err,
  isErr,
  isOk,
  map,
  normalizePath,
  ok,
  unwrap,
  unwrapOr,
} from "../index.js";
import { NodeRecordSchema } from "../schema.js";

describe("@ruas/core Result Pattern", () => {
  it("wraps ok and err correctly", () => {
    const success = ok(42);
    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(unwrap(success)).toBe(42);

    const failure = err("database down");
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
    expect(unwrapOr(failure, 100)).toBe(100);
    expect(() => unwrap(failure)).toThrow("database down");
  });

  it("maps value when ok", () => {
    const res = ok(10);
    const mapped = map(res, (x) => x * 2);
    expect(unwrap(mapped)).toBe(20);
  });
});

describe("@ruas/core Deterministic IDs", () => {
  it("normalizes paths consistently", () => {
    expect(normalizePath("./src/foo/bar.ts")).toBe("src/foo/bar.ts");
    expect(normalizePath("src\\foo\\bar.ts")).toBe("src/foo/bar.ts");
  });

  it("generates deterministic node IDs", () => {
    const id1 = createNodeId("src/index.ts", "calculateDiscount", "function");
    const id2 = createNodeId("./src/index.ts", "calculateDiscount", "function");
    const id3 = createNodeId("src\\index.ts", "calculateDiscount", "function");
    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
    expect(id1.length).toBe(24);
  });

  it("generates deterministic edge IDs", () => {
    const id1 = createEdgeId("src1", "dst1", "calls");
    const id2 = createEdgeId("src1", "dst1", "calls");
    expect(id1).toBe(id2);
  });

  it("generates deterministic file IDs", () => {
    const id1 = createFileId("src/utils.ts");
    const id2 = createFileId("./src/utils.ts");
    expect(id1).toBe(id2);
  });
});

describe("@ruas/core Beta-Bernoulli Credible Interval", () => {
  it("computes credible intervals correctly", () => {
    const interval = computeBetaCredibleInterval(10, 2);
    expect(interval.mean).toBe(0.833);
    expect(interval.lower).toBeGreaterThan(0.5);
    expect(interval.upper).toBeLessThanOrEqual(1.0);
    expect(interval.lower).toBeLessThan(interval.mean);
    expect(interval.mean).toBeLessThan(interval.upper);
  });
});

describe("@ruas/core Zod Validation", () => {
  it("validates node record schema", () => {
    const validNode = {
      id: "node_123",
      fileId: "file_abc",
      kind: "function",
      name: "hitungDiskon",
      qualifiedName: "hitungDiskon",
      startLine: 1,
      endLine: 10,
      signature: "(pelanggan: string): number",
      docComment: "Menghitung diskon pelanggan",
      tokens: "hitung diskon pelanggan",
    };
    const parsed = NodeRecordSchema.safeParse(validNode);
    expect(parsed.success).toBe(true);
  });
});
