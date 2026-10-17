import { describe, expect, it } from "vitest";
import type { EdgeRecord, NodeRecord } from "@ruas/core";
import { ARCHITECTURE_PRESETS, ArchitectureLinter } from "../architecture-linter.js";

describe("Architecture Presets & Multi-Paradigm Linting", () => {
  it("exports all 5 standard community presets", () => {
    expect(ARCHITECTURE_PRESETS["clean-architecture"]).toBeDefined();
    expect(ARCHITECTURE_PRESETS["hexagonal"]).toBeDefined();
    expect(ARCHITECTURE_PRESETS["onion"]).toBeDefined();
    expect(ARCHITECTURE_PRESETS["feature-sliced-design"]).toBeDefined();
    expect(ARCHITECTURE_PRESETS["modular-monolith"]).toBeDefined();
  });

  it("retrieves presets with case and delimiter normalization", () => {
    expect(ArchitectureLinter.getPreset("HEXAGONAL")).toBe(ARCHITECTURE_PRESETS.hexagonal);
    expect(ArchitectureLinter.getPreset("feature_sliced_design")).toBe(
      ARCHITECTURE_PRESETS["feature-sliced-design"],
    );
    expect(ArchitectureLinter.getPreset("Clean-Architecture")).toBe(
      ARCHITECTURE_PRESETS["clean-architecture"],
    );
    expect(ArchitectureLinter.getPreset("modular_monolith")).toBe(
      ARCHITECTURE_PRESETS["modular-monolith"],
    );
    expect(ArchitectureLinter.getPreset("unknown-preset")).toBeUndefined();
  });

  it("detects Hexagonal architecture violations (Domain importing Adapter)", () => {
    const domainNode: NodeRecord = {
      id: "n_order",
      fileId: "f_domain",
      kind: "class",
      name: "OrderEntity",
      qualifiedName: "src/domain/OrderEntity.ts:OrderEntity",
      startLine: 1,
      endLine: 20,
      signature: "class OrderEntity",
      docComment: null,
      tokens: "order entity",
    };

    const adapterNode: NodeRecord = {
      id: "n_pg",
      fileId: "f_adapter",
      kind: "class",
      name: "PostgresAdapter",
      qualifiedName: "src/adapters/PostgresAdapter.ts:PostgresAdapter",
      startLine: 1,
      endLine: 30,
      signature: "class PostgresAdapter",
      docComment: null,
      tokens: "postgres adapter",
    };

    const forbiddenEdge: EdgeRecord = {
      id: "e_violation",
      srcId: "n_order",
      dstId: "n_pg",
      kind: "calls",
      alpha: 10,
      beta: 1,
      evidenceJson: null,
    };

    const preset = ArchitectureLinter.getPreset("hexagonal")!;
    const report = ArchitectureLinter.lint([domainNode, adapterNode], [forbiddenEdge], preset);

    expect(report.totalViolations).toBe(1);
    expect(report.violations[0]?.srcLayer).toBe("domain");
    expect(report.violations[0]?.dstLayer).toBe("adapters");
    expect(report.violations[0]?.severity).toBe("Critical");
    expect(report.purityScore).toBeLessThan(90);
  });

  it("detects Feature-Sliced Design (FSD) cross-slice violations", () => {
    const sharedNode: NodeRecord = {
      id: "n_button",
      fileId: "f_shared",
      kind: "function",
      name: "Button",
      qualifiedName: "src/shared/ui/Button.ts:Button",
      startLine: 1,
      endLine: 15,
      signature: "function Button()",
      docComment: null,
      tokens: "button",
    };

    const pageNode: NodeRecord = {
      id: "n_checkout_page",
      fileId: "f_page",
      kind: "function",
      name: "CheckoutPage",
      qualifiedName: "src/pages/CheckoutPage.ts:CheckoutPage",
      startLine: 1,
      endLine: 50,
      signature: "function CheckoutPage()",
      docComment: null,
      tokens: "checkout page",
    };

    // Illegal: shared slice depending on a higher page slice!
    const illegalEdge: EdgeRecord = {
      id: "e_fsd_violation",
      srcId: "n_button",
      dstId: "n_checkout_page",
      kind: "calls",
      alpha: 8,
      beta: 1,
      evidenceJson: null,
    };

    const fsdPreset = ArchitectureLinter.getPreset("feature-sliced-design")!;
    const report = ArchitectureLinter.lint([sharedNode, pageNode], [illegalEdge], fsdPreset);

    expect(report.totalViolations).toBe(1);
    expect(report.violations[0]?.srcLayer).toBe("shared");
    expect(report.violations[0]?.dstLayer).toBe("pages");
    expect(report.violations[0]?.severity).toBe("Critical");
  });
});
