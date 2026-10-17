import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SqliteStorage } from "@ruas/store";
import { FileWalker, Indexer, MerkleTree } from "../index.js";

const FIXTURE_DIR = join(process.cwd(), ".tmp", "indexer-fixture");

describe("@ruas/indexer", () => {
  beforeAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURE_DIR, { recursive: true });

    // File 1: Discount calculation
    writeFileSync(
      join(FIXTURE_DIR, "discount.ts"),
      `
import { getCustomerData } from "./customer";

export function hitungDiskonPelanggan(customerId: string, amount: number): number {
  const customer = getCustomerData(customerId);
  return amount * 0.15;
}
`,
    );

    // File 2: Customer repository
    writeFileSync(
      join(FIXTURE_DIR, "customer.ts"),
      `
export interface Customer {
  id: string;
  name: string;
}

export function getCustomerData(id: string): Customer {
  return { id, name: "Ghani" };
}
`,
    );

    // File 3: Gitignored or node_modules style file
    mkdirSync(join(FIXTURE_DIR, "node_modules"), { recursive: true });
    writeFileSync(join(FIXTURE_DIR, "node_modules", "ignored.ts"), "export const x = 1;");
  });

  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it("walks files ignoring node_modules", async () => {
    const walker = new FileWalker({ rootDir: FIXTURE_DIR });
    const files = await walker.walk();
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain("discount.ts");
    expect(paths).toContain("customer.ts");
    expect(paths.some((p) => p.includes("node_modules"))).toBe(false);
  });

  it("respects .ruasignore file when present", async () => {
    writeFileSync(join(FIXTURE_DIR, "ignored-by-ruas.ts"), "export const ignored = true;");
    writeFileSync(join(FIXTURE_DIR, ".ruasignore"), "ignored-by-ruas.ts\n");

    const walker = new FileWalker({ rootDir: FIXTURE_DIR });
    const files = await walker.walk();
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain("discount.ts");
    expect(paths).not.toContain("ignored-by-ruas.ts");

    // Clean up
    rmSync(join(FIXTURE_DIR, "ignored-by-ruas.ts"), { force: true });
    rmSync(join(FIXTURE_DIR, ".ruasignore"), { force: true });
  });

  it("runs cold indexing and stores AST nodes and edges", async () => {
    const storage = new SqliteStorage({ dbPath: ":memory:" });
    const indexer = new Indexer(storage);

    const summary = await indexer.runIndex({ rootDir: FIXTURE_DIR });
    expect(summary.totalFiles).toBe(2);
    expect(summary.indexedFiles).toBe(2);
    expect(summary.nodesCount).toBeGreaterThan(3);

    const hits = await storage.searchFts("hitung diskon");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.node.name).toBe("hitungDiskonPelanggan");
    await storage.close();
  });

  it("enforces invariant: incremental indexing yields same graph as cold rebuild", async () => {
    const storage1 = new SqliteStorage({ dbPath: ":memory:" });
    const indexer1 = new Indexer(storage1);

    // 1. Initial cold index
    await indexer1.runIndex({ rootDir: FIXTURE_DIR });

    // 2. Modify discount.ts
    writeFileSync(
      join(FIXTURE_DIR, "discount.ts"),
      `
import { getCustomerData } from "./customer";

export function hitungDiskonPelanggan(customerId: string, amount: number): number {
  const customer = getCustomerData(customerId);
  return amount * 0.25; // Updated discount percentage
}

export function promoMerdeka(): boolean {
  return true;
}
`,
    );

    // 3. Run incremental update on storage1
    const incSummary = await indexer1.runIndex({ rootDir: FIXTURE_DIR });
    expect(incSummary.dirtyFiles).toBe(1); // Only discount.ts changed!
    expect(incSummary.isCold).toBe(false);

    // 4. Run fresh cold rebuild on storage2
    const storage2 = new SqliteStorage({ dbPath: ":memory:" });
    const indexer2 = new Indexer(storage2);
    await indexer2.runIndex({ rootDir: FIXTURE_DIR, forceRebuild: true });

    // 5. Compare graph nodes & edges between incremental and cold rebuild
    const stats1 = await storage1.getStats();
    const stats2 = await storage2.getStats();

    expect(stats1.nodeCount).toBe(stats2.nodeCount);
    expect(stats1.edgeCount).toBe(stats2.edgeCount);

    const allFiles1 = await storage1.getAllFiles();
    const allFiles2 = await storage2.getAllFiles();
    expect(allFiles1.map((f) => f.path).sort()).toEqual(
      allFiles2.map((f) => f.path).sort(),
    );

    const nodes1 = await storage1.findNodesByName("promoMerdeka");
    const nodes2 = await storage2.findNodesByName("promoMerdeka");
    expect(nodes1.length).toBe(1);
    expect(nodes2.length).toBe(1);
    expect(nodes1[0]?.id).toBe(nodes2[0]?.id);

    await storage1.close();
    await storage2.close();
  });
});
