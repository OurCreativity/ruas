import { describe, expect, it } from "vitest";
import { CodeParser } from "../parser-facade.js";
import { splitIdentifierTokens } from "../utils/tokenizer.js";

describe("@ruas/parser Tokenizer", () => {
  it("splits mixed case, camelCase, snake_case, and acronyms", () => {
    expect(splitIdentifierTokens("hitungDiskonPelanggan")).toEqual([
      "hitung",
      "diskon",
      "pelanggan",
    ]);
    expect(splitIdentifierTokens("parseHTTPResponse")).toEqual([
      "parse",
      "http",
      "response",
    ]);
    expect(splitIdentifierTokens("cek_status_ongkir_v2")).toEqual([
      "cek",
      "status",
      "ongkir",
      "v",
      "2",
    ]);
  });
});

describe("@ruas/parser Golden File Test", () => {
  const codeParser = new CodeParser();

  const sampleTypeScript = `
import { kalkulasiPajak } from "./pajak";

/**
 * Menghitung diskon belanja pelanggan.
 */
function hitungDiskon(pelangganId: string, totalBelanja: number): number {
  const pajak = kalkulasiPajak(totalBelanja);
  return totalBelanja * 0.1;
}

export class LayananPelanggan {
  /**
   * Mengambil data pelanggan dari database.
   */
  public ambilData(id: string): string {
    return "Data Pelanggan " + id;
  }
}

export interface ProfilPelanggan {
  id: string;
  nama: string;
}

const validasiOngkir = (beratKg: number): boolean => {
  return beratKg > 0;
};
`;

  it("extracts all AST nodes, contains edges, and unresolved references", async () => {
    const result = await codeParser.parseFile(
      "src/layanan/diskon.ts",
      sampleTypeScript,
      "typescript",
    );

    // 1. Nodes check
    const nodeNames = result.nodes.map((n) => n.name);
    expect(nodeNames).toContain("diskon.ts"); // File node
    expect(nodeNames).toContain("hitungDiskon"); // Function
    expect(nodeNames).toContain("LayananPelanggan"); // Class
    expect(nodeNames).toContain("ambilData"); // Method
    expect(nodeNames).toContain("ProfilPelanggan"); // Interface
    expect(nodeNames).toContain("validasiOngkir"); // Arrow function

    // Check method qualified name
    const ambilDataNode = result.nodes.find((n) => n.name === "ambilData");
    expect(ambilDataNode?.qualifiedName).toBe("LayananPelanggan.ambilData");
    expect(ambilDataNode?.kind).toBe("method");
    expect(ambilDataNode?.docComment).toContain("Mengambil data pelanggan");

    // Check function signature
    const hitungNode = result.nodes.find((n) => n.name === "hitungDiskon");
    expect(hitungNode?.signature).toBe("(pelangganId: string, totalBelanja: number): number");
    expect(hitungNode?.docComment).toContain("Menghitung diskon belanja pelanggan");

    // 2. Edges check (contains hierarchy)
    const classNode = result.nodes.find((n) => n.name === "LayananPelanggan");
    expect(classNode).toBeDefined();

    const classMethodEdge = result.edges.find(
      (e) => e.srcId === classNode?.id && e.dstId === ambilDataNode?.id,
    );
    expect(classMethodEdge).toBeDefined();
    expect(classMethodEdge?.kind).toBe("contains");

    // 3. Unresolved refs check
    const importRef = result.unresolvedRefs.find((r) => r.name === "kalkulasiPajak" && r.kind === "imports");
    expect(importRef).toBeDefined();

    const callRef = result.unresolvedRefs.find((r) => r.name === "kalkulasiPajak" && r.kind === "calls");
    expect(callRef).toBeDefined();
    expect(callRef?.srcId).toBe(hitungNode?.id);
  });
});
