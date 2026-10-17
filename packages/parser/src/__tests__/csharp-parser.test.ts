import { describe, expect, it } from "vitest";
import { CodeParser } from "../parser-facade.js";

describe("@ruas/parser C# Extractor", () => {
  const codeParser = new CodeParser();

  const sampleCSharp = `
using System;
using Ruas.Security;

namespace Ruas.Banking;

/// <summary>
/// Layanan transfer bank digital
/// </summary>
public class BankTransferService : BaseTransfer, IBankTransfer
{
    private readonly TokenValidator _validator;

    public BankTransferService(TokenValidator validator)
    {
        _validator = validator;
    }

    /// <summary>
    /// Transfer dana antar rekening
    /// </summary>
    public bool TransferDana(string rekeningTujuan, decimal nominal)
    {
        if (_validator.ValidateToken())
        {
            ProsesTransfer(rekeningTujuan, nominal);
            return true;
        }
        return false;
    }

    private void ProsesTransfer(string rekening, decimal nominal)
    {
    }
}
`;

  it("extracts namespace, class, inheritance, methods, constructor, and references from C#", async () => {
    const result = await codeParser.parseFile("src/BankTransferService.cs", sampleCSharp, "csharp");

    // 1. File node
    const fileNode = result.nodes.find((n) => n.kind === "file");
    expect(fileNode).toBeDefined();
    expect(fileNode?.name).toBe("BankTransferService.cs");

    // 2. Namespace module node
    const nsNode = result.nodes.find((n) => n.kind === "module" && n.name === "Ruas.Banking");
    expect(nsNode).toBeDefined();

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
    const methodNode = result.nodes.find((n) => n.name === "TransferDana" && n.kind === "method");
    expect(methodNode).toBeDefined();
    expect(methodNode?.qualifiedName).toContain("BankTransferService.TransferDana");
    expect(methodNode?.docComment).toContain("Transfer dana antar rekening");

    // 6. Contains edge
    const containsEdge = result.edges.find((e) => e.srcId === classNode?.id && e.dstId === methodNode?.id);
    expect(containsEdge).toBeDefined();
    expect(containsEdge?.kind).toBe("contains");

    // 7. Usings
    const importRefs = result.unresolvedRefs.filter((r) => r.kind === "imports");
    expect(importRefs.some((r) => r.name.includes("Ruas.Security"))).toBe(true);

    // 8. Calls
    const callRefs = result.unresolvedRefs.filter((r) => r.kind === "calls");
    expect(callRefs.some((r) => r.name === "ValidateToken")).toBe(true);
    expect(callRefs.some((r) => r.name === "ProsesTransfer")).toBe(true);
  });
});
