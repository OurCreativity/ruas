import { describe, expect, it } from "vitest";
import { CodeParser } from "../parser-facade.js";

describe("@ruas/parser Rust Extractor", () => {
  const codeParser = new CodeParser();

  const sampleRust = `
use std::collections::HashMap;
use crate::services::payment::{proses_transaksi, verifikasi_otp};

/// Layanan untuk mengelola pembayaran digital
pub struct LayananPembayaran {
    api_key: String,
}

/// Kontrak trait untuk transaksi pembayaran
pub trait Pembayaran {
    fn bayar(&self, nominal: u64) -> bool;
}

impl LayananPembayaran {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    pub fn bayar_qris(&self, user_id: &str, nominal: u64) -> bool {
        if verifikasi_otp(user_id) {
            proses_transaksi(user_id, nominal);
            return true;
        }
        false
    }
}

impl Pembayaran for LayananPembayaran {
    fn bayar(&self, nominal: u64) -> bool {
        self.bayar_qris("user1", nominal)
    }
}

pub fn hitung_diskon(nominal: u64) -> u64 {
    nominal / 10
}
`;

  it("extracts structs, traits, impl blocks, methods, functions, and references from Rust", async () => {
    const result = await codeParser.parseFile("src/payment/service.rs", sampleRust, "rust");

    // 1. File node
    const fileNode = result.nodes.find((n) => n.kind === "file");
    expect(fileNode).toBeDefined();
    expect(fileNode?.name).toBe("service.rs");

    // 2. Struct node
    const structNode = result.nodes.find((n) => n.kind === "class" && n.name === "LayananPembayaran");
    expect(structNode).toBeDefined();
    expect(structNode?.docComment).toContain("Layanan untuk mengelola pembayaran digital");
    expect(structNode?.signature).toContain("pub struct LayananPembayaran");

    // 3. Trait node
    const traitNode = result.nodes.find((n) => n.kind === "interface" && n.name === "Pembayaran");
    expect(traitNode).toBeDefined();
    expect(traitNode?.docComment).toContain("Kontrak trait untuk transaksi pembayaran");
    expect(traitNode?.signature).toContain("pub trait Pembayaran");

    // 4. Methods inside struct impl
    const newMethod = result.nodes.find((n) => n.name === "new" && n.kind === "method");
    expect(newMethod).toBeDefined();
    expect(newMethod?.qualifiedName).toContain("LayananPembayaran.new");

    const qrisMethod = result.nodes.find((n) => n.name === "bayar_qris" && n.kind === "method");
    expect(qrisMethod).toBeDefined();
    expect(qrisMethod?.qualifiedName).toContain("LayananPembayaran.bayar_qris");

    // 5. Contains edge from struct to methods
    const structMethodEdge = result.edges.find(
      (e) => e.srcId === structNode?.id && e.dstId === qrisMethod?.id,
    );
    expect(structMethodEdge).toBeDefined();
    expect(structMethodEdge?.kind).toBe("contains");

    // 6. Trait implementation reference
    const implRef = result.unresolvedRefs.find((r) => r.kind === "implements" && r.name === "Pembayaran");
    expect(implRef).toBeDefined();
    expect(implRef?.srcId).toBe(structNode?.id);

    // 7. Standalone function
    const funcNode = result.nodes.find((n) => n.name === "hitung_diskon" && n.kind === "function");
    expect(funcNode).toBeDefined();
    expect(funcNode?.signature).toContain("fn hitung_diskon");

    // 8. Imports
    const importRefs = result.unresolvedRefs.filter((r) => r.kind === "imports");
    expect(importRefs.some((r) => r.name.includes("HashMap"))).toBe(true);
    expect(importRefs.some((r) => r.name.includes("proses_transaksi"))).toBe(true);
    expect(importRefs.some((r) => r.name.includes("verifikasi_otp"))).toBe(true);

    // 9. Calls
    const callRefs = result.unresolvedRefs.filter((r) => r.kind === "calls");
    expect(callRefs.some((r) => r.name === "verifikasi_otp")).toBe(true);
    expect(callRefs.some((r) => r.name === "proses_transaksi")).toBe(true);
    expect(callRefs.some((r) => r.name === "bayar_qris")).toBe(true);
  });
});
