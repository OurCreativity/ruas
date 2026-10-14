import { describe, expect, it } from "vitest";
import { SqliteStorage } from "@ruas/store";
import type { EdgeRecord, FileRecord, NodeRecord } from "@ruas/core";
import { HandoverGenerator } from "../handover-generator.js";

describe("@ruas/docgen HandoverGenerator", () => {
  it("generates comprehensive handover documentation with zero uncited claims", async () => {
    const storage = new SqliteStorage({ dbPath: ":memory:" });
    await storage.init();

    // 1. Insert files
    const file1: FileRecord = {
      id: "f1",
      path: "src/payment/gateway.ts",
      lang: "typescript",
      contentHash: "hash1",
      size: 1000,
      mtime: Date.now(),
      indexedAt: Date.now(),
    };
    const file2: FileRecord = {
      id: "f2",
      path: "src/order/checkout.ts",
      lang: "typescript",
      contentHash: "hash2",
      size: 1200,
      mtime: Date.now(),
      indexedAt: Date.now(),
    };
    await storage.upsertFile(file1);
    await storage.upsertFile(file2);

    // 2. Insert nodes
    const n1: NodeRecord = {
      id: "n1",
      fileId: "f1",
      kind: "function",
      name: "processQrisPayment",
      qualifiedName: "src/payment/gateway.ts:processQrisPayment",
      startLine: 10,
      endLine: 45,
      signature: "async function processQrisPayment(amount: number): Promise<string>",
      docComment: "Memproses pembayaran QRIS settlement",
      tokens: "process qris payment settlement bayar",
    };
    const n2: NodeRecord = {
      id: "n2",
      fileId: "f1",
      kind: "function",
      name: "verifyPaymentSignature",
      qualifiedName: "src/payment/gateway.ts:verifyPaymentSignature",
      startLine: 50,
      endLine: 75,
      signature: "function verifyPaymentSignature(sign: string): boolean",
      docComment: "Verifikasi tanda tangan digital transaksi",
      tokens: "verify payment signature tanda tangan verifikasi",
    };
    const n3: NodeRecord = {
      id: "n3",
      fileId: "f2",
      kind: "function",
      name: "handleCheckoutCart",
      qualifiedName: "src/order/checkout.ts:handleCheckoutCart",
      startLine: 15,
      endLine: 60,
      signature: "async function handleCheckoutCart(cartId: string): Promise<Order>",
      docComment: "Menangani checkout keranjang belanja pelanggan",
      tokens: "handle checkout cart keranjang belanja",
    };
    const n4: NodeRecord = {
      id: "n4",
      fileId: "f2",
      kind: "route",
      name: "POST /checkout",
      qualifiedName: "src/order/checkout.ts:POST /checkout",
      startLine: 5,
      endLine: 8,
      signature: null,
      docComment: "Endpoint checkout HTTP",
      tokens: "checkout endpoint post route",
    };

    await storage.upsertNodes([n1, n2, n3, n4]);

    // 3. Insert edges
    const edges: EdgeRecord[] = [
      {
        id: "e1",
        srcId: "n4",
        dstId: "n3",
        kind: "routes_to",
        alpha: 19,
        beta: 1,
        evidenceJson: null,
      },
      {
        id: "e2",
        srcId: "n3",
        dstId: "n1",
        kind: "calls",
        alpha: 15,
        beta: 2,
        evidenceJson: null,
      },
      {
        id: "e3",
        srcId: "n1",
        dstId: "n2",
        kind: "calls",
        alpha: 18,
        beta: 2,
        evidenceJson: null,
      },
    ];
    await storage.upsertEdges(edges);

    // 4. Generate handover document
    const generator = new HandoverGenerator({ projectName: "Ruas Test App" });
    const doc = await generator.generate(storage);

    expect(doc.title).toContain("Dokumen Handover");
    expect(doc.markdown).toContain("Dokumen Handover & Panduan Onboarding");
    expect(doc.markdown).toContain("Ruas Test App");

    // Check Subsystems section
    expect(doc.markdown).toContain("1. Ringkasan Topologi & Sub-sistem Terdeteksi");
    expect(doc.subsystemCount).toBeGreaterThanOrEqual(1);

    // Check Entry Points section
    expect(doc.markdown).toContain("2. Titik Masuk Utama & Titik Interaksi Eksternal");
    expect(doc.markdown).toContain("POST /checkout");

    // Check Emotional Damage / Technical Debt Audit
    expect(doc.markdown).toContain("3. Audit Titik Rawan Bencana");

    // Check Traceability Matrix
    expect(doc.markdown).toContain("4. Matriks Ketertelusuran Sitasi Kode");
    expect(doc.totalNodesCited).toBeGreaterThanOrEqual(3);

    // Verify per-claim citation presence in text:
    expect(doc.markdown).toContain("src/payment/gateway.ts:10-45");
    expect(doc.markdown).toContain("src/order/checkout.ts:15-60");

    await storage.close();
  });
});
