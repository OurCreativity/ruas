import { describe, expect, it } from "vitest";
import { CodeParser } from "../parser-facade.js";

describe("@ruas/parser Python Extractor", () => {
  const codeParser = new CodeParser();

  const samplePython = `
import os
from services.payment import proses_transaksi, verifikasi_otp as verify_otp

class LayananPembayaran(BasePaymentService):
    """
    Kelas untuk menangani pembayaran digital dan QRIS.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key

    def bayar_qris(self, user_id: str, nominal: int) -> bool:
        """
        Memproses pembayaran QRIS pelanggan.
        """
        valid = verify_otp(user_id)
        if valid:
            return proses_transaksi(user_id, nominal)
        return False

@app.get("/api/v1/pembayaran/status")
def cek_status_pembayaran(transaksi_id: str):
    """
    Endpoint HTTP untuk memeriksa status pembayaran.
    """
    return {"status": "SUCCESS", "id": transaksi_id}
`;

  it("extracts classes, inheritance, methods, functions, routes, and calls from Python", async () => {
    const result = await codeParser.parseFile("src/payment.py", samplePython, "python");

    expect(result.nodes.length).toBeGreaterThanOrEqual(4);

    // 1. File node
    const fileNode = result.nodes.find((n) => n.kind === "file");
    expect(fileNode).toBeDefined();
    expect(fileNode?.name).toBe("payment.py");

    // 2. Class node
    const classNode = result.nodes.find((n) => n.kind === "class" && n.name === "LayananPembayaran");
    expect(classNode).toBeDefined();
    expect(classNode?.docComment).toContain("Kelas untuk menangani pembayaran digital dan QRIS");
    expect(classNode?.signature).toContain("class LayananPembayaran(BasePaymentService)");

    // 3. Superclass / extends reference
    const extendsRef = result.unresolvedRefs.find((r) => r.name === "BasePaymentService" && r.kind === "extends");
    expect(extendsRef).toBeDefined();

    // 4. Method node
    const methodNode = result.nodes.find((n) => n.name === "bayar_qris" && n.kind === "method");
    expect(methodNode).toBeDefined();
    expect(methodNode?.signature).toBe("def bayar_qris(self, user_id: str, nominal: int) -> bool");
    expect(methodNode?.docComment).toContain("Memproses pembayaran QRIS pelanggan");

    // 5. Route node (decorated with @app.get)
    const routeNode = result.nodes.find((n) => n.name === "cek_status_pembayaran" && n.kind === "route");
    expect(routeNode).toBeDefined();
    expect(routeNode?.docComment).toContain("Endpoint HTTP untuk memeriksa status pembayaran");

    // 6. Imports
    const importRefs = result.unresolvedRefs.filter((r) => r.kind === "imports");
    expect(importRefs.some((r) => r.name === "os")).toBe(true);
    expect(importRefs.some((r) => r.name.includes("proses_transaksi"))).toBe(true);
    expect(importRefs.some((r) => r.name.includes("verifikasi_otp"))).toBe(true);

    // 7. Calls
    const callRefs = result.unresolvedRefs.filter((r) => r.kind === "calls");
    expect(callRefs.some((r) => r.name === "verify_otp")).toBe(true);
    expect(callRefs.some((r) => r.name === "proses_transaksi")).toBe(true);
  });
});
