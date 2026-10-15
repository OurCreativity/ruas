import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI_FIXTURE = join(process.cwd(), ".tmp", "cli-fixture");
const CLI_PATH = join(process.cwd(), "packages", "cli", "dist", "index.js");

describe("@ruas/cli End-to-End Tests", () => {
  beforeAll(() => {
    rmSync(CLI_FIXTURE, { recursive: true, force: true });
    mkdirSync(CLI_FIXTURE, { recursive: true });

    writeFileSync(
      join(CLI_FIXTURE, "pembayaran.ts"),
      `
export function prosesQRIS(transaksiId: string, jumlah: number): boolean {
  return jumlah > 0;
}
`,
    );
  });

  afterAll(() => {
    rmSync(CLI_FIXTURE, { recursive: true, force: true });
    rmSync(resolve(process.cwd(), "docs/TEST_CLI_HANDOVER.md"), { force: true });
  });

  it("prints version flag correctly", () => {
    const output = execSync(`node ${CLI_PATH} --version`).toString().trim();
    expect(output).toBe("0.2.0");
  }, 30_000);

  it("indexes fixture directory with --json", () => {
    const raw = execSync(`node ${CLI_PATH} index ${CLI_FIXTURE} --json`).toString();
    // Parse last JSON block (filtering node experimental warnings)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const data = JSON.parse(jsonMatch![0]);

    expect(data.totalFiles).toBe(1);
    expect(data.indexedFiles).toBe(1);
    expect(data.isCold).toBe(true);
    expect(data.nodesCount).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("queries status with --json", () => {
    const raw = execSync(`node ${CLI_PATH} status ${CLI_FIXTURE} --json`).toString();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const data = JSON.parse(jsonMatch![0]);

    expect(data.indexed).toBe(true);
    expect(data.totalFiles).toBe(1);
    expect(data.totalNodes).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("queries code via ask command with --json", () => {
    const raw = execSync(`node ${CLI_PATH} ask "bayar qris" ${CLI_FIXTURE} --json`).toString();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const data = JSON.parse(jsonMatch![0]);

    expect(data.query).toBe("bayar qris");
    expect(data.symbols.length).toBeGreaterThan(0);
    expect(data.symbols[0].node.name).toBe("prosesQRIS");
  }, 30_000);

  it("prints emotional damage roast with --roast", () => {
    const output = execSync(`node ${CLI_PATH} ask "bayar qris" ${CLI_FIXTURE} --roast`).toString();
    expect(output).toContain("prosesQRIS");
    expect(output).toContain("RRF Score");
  }, 30_000);

  it("displays mcp and watch commands in help output", () => {
    const output = execSync(`node ${CLI_PATH} --help`).toString();
    expect(output).toContain("mcp");
    expect(output).toContain("watch");
    expect(output).toContain("docgen");
    expect(output).toContain("Model Context Protocol");
  }, 30_000);

  it("generates handover documentation with docgen command", () => {
    const testOut = resolve(process.cwd(), "docs/TEST_CLI_HANDOVER.md");
    const output = execSync(`node ${CLI_PATH} docgen ${CLI_FIXTURE} --out ${testOut}`).toString();
    expect(output).toContain("Handover documentation generated successfully");
    expect(output).toContain("Zero Uncited Claims Guarantee");
    expect(existsSync(testOut)).toBe(true);
  }, 30_000);

  it("performs architectural audit with --json", () => {
    const raw = execSync(`node ${CLI_PATH} audit ${CLI_FIXTURE} --json`).toString();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const data = JSON.parse(jsonMatch![0]);
    expect(data.score).toBeGreaterThan(0);
    expect(data.totalCycles).toBeDefined();
    expect(data.totalOrphans).toBeDefined();
  }, 30_000);

  it("exports graph as Mermaid diagram", () => {
    const testMmd = resolve(process.cwd(), ".tmp/test-cli.mmd");
    const output = execSync(`node ${CLI_PATH} export ${CLI_FIXTURE} --mermaid ${testMmd}`).toString();
    expect(output).toContain("Mermaid diagram exported");
    expect(existsSync(testMmd)).toBe(true);
    rmSync(testMmd, { force: true });
  }, 30_000);

  it("traces symbol blast radius with trace command", () => {
    const output = execSync(`node ${CLI_PATH} trace prosesQRIS ${CLI_FIXTURE}`).toString();
    expect(output).toContain("Ruas Blast Radius Trace");
    expect(output).toContain("prosesQRIS");
  }, 30_000);
});
