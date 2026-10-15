import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteStorage } from "@ruas/store";
import { type FileRecord, type NodeRecord, type EdgeRecord } from "@ruas/core";
import { ContextBudgeter, createRuasMcpServer } from "../index.js";

describe("@ruas/mcp ContextBudgeter", () => {
  it("estimates token count with ~4 chars per token rule of thumb", () => {
    expect(ContextBudgeter.estimateTokens("1234")).toBe(1);
    expect(ContextBudgeter.estimateTokens("12345678")).toBe(2);
    expect(ContextBudgeter.estimateTokens("")).toBe(0);
  });

  it("assembles items within budget and truncates when exceeded", () => {
    const items = [
      {
        citation: { file: "src/a.ts", startLine: 1, endLine: 10, symbol: "fnA" },
        formattedBlock: "Block A - some descriptive content",
      },
      {
        citation: { file: "src/b.ts", startLine: 1, endLine: 10, symbol: "fnB" },
        formattedBlock: "Block B - some descriptive content",
      },
      {
        citation: { file: "src/c.ts", startLine: 1, endLine: 10, symbol: "fnC" },
        formattedBlock: "Block C - some descriptive content",
      },
    ];

    // Generous budget: fits all 3
    const fullPacket = ContextBudgeter.assemble("# Header", items, 500);
    expect(fullPacket.isTruncated).toBe(false);
    expect(fullPacket.itemsIncluded).toBe(3);
    expect(fullPacket.citations.length).toBe(3);

    // Tight budget: only fits 1 item + warning
    const tightPacket = ContextBudgeter.assemble("# Header", items, 30);
    expect(tightPacket.isTruncated).toBe(true);
    expect(tightPacket.itemsIncluded).toBeLessThan(3);
    expect(tightPacket.text).toContain("[Token Budget Reached]");
  });
});

describe("@ruas/mcp McpServer & Tools Integration", () => {
  let storage: SqliteStorage;

  beforeEach(async () => {
    storage = new SqliteStorage({ dbPath: ":memory:" });
    await storage.init();

    // Populate test fixture
    const file: FileRecord = {
      id: "f_pay",
      path: "src/payment.ts",
      lang: "typescript",
      contentHash: "hash_pay",
      size: 200,
      mtime: 1000,
      indexedAt: 1000,
    };
    await storage.upsertFile(file);

    const callerNode: NodeRecord = {
      id: "n_caller",
      fileId: "f_pay",
      kind: "function",
      name: "checkoutOrder",
      qualifiedName: "checkoutOrder",
      startLine: 1,
      endLine: 15,
      signature: "(amount: number): boolean",
      docComment: "Process checkout order for customer.",
      tokens: "checkout order customer",
    };

    const targetNode: NodeRecord = {
      id: "n_target",
      fileId: "f_pay",
      kind: "function",
      name: "calculateDiscount",
      qualifiedName: "calculateDiscount",
      startLine: 16,
      endLine: 30,
      signature: "(cust: string, amount: number): number",
      docComment: "Menghitung diskon pelanggan berdasarkan tier loyalitas.",
      tokens: "calculate discount hitung diskon pelanggan",
    };

    await storage.upsertNodes([callerNode, targetNode]);

    const edge: EdgeRecord = {
      id: "e_call",
      srcId: "n_caller",
      dstId: "n_target",
      kind: "calls",
      alpha: 8,
      beta: 1,
      evidenceJson: JSON.stringify({ rule: "same_scope" }),
    };
    await storage.upsertEdges([edge]);
  });

  afterEach(async () => {
    await storage.close();
  });

  it("initializes McpServer and registers all three core tools", () => {
    const server = createRuasMcpServer(storage);
    expect(server).toBeDefined();
  });

  it("handles ask_code tool execution and returns calibrated results with roast", async () => {
    const server = createRuasMcpServer(storage);

    // Call tool directly via registered handler map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools;
    const askTool = tools["ask_code"];
    expect(askTool).toBeDefined();

    const response = await askTool.handler({
      query: "fungsi hitung diskon pelanggan",
      limit: 5,
      tokenBudget: 4000,
      roast: true,
    });

    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    const text = response.content[0].text;
    expect(text).toContain("calculateDiscount");
    expect(text).toContain("Emotional Damage");
  });

  it("handles trace_impact tool execution and calculates blast radius with Beta intervals", async () => {
    const server = createRuasMcpServer(storage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools;
    const traceTool = tools["trace_impact"];
    expect(traceTool).toBeDefined();

    const response = await traceTool.handler({
      symbol: "calculateDiscount",
      direction: "inbound",
      depth: 2,
    });

    const text = response.content[0].text;
    expect(text).toContain("Impact Trace & Blast Radius");
    expect(text).toContain("checkoutOrder");
    expect(text).toContain("Bayesian Confidence");
    expect(text).toContain("Emotional Damage Assessment");
  });

  it("handles project_overview tool and aggregates repository statistics", async () => {
    const server = createRuasMcpServer(storage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools;
    const overviewTool = tools["project_overview"];
    expect(overviewTool).toBeDefined();

    const response = await overviewTool.handler({});
    const text = response.content[0].text;

    expect(text).toContain("Ruas Project Graph Overview");
    expect(text).toContain("**Total Files Scanned:** 1");
    expect(text).toContain("calculateDiscount");
    expect(text).toContain("Top 10 Central Hubs");
  });

  it("handles analyze_architecture tool and detects cycles/health", async () => {
    const server = createRuasMcpServer(storage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools;
    const archTool = tools["analyze_architecture"];
    expect(archTool).toBeDefined();

    const response = await archTool.handler({
      includeCycles: true,
      includeOrphans: true,
      includeCoupling: true,
    });
    const text = response.content[0].text;

    expect(text).toContain("Architecture Health Report");
    expect(text).toContain("Health Score:");
  });

  it("handles find_path tool between caller and callee", async () => {
    const server = createRuasMcpServer(storage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools;
    const pathTool = tools["find_path"];
    expect(pathTool).toBeDefined();

    const response = await pathTool.handler({
      fromSymbol: "checkoutOrder",
      toSymbol: "calculateDiscount",
    });
    const text = response.content[0].text;

    expect(text).toContain("Shortest Dependency Path");
    expect(text).toContain("checkoutOrder");
    expect(text).toContain("calculateDiscount");
    expect(text).toContain("Cumulative Bayesian Confidence");
  });
});
