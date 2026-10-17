import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CodeParser } from "../parser-facade.js";

describe("@ruas/parser Fixture Integration Tests", () => {
  const parser = new CodeParser();

  it("parses Go fixture file accurately", async () => {
    const filePath = resolve(process.cwd(), "fixtures/languages/go/payment.go");
    const content = readFileSync(filePath, "utf-8");

    const result = await parser.parseFile(filePath, content, "go");
    expect(result.nodes.length).toBeGreaterThanOrEqual(4);

    const gatewayStruct = result.nodes.find((n) => n.name === "PaymentGateway" && n.kind === "class");
    expect(gatewayStruct).toBeDefined();

    const payMethods = result.nodes.filter((n) => n.name === "Pay" && n.kind === "method");
    expect(payMethods.length).toBe(2);
    expect(payMethods.some((m) => m.qualifiedName.includes("PaymentContract.Pay"))).toBe(true);
    expect(payMethods.some((m) => m.qualifiedName.includes("PaymentGateway.Pay"))).toBe(true);

    const calculateFee = result.nodes.find((n) => n.name === "CalculateFee" && n.kind === "function");
    expect(calculateFee).toBeDefined();
  });

  it("parses Rust fixture file accurately", async () => {
    const filePath = resolve(process.cwd(), "fixtures/languages/rust/payment.rs");
    const content = readFileSync(filePath, "utf-8");

    const result = await parser.parseFile(filePath, content, "rust");
    expect(result.nodes.length).toBeGreaterThanOrEqual(4);

    const gatewayStruct = result.nodes.find((n) => n.name === "PaymentGateway" && n.kind === "class");
    expect(gatewayStruct).toBeDefined();

    const traitNode = result.nodes.find((n) => n.name === "PaymentContract" && n.kind === "interface");
    expect(traitNode).toBeDefined();

    const payMethod = result.nodes.find((n) => n.name === "pay" && n.kind === "method");
    expect(payMethod).toBeDefined();

    const implRef = result.unresolvedRefs.find((r) => r.kind === "implements" && r.name === "PaymentContract");
    expect(implRef).toBeDefined();
  });

  it("parses Java fixture file accurately", async () => {
    const filePath = resolve(process.cwd(), "fixtures/languages/java/PaymentService.java");
    const content = readFileSync(filePath, "utf-8");

    const result = await parser.parseFile(filePath, content, "java");
    expect(result.nodes.length).toBeGreaterThanOrEqual(4);

    const classNode = result.nodes.find((n) => n.name === "PaymentService" && n.kind === "class");
    expect(classNode).toBeDefined();
    expect(classNode?.docComment).toContain("Layanan pembayaran digital terintegrasi");

    const processPayment = result.nodes.find((n) => n.name === "processPayment" && n.kind === "method");
    expect(processPayment).toBeDefined();

    const extendsRef = result.unresolvedRefs.find((r) => r.kind === "extends" && r.name === "BaseService");
    expect(extendsRef).toBeDefined();

    const implementsRef = result.unresolvedRefs.find((r) => r.kind === "implements" && r.name === "IPaymentService");
    expect(implementsRef).toBeDefined();
  });

  it("parses C# fixture file accurately", async () => {
    const filePath = resolve(process.cwd(), "fixtures/languages/csharp/PaymentService.cs");
    const content = readFileSync(filePath, "utf-8");

    const result = await parser.parseFile(filePath, content, "csharp");
    expect(result.nodes.length).toBeGreaterThanOrEqual(4);

    const classNode = result.nodes.find((n) => n.name === "PaymentService" && n.kind === "class");
    expect(classNode).toBeDefined();
    expect(classNode?.docComment).toContain("Layanan pemrosesan pembayaran online");

    const processPayment = result.nodes.find((n) => n.name === "ProcessPayment" && n.kind === "method");
    expect(processPayment).toBeDefined();

    const extendsRef = result.unresolvedRefs.find((r) => r.kind === "extends" && r.name === "BaseService");
    expect(extendsRef).toBeDefined();

    const implementsRef = result.unresolvedRefs.find((r) => r.kind === "implements" && r.name === "IPaymentService");
    expect(implementsRef).toBeDefined();
  });
});

