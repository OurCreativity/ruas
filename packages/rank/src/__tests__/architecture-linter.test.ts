import { describe, expect, it } from "vitest";
import type { ArchitectureConfig, EdgeRecord, NodeRecord } from "@ruas/core";
import { ArchitectureLinter } from "../architecture-linter.js";

describe("ArchitectureLinter", () => {
  const nodes: NodeRecord[] = [
    {
      id: "node_domain_entity",
      fileId: "file_entity",
      kind: "class",
      name: "OrderEntity",
      qualifiedName: "src/domain/entities/order.ts:OrderEntity",
      startLine: 1,
      endLine: 40,
      signature: "class OrderEntity",
      docComment: null,
      tokens: "order entity",
    },
    {
      id: "node_domain_value_obj",
      fileId: "file_money",
      kind: "class",
      name: "Money",
      qualifiedName: "src/domain/values/money.ts:Money",
      startLine: 1,
      endLine: 25,
      signature: "class Money",
      docComment: null,
      tokens: "money currency",
    },
    {
      id: "node_app_service",
      fileId: "file_service",
      kind: "class",
      name: "CheckoutService",
      qualifiedName: "src/application/services/checkout.ts:CheckoutService",
      startLine: 1,
      endLine: 60,
      signature: "class CheckoutService",
      docComment: null,
      tokens: "checkout service",
    },
    {
      id: "node_infra_db",
      fileId: "file_db",
      kind: "class",
      name: "SqlOrderRepository",
      qualifiedName: "src/infrastructure/db/order-repo.ts:SqlOrderRepository",
      startLine: 1,
      endLine: 80,
      signature: "class SqlOrderRepository",
      docComment: null,
      tokens: "sql order repository database",
    },
    {
      id: "node_presentation_cli",
      fileId: "file_cli",
      kind: "function",
      name: "runCli",
      qualifiedName: "src/presentation/cli/main.ts:runCli",
      startLine: 1,
      endLine: 50,
      signature: "function runCli()",
      docComment: null,
      tokens: "cli presentation runner",
    },
  ];

  const config: ArchitectureConfig = {
    layers: {
      domain: ["**/domain/**"],
      application: ["**/application/**"],
      infrastructure: ["**/infrastructure/**"],
      presentation: ["**/presentation/**"],
    },
    rules: [
      {
        from: "domain",
        disallow: ["application", "infrastructure", "presentation"],
        message: "Domain entities must not depend on application or infrastructure.",
      },
      {
        from: "application",
        disallow: ["presentation"],
        message: "Application services must not depend on presentation.",
      },
      {
        from: "infrastructure",
        disallow: ["presentation"],
        message: "Infrastructure adapters must not depend on presentation.",
      },
    ],
  };

  it("converts glob patterns and matches file paths accurately", () => {
    expect(ArchitectureLinter.matchPattern("src/domain/entities/order.ts", ["**/domain/**"])).toBe(
      true,
    );
    expect(ArchitectureLinter.matchPattern("src/domain/entities/order.ts", ["src/domain/*"])).toBe(
      false,
    );
    expect(
      ArchitectureLinter.matchPattern("src/domain/entities/order.ts", ["src/domain/**/*.ts"]),
    ).toBe(true);
    expect(
      ArchitectureLinter.matchPattern("src/infrastructure/db/order-repo.ts", ["**/infrastructure/**"]),
    ).toBe(true);
    expect(ArchitectureLinter.matchPattern("src/domain/user.ts", ["**/services/**"])).toBe(false);
  });

  it("resolves layers for nodes based on path", () => {
    expect(ArchitectureLinter.resolveLayer(nodes[0]!, config)).toBe("domain");
    expect(ArchitectureLinter.resolveLayer(nodes[2]!, config)).toBe("application");
    expect(ArchitectureLinter.resolveLayer(nodes[3]!, config)).toBe("infrastructure");
    expect(ArchitectureLinter.resolveLayer(nodes[4]!, config)).toBe("presentation");
  });

  it("reports 100 purity and Grade A when there are no boundary violations", () => {
    // Valid clean architecture dependencies:
    // presentation -> application
    // application -> domain
    // infrastructure -> domain
    const validEdges: EdgeRecord[] = [
      {
        id: "e1",
        srcId: "node_presentation_cli",
        dstId: "node_app_service",
        kind: "calls",
        alpha: 9,
        beta: 1,
        evidenceJson: null,
      },
      {
        id: "e2",
        srcId: "node_app_service",
        dstId: "node_domain_entity",
        kind: "calls",
        alpha: 8,
        beta: 2,
        evidenceJson: null,
      },
      {
        id: "e3",
        srcId: "node_infra_db",
        dstId: "node_domain_entity",
        kind: "implements",
        alpha: 10,
        beta: 0,
        evidenceJson: null,
      },
    ];

    const report = ArchitectureLinter.lint(nodes, validEdges, config);

    expect(report.totalViolations).toBe(0);
    expect(report.purityScore).toBe(100);
    expect(report.grade).toBe("A");
    expect(report.fuzzyEvaluation?.crispGrade).toBe("Minimal");
    expect(report.layerStats.length).toBe(4);
  });

  it("detects architectural violations and computes fuzzy severity and score penalty", () => {
    // Forbidden dependency:
    // Domain entity calls SqlOrderRepository (inversion of control violation!)
    const violationEdges: EdgeRecord[] = [
      {
        id: "e_violation_1",
        srcId: "node_domain_entity",
        dstId: "node_infra_db",
        kind: "calls",
        alpha: 10,
        beta: 0,
        evidenceJson: null,
      },
    ];

    const report = ArchitectureLinter.lint(nodes, violationEdges, config);

    expect(report.totalViolations).toBe(1);
    const violation = report.violations[0]!;
    expect(violation.srcLayer).toBe("domain");
    expect(violation.dstLayer).toBe("infrastructure");
    expect(violation.fuzzyViolationDegree).toBeGreaterThan(0.5);
    expect(["Critical", "Warning"]).toContain(violation.severity);
    expect(violation.message).toContain("Domain entities must not depend on application or infrastructure");
    expect(report.purityScore).toBeLessThan(100);
  });

  it("automatically generates default clean architecture config", () => {
    const generated = ArchitectureLinter.generateDefaultConfig(nodes);
    expect(generated.layers).toBeDefined();
    expect(generated.rules.length).toBeGreaterThan(0);
    expect(Object.keys(generated.layers)).toContain("domain");
    expect(Object.keys(generated.layers)).toContain("application");
  });
});
