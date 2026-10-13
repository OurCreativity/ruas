#!/usr/bin/env node

import { existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { SqliteStorage } from "@ruas/store";
import { Indexer } from "@ruas/indexer";

const program = new Command();

program
  .name("ruas")
  .description("ASEAN-first Code Intelligence Engine for AI Agents & Humans")
  .version("0.1.0");

// --- ruas index ---
program
  .command("index")
  .description("Index codebase files into the Ruas graph database")
  .argument("[path]", "Path to project directory", ".")
  .option("-f, --force", "Force a complete rebuild from scratch", false)
  .option("--db <path>", "Custom database path")
  .option("--json", "Output results in JSON format", false)
  .option("-q, --quiet", "Suppress verbose output", false)
  .action(async (targetPath: string, options: { force?: boolean; db?: string; json?: boolean; quiet?: boolean }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    const storage = new SqliteStorage({ dbPath });
    const indexer = new Indexer(storage);

    try {
      if (!options.quiet && !options.json) {
        console.log(pc.cyan(`\n🌿 Ruas Code Intelligence — Indexing: ${pc.bold(rootDir)}`));
        if (options.force) {
          console.log(pc.yellow("  Mode: Full rebuild (--force)"));
        }
      }

      const summary = await indexer.runIndex({
        rootDir,
        forceRebuild: options.force,
      });

      await storage.close();

      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
      } else if (!options.quiet) {
        console.log(pc.green(`\n✔ Index completed successfully in ${summary.durationMs}ms`));
        console.log(`  ${pc.bold("Total files scanned:")}    ${summary.totalFiles}`);
        console.log(`  ${pc.bold("Files indexed/updated:")}  ${summary.dirtyFiles} ${summary.isCold ? "(cold)" : "(incremental)"}`);
        console.log(`  ${pc.bold("Files deleted:")}          ${summary.deletedFiles}`);
        console.log(`  ${pc.bold("Total graph nodes:")}      ${summary.nodesCount}`);
        console.log(`  ${pc.bold("Total graph edges:")}      ${summary.edgesCount}`);
        console.log(`  ${pc.bold("Database location:")}      ${pc.dim(dbPath)}\n`);
      }
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(pc.red(`\n✖ Error during indexing: ${message}\n`));
      }
      process.exit(1);
    }
  });

// --- ruas status ---
program
  .command("status")
  .description("Display index freshness and graph statistics")
  .argument("[path]", "Path to project directory", ".")
  .option("--db <path>", "Custom database path")
  .option("--json", "Output results in JSON format", false)
  .action(async (targetPath: string, options: { db?: string; json?: boolean }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    if (!existsSync(dbPath)) {
      if (options.json) {
        console.log(JSON.stringify({ indexed: false, error: "Database not found. Run 'ruas index' first." }, null, 2));
      } else {
        console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
        console.log(pc.dim("  Run `ruas index` to initialize the project graph.\n"));
      }
      return;
    }

    const storage = new SqliteStorage({ dbPath });
    try {
      await storage.init();
      const stats = await storage.getStats();
      const files = await storage.getAllFiles();
      const dbStat = statSync(dbPath);
      await storage.close();

      const output = {
        indexed: true,
        projectRoot: rootDir,
        databasePath: dbPath,
        dbSizeBytes: dbStat.size,
        totalFiles: stats.fileCount,
        totalNodes: stats.nodeCount,
        totalEdges: stats.edgeCount,
        totalUnresolvedRefs: stats.unresolvedCount,
        latestIndexedAt: files.reduce((max, f) => Math.max(max, f.indexedAt), 0),
      };

      if (options.json) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log(pc.cyan(`\n📊 Ruas Index Status — ${pc.bold(rootDir)}`));
        console.log(`  ${pc.bold("Database file:")}         ${pc.dim(dbPath)} (${(dbStat.size / 1024).toFixed(1)} KB)`);
        console.log(`  ${pc.bold("Tracked files:")}         ${stats.fileCount}`);
        console.log(`  ${pc.bold("AST Nodes:")}              ${stats.nodeCount}`);
        console.log(`  ${pc.bold("Graph Edges:")}            ${stats.edgeCount}`);
        console.log(`  ${pc.bold("Unresolved Refs:")}        ${stats.unresolvedCount}`);
        if (output.latestIndexedAt > 0) {
          console.log(`  ${pc.bold("Last indexed:")}           ${new Date(output.latestIndexedAt).toISOString()}\n`);
        } else {
          console.log();
        }
      }
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(pc.red(`\n✖ Error fetching status: ${message}\n`));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
