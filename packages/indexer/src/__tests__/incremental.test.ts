import { mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SqliteStorage } from "@ruas/store";
import { FileWatcher, Indexer } from "../index.js";

const FIXTURE_DIR = join(process.cwd(), ".tmp", "ruas-incremental-fixture");

describe("@ruas/indexer Incremental & FileWatcher Invariants", () => {
  beforeAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURE_DIR, { recursive: true });

    // Initial files
    writeFileSync(
      join(FIXTURE_DIR, "discount.ts"),
      `
import { getCustomer } from "./customer";

export function hitungDiskon(id: string, amount: number): number {
  const cust = getCustomer(id);
  return amount * 0.1;
}
`,
    );

    writeFileSync(
      join(FIXTURE_DIR, "customer.ts"),
      `
export interface Customer {
  id: string;
  name: string;
}

export function getCustomer(id: string): Customer {
  return { id, name: "Ghani" };
}
`,
    );
  });

  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it("verifies Graph(Incremental) == Graph(Cold Rebuild) after edits, adds, and deletes", async () => {
    // 1. Initial cold index
    const liveStorage = new SqliteStorage({ dbPath: ":memory:" });
    const liveIndexer = new Indexer(liveStorage);
    const initialSummary = await liveIndexer.runIndex({ rootDir: FIXTURE_DIR });

    expect(initialSummary.isCold).toBe(true);
    expect(initialSummary.indexedFiles).toBe(2);

    // 2. Perform file edits and additions
    // Edit discount.ts: add a new function
    writeFileSync(
      join(FIXTURE_DIR, "discount.ts"),
      `
import { getCustomer } from "./customer";

export function hitungDiskon(id: string, amount: number): number {
  const cust = getCustomer(id);
  return amount * 0.15;
}

export function hitungDiskonTambahan(amount: number): number {
  return amount * 0.05;
}
`,
    );

    // Add new file: payment.ts
    writeFileSync(
      join(FIXTURE_DIR, "payment.ts"),
      `
import { hitungDiskon } from "./discount";

export function bayarOrder(amount: number): boolean {
  const diskon = hitungDiskon("cust_1", amount);
  return amount > diskon;
}
`,
    );

    // Add and then delete temporary file
    const tempFile = join(FIXTURE_DIR, "temp.ts");
    writeFileSync(tempFile, "export const tempVal = 42;");
    await liveIndexer.runIndex({ rootDir: FIXTURE_DIR });
    unlinkSync(tempFile);

    // 3. Run incremental indexing on live storage
    const incSummary = await liveIndexer.runIndex({ rootDir: FIXTURE_DIR });
    expect(incSummary.isCold).toBe(false);
    expect(incSummary.deletedFiles).toBe(1); // temp.ts deleted

    // 4. Capture state from incremental graph
    const incFiles = await liveStorage.getAllFiles();
    const incNodes = await liveStorage.findNodesByName("");
    const incEdges = await liveStorage.getAllEdges();

    // 5. Run cold rebuild on a completely fresh storage instance from scratch
    const coldStorage = new SqliteStorage({ dbPath: ":memory:" });
    const coldIndexer = new Indexer(coldStorage);
    const coldSummary = await coldIndexer.runIndex({ rootDir: FIXTURE_DIR, forceRebuild: true });

    expect(coldSummary.isCold).toBe(true);

    const coldFiles = await coldStorage.getAllFiles();
    const coldNodes = await coldStorage.findNodesByName("");
    const coldEdges = await coldStorage.getAllEdges();

    // 6. Check Mathematical Invariants:
    // A. File sets match
    const incFilePaths = incFiles.map((f) => f.path).sort();
    const coldFilePaths = coldFiles.map((f) => f.path).sort();
    expect(incFilePaths).toEqual(coldFilePaths);

    // B. Node sets match (names, kinds, qualified names)
    const incNodeSignatures = incNodes
      .map((n) => `${n.name}::${n.kind}::${n.qualifiedName}`)
      .sort();
    const coldNodeSignatures = coldNodes
      .map((n) => `${n.name}::${n.kind}::${n.qualifiedName}`)
      .sort();
    expect(incNodeSignatures).toEqual(coldNodeSignatures);

    // C. Edges count and structure match
    expect(incEdges.length).toBe(coldEdges.length);

    await liveStorage.close();
    await coldStorage.close();
  });

  it("triggers debounced re-indexing on FileWatcher file change", async () => {
    const storage = new SqliteStorage({ dbPath: ":memory:" });
    const indexer = new Indexer(storage);
    const watcher = new FileWatcher(indexer, {
      rootDir: FIXTURE_DIR,
      debounceMs: 50,
    });

    try {
      const indexedPromise = new Promise<void>((resolve) => {
        watcher.once("indexed", () => {
          resolve();
        });
      });

      watcher.start();

      // Trigger change by touching discount.ts
      writeFileSync(
        join(FIXTURE_DIR, "discount.ts"),
        `
export function hitungDiskonV3(amount: number): number {
  return amount * 0.2;
}
`,
      );

      // Wait for debounced trigger
      await indexedPromise;

      const nodes = await storage.findNodesByName("hitungDiskonV3");
      expect(nodes.length).toBeGreaterThan(0);
    } finally {
      watcher.stop();
      await storage.close();
    }
  }, 15_000);
});
