import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const FIXTURE_DIR = join(process.cwd(), ".tmp", "mcp-e2e-fixture");
const CLI_PATH = join(process.cwd(), "packages", "cli", "dist", "index.js");

describe("Model Context Protocol (MCP) End-to-End Stdio Server", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // 1. Prepare clean test fixture
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURE_DIR, { recursive: true });

    writeFileSync(
      join(FIXTURE_DIR, "payment.ts"),
      `
export function prosesQRIS(id: string, amount: number): boolean {
  if (amount <= 0) return false;
  return verifyAccount(id);
}

export function verifyAccount(id: string): boolean {
  return id.length > 0;
}
`,
    );

    // 2. Index fixture first
    execSync(`node ${CLI_PATH} index ${FIXTURE_DIR}`, { stdio: "pipe" });

    // 3. Connect real MCP client over stdio
    transport = new StdioClientTransport({
      command: "node",
      args: [CLI_PATH, "mcp", FIXTURE_DIR],
      stderr: "pipe",
    });

    client = new Client(
      { name: "mcp-test-runner", version: "1.0.0" },
      { capabilities: {} },
    );

    await client.connect(transport);
  }, 45_000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      // Ignore teardown disconnect errors
    }
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it("lists all 8 registered tools with valid schemas", async () => {
    const response = await client.listTools();
    const toolNames = response.tools.map((t) => t.name);

    expect(toolNames).toContain("ask_code");
    expect(toolNames).toContain("trace_impact");
    expect(toolNames).toContain("find_path");
    expect(toolNames).toContain("project_overview");
    expect(toolNames).toContain("analyze_architecture");
    expect(toolNames).toContain("lint_architecture");
    expect(toolNames).toContain("save_context");
    expect(toolNames).toContain("recall_context");
    expect(response.tools.length).toBe(8);

    for (const tool of response.tools) {
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("executes ask_code via JSON-RPC stdio", async () => {
    const result = await client.callTool({
      name: "ask_code",
      arguments: {
        query: "proses pembayaran QRIS",
        limit: 3,
        roast: false,
      },
    });

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(text).toContain("prosesQRIS");
  });

  it("executes trace_impact via JSON-RPC stdio", async () => {
    const result = await client.callTool({
      name: "trace_impact",
      arguments: {
        symbol: "verifyAccount",
        direction: "inbound",
        depth: 2,
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(text).toContain("Impact Trace & Blast Radius");
    expect(text).toContain("prosesQRIS");
  });

  it("executes find_path via JSON-RPC stdio", async () => {
    const result = await client.callTool({
      name: "find_path",
      arguments: {
        fromSymbol: "prosesQRIS",
        toSymbol: "verifyAccount",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(text).toContain("Shortest Path");
  });

  it("executes project_overview via JSON-RPC stdio", async () => {
    const result = await client.callTool({
      name: "project_overview",
      arguments: {},
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(text).toContain("Project Graph Overview");
    expect(text).toContain("Total AST Nodes Extracted");
  });

  it("executes analyze_architecture via JSON-RPC stdio", async () => {
    const result = await client.callTool({
      name: "analyze_architecture",
      arguments: {},
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(text).toContain("Architecture Health Report");
  });

  it("executes lint_architecture via JSON-RPC stdio", async () => {
    const result = await client.callTool({
      name: "lint_architecture",
      arguments: {
        preset: "clean-architecture",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(text).toBeDefined();
  });

  it("executes save_context and recall_context via JSON-RPC stdio", async () => {
    // 1. Save context
    const saveResult = await client.callTool({
      name: "save_context",
      arguments: {
        intent: "Verifying MCP stdio transport flow",
        sessionTag: "mcp-e2e-verified",
        activeFiles: ["payment.ts"],
        architecturalNotes: "Pure functional payment verification",
      },
    });

    const saveText = (saveResult.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(saveText).toContain("AI Working Memory Checkpointed");

    // 2. Recall context
    const recallResult = await client.callTool({
      name: "recall_context",
      arguments: {},
    });

    const recallText = (recallResult.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(recallText).toContain("Verifying MCP stdio transport flow");
    expect(recallText).toContain("mcp-e2e-verified");
  });
});
