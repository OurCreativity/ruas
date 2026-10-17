import { describe, expect, it } from "vitest";
import { CodeParser } from "../parser-facade.js";

describe("@ruas/parser Go Extractor", () => {
  const codeParser = new CodeParser();

  const sampleGo = `
package payment

import (
	"context"
	"fmt"
	pay "services/payment"
)

// LayananPembayaran menangani transaksi dan QRIS
type LayananPembayaran struct {
	apiKey string
}

// IPembayaran adalah kontrak layanan pembayaran
type IPembayaran interface {
	Bayar(ctx context.Context, nominal int) error
}

func (s *LayananPembayaran) BayarQRIS(ctx context.Context, userId string, nominal int) (bool, error) {
	valid := pay.VerifikasiOTP(userId)
	if valid {
		return pay.ProsesTransaksi(userId, nominal), nil
	}
	return false, fmt.Errorf("invalid otp")
}

func HitungDiskon(nominal int) int {
	return nominal / 10
}
`;

  it("extracts package, types, interfaces, methods, functions, and references from Go", async () => {
    const result = await codeParser.parseFile("services/payment/service.go", sampleGo, "go");

    // 1. File node
    const fileNode = result.nodes.find((n) => n.kind === "file");
    expect(fileNode).toBeDefined();
    expect(fileNode?.name).toBe("service.go");

    // 2. Package module node
    const pkgNode = result.nodes.find((n) => n.kind === "module" && n.name === "payment");
    expect(pkgNode).toBeDefined();
    expect(pkgNode?.signature).toBe("package payment");

    // 3. Struct class node
    const structNode = result.nodes.find((n) => n.kind === "class" && n.name === "LayananPembayaran");
    expect(structNode).toBeDefined();
    expect(structNode?.docComment).toContain("LayananPembayaran menangani transaksi dan QRIS");
    expect(structNode?.signature).toBe("type LayananPembayaran struct");

    // 4. Interface node
    const ifaceNode = result.nodes.find((n) => n.kind === "interface" && n.name === "IPembayaran");
    expect(ifaceNode).toBeDefined();
    expect(ifaceNode?.docComment).toContain("IPembayaran adalah kontrak layanan pembayaran");

    // 5. Interface method
    const ifaceMethod = result.nodes.find((n) => n.name === "Bayar" && n.kind === "method");
    expect(ifaceMethod).toBeDefined();
    expect(ifaceMethod?.qualifiedName).toContain("IPembayaran.Bayar");

    // 6. Struct method
    const methodNode = result.nodes.find((n) => n.name === "BayarQRIS" && n.kind === "method");
    expect(methodNode).toBeDefined();
    expect(methodNode?.qualifiedName).toContain("LayananPembayaran.BayarQRIS");
    expect(methodNode?.signature).toContain("func (s *LayananPembayaran) BayarQRIS");

    // 7. Contains edge from struct to method
    const structMethodEdge = result.edges.find(
      (e) => e.srcId === structNode?.id && e.dstId === methodNode?.id,
    );
    expect(structMethodEdge).toBeDefined();
    expect(structMethodEdge?.kind).toBe("contains");

    // 8. Standalone function
    const funcNode = result.nodes.find((n) => n.name === "HitungDiskon" && n.kind === "function");
    expect(funcNode).toBeDefined();
    expect(funcNode?.signature).toBe("func HitungDiskon(nominal int) int");

    // 9. Imports
    const importRefs = result.unresolvedRefs.filter((r) => r.kind === "imports");
    expect(importRefs.some((r) => r.name === "context")).toBe(true);
    expect(importRefs.some((r) => r.name === "fmt")).toBe(true);
    expect(importRefs.some((r) => r.name === "services/payment")).toBe(true);

    // 10. Calls
    const callRefs = result.unresolvedRefs.filter((r) => r.kind === "calls");
    expect(callRefs.some((r) => r.name === "VerifikasiOTP")).toBe(true);
    expect(callRefs.some((r) => r.name === "ProsesTransaksi")).toBe(true);
  });
});
