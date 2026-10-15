import { describe, it, expect } from "vitest";
import type { NodeRecord, EdgeRecord, VibeMemoryRecord } from "@ruas/core";
import { AiNativeGenerator } from "../ai-native-generator.js";

describe("AiNativeGenerator (AI Mother Tongue)", () => {
  const nodes: NodeRecord[] = [
    {
      id: "f1",
      fileId: "f1",
      kind: "file",
      name: "checkout.ts",
      qualifiedName: "src/checkout.ts",
      startLine: 1,
      endLine: 50,
      signature: null,
      docComment: null,
      tokens: "checkout",
    },
    {
      id: "n1",
      fileId: "f1",
      kind: "function",
      name: "checkoutOrder",
      qualifiedName: "src/checkout.ts:checkoutOrder",
      startLine: 10,
      endLine: 25,
      signature: "checkoutOrder(cart: Cart): Promise<Order>",
      docComment: "Execute order checkout flow",
      tokens: "checkout order cart",
    },
    {
      id: "n2",
      fileId: "f1",
      kind: "function",
      name: "prosesQRIS",
      qualifiedName: "src/checkout.ts:prosesQRIS",
      startLine: 30,
      endLine: 45,
      signature: "prosesQRIS(trxId: string, amount: number): boolean",
      docComment: "Process QRIS static / dynamic settlement",
      tokens: "proses qris settlement",
    },
  ];

  const edges: EdgeRecord[] = [
    {
      id: "e1",
      srcId: "n1",
      dstId: "n2",
      kind: "calls",
      alpha: 9,
      beta: 1, // 90% Bayesian confidence
      evidenceJson: null,
    },
  ];

  const vibeMemory: VibeMemoryRecord = {
    id: "vibe-1234",
    timestamp: Date.now(),
    intent: "Migrating static QRIS to dynamic snap QRIS",
    activeFiles: ["src/checkout.ts"],
    architecturalNotes: "QRIS settlement must be atomic. Never split voucher deductions.",
    pendingDecisions: ["Review gateway timeout", "Verify webhook signature"],
    sessionTag: "payment-vibe",
  };

  it("generates structured AI-native mother tongue manifest", () => {
    const manifest = AiNativeGenerator.generate({
      projectRoot: "/mock/repo",
      nodes,
      edges,
      vibeMemory,
    });

    expect(manifest.schemaVersion).toBe("1.0.0");
    expect(manifest.totalSymbols).toBe(3);
    expect(manifest.totalEdges).toBe(1);
    expect(manifest.godSymbols.length).toBeGreaterThan(0);
    expect(manifest.criticalTrajectories.length).toBe(1);

    // Verify Markdown format
    const md = manifest.rawMarkdown;
    expect(md).toContain("ruas_dialect: ai-native/v1");
    expect(md).toContain("Migrating static QRIS to dynamic snap QRIS");
    expect(md).toContain("QRIS settlement must be atomic");
    expect(md).toContain("Review gateway timeout");
    expect(md).toContain("[checkoutOrder] --(CALLS:90%)--> [prosesQRIS]");
    expect(md).toContain("[function] `prosesQRIS` :: prosesQRIS(trxId: string, amount: number): boolean");
  });
});
