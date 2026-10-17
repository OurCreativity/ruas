import { describe, expect, it } from "vitest";
import { CodeParser } from "../parser-facade.js";

describe("@ruas/parser Java Extractor", () => {
  const codeParser = new CodeParser();

  const sampleJava = `
package com.ruas.bank;

import java.util.List;
import com.ruas.security.TokenValidator;

/**
 * Layanan transfer bank digital
 */
public class BankTransferService extends BaseTransfer implements IBankTransfer {
    private final TokenValidator validator;

    public BankTransferService(TokenValidator validator) {
        this.validator = validator;
    }

    /**
     * Transfer dana antar rekening
     */
    public boolean transferDana(String rekeningTujuan, long nominal) {
        if (validator.validateToken()) {
            prosesTransfer(rekeningTujuan, nominal);
            return true;
        }
        return false;
    }

    private void prosesTransfer(String rekening, long nominal) {
    }
}
`;

  it("extracts package, class, inheritance, methods, constructor, and references from Java", async () => {
    const result = await codeParser.parseFile("src/BankTransferService.java", sampleJava, "java");

    // 1. File node
    const fileNode = result.nodes.find((n) => n.kind === "file");
    expect(fileNode).toBeDefined();
    expect(fileNode?.name).toBe("BankTransferService.java");

    // 2. Package module node
    const pkgNode = result.nodes.find((n) => n.kind === "module" && n.name === "com.ruas.bank");
    expect(pkgNode).toBeDefined();

    // 3. Class node
    const classNode = result.nodes.find((n) => n.kind === "class" && n.name === "BankTransferService");
    expect(classNode).toBeDefined();
    expect(classNode?.docComment).toContain("Layanan transfer bank digital");

    // 4. Extends and Implements
    const extendsRef = result.unresolvedRefs.find((r) => r.kind === "extends" && r.name === "BaseTransfer");
    expect(extendsRef).toBeDefined();

    const implementsRef = result.unresolvedRefs.find((r) => r.kind === "implements" && r.name === "IBankTransfer");
    expect(implementsRef).toBeDefined();

    // 5. Method
    const methodNode = result.nodes.find((n) => n.name === "transferDana" && n.kind === "method");
    expect(methodNode).toBeDefined();
    expect(methodNode?.qualifiedName).toContain("BankTransferService.transferDana");
    expect(methodNode?.docComment).toContain("Transfer dana antar rekening");

    // 6. Contains edge
    const containsEdge = result.edges.find((e) => e.srcId === classNode?.id && e.dstId === methodNode?.id);
    expect(containsEdge).toBeDefined();
    expect(containsEdge?.kind).toBe("contains");

    // 7. Imports
    const importRefs = result.unresolvedRefs.filter((r) => r.kind === "imports");
    expect(importRefs.some((r) => r.name.includes("TokenValidator"))).toBe(true);

    // 8. Calls
    const callRefs = result.unresolvedRefs.filter((r) => r.kind === "calls");
    expect(callRefs.some((r) => r.name === "validateToken")).toBe(true);
    expect(callRefs.some((r) => r.name === "prosesTransfer")).toBe(true);
  });
});
