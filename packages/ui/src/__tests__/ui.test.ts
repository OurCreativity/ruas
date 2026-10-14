import { describe, expect, it } from "vitest";
import { SqliteStorage } from "@ruas/store";
import type { EdgeRecord, FileRecord, NodeRecord } from "@ruas/core";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  buildGraphPayload,
  exportStandaloneHtml,
  renderGraphHtml,
  startGraphServer,
} from "../index.js";

describe("@ruas/ui Visual Graph Explorer", () => {
  it("builds payload and renders standalone glassmorphic graph HTML", async () => {
    const storage = new SqliteStorage({ dbPath: ":memory:" });
    await storage.init();

    const file: FileRecord = {
      id: "f1",
      path: "src/payment/qris.ts",
      lang: "typescript",
      contentHash: "hash1",
      size: 500,
      mtime: Date.now(),
      indexedAt: Date.now(),
    };
    await storage.upsertFile(file);

    const n1: NodeRecord = {
      id: "n1",
      fileId: "f1",
      kind: "function",
      name: "processQrisPayment",
      qualifiedName: "src/payment/qris.ts:processQrisPayment",
      startLine: 10,
      endLine: 35,
      signature: "function processQrisPayment(): void",
      docComment: "Bayar via QRIS",
      tokens: "bayar qris payment",
    };
    const n2: NodeRecord = {
      id: "n2",
      fileId: "f1",
      kind: "function",
      name: "verifySignature",
      qualifiedName: "src/payment/qris.ts:verifySignature",
      startLine: 40,
      endLine: 50,
      signature: "function verifySignature(): boolean",
      docComment: "Cek validitas signature",
      tokens: "verify signature cek",
    };
    await storage.upsertNodes([n1, n2]);

    const edge: EdgeRecord = {
      id: "e1",
      srcId: "n1",
      dstId: "n2",
      kind: "calls",
      alpha: 19,
      beta: 1,
      evidenceJson: null,
    };
    await storage.upsertEdges([edge]);

    const payload = await buildGraphPayload(storage, "Test Commerce");
    expect(payload.projectName).toBe("Test Commerce");
    expect(payload.nodes.length).toBe(2);
    expect(payload.edges.length).toBe(1);
    expect(payload.subsystems.length).toBeGreaterThanOrEqual(1);

    const html = renderGraphHtml(payload);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Ruas — Visual Code Intelligence");
    expect(html).toContain("processQrisPayment");
    expect(html).toContain("verifySignature");
    expect(html).toContain("graph-canvas");

    // Test exportStandaloneHtml
    const tmpOut = join(process.cwd(), ".tmp", "test-graph.html");
    await exportStandaloneHtml(storage, tmpOut, "Test Commerce");
    expect(existsSync(tmpOut)).toBe(true);
    const savedHtml = readFileSync(tmpOut, "utf-8");
    expect(savedHtml).toContain("processQrisPayment");
    rmSync(tmpOut, { force: true });

    // Test startGraphServer on ephemeral port
    const server = await startGraphServer({ storage, port: 0 });
    expect(server.port).toBeGreaterThan(0);
    expect(server.url).toContain("http://localhost:");

    // Fetch /api/graph
    const res = await fetch(`${server.url}/api/graph`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as typeof payload;
    expect(json.projectName).toBe("Ruas Project");
    expect(json.nodes.length).toBe(2);

    // Fetch /
    const htmlRes = await fetch(`${server.url}/`);
    expect(htmlRes.status).toBe(200);
    const text = await htmlRes.text();
    expect(text).toContain("<!DOCTYPE html>");

    await server.close();
    await storage.close();
  });
});
