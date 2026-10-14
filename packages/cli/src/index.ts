#!/usr/bin/env node

import { existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { SqliteStorage } from "@ruas/store";
import { Indexer } from "@ruas/indexer";
import { SymbolResolver } from "@ruas/resolver";
import { RetrievalPipeline } from "@ruas/rank";

const program = new Command();

program
  .name("ruas")
  .description("Universal Code Intelligence Engine with Merciless Calibration & Multilingual Graph Retrieval")
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

      // Run SymbolResolver to resolve cross-file calls & imports
      const resolver = new SymbolResolver(storage);
      const resolveSummary = await resolver.resolveAll();

      await storage.close();

      if (options.json) {
        console.log(JSON.stringify({ ...summary, resolvedEdges: resolveSummary.edgesCreated }, null, 2));
      } else if (!options.quiet) {
        console.log(pc.green(`\n✔ Index completed successfully in ${summary.durationMs}ms`));
        console.log(`  ${pc.bold("Total files scanned:")}    ${summary.totalFiles}`);
        console.log(`  ${pc.bold("Files indexed/updated:")}  ${summary.dirtyFiles} ${summary.isCold ? "(cold)" : "(incremental)"}`);
        console.log(`  ${pc.bold("Files deleted:")}          ${summary.deletedFiles}`);
        console.log(`  ${pc.bold("Total graph nodes:")}      ${summary.nodesCount}`);
        console.log(`  ${pc.bold("Total graph edges:")}      ${summary.edgesCount} (${resolveSummary.edgesCreated} resolved cross-file)`);
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

// --- ruas ask ---
program
  .command("ask")
  .description("Search codebase with natural language, statistical ranking, and emotional damage analysis")
  .argument("<query>", "Natural language question or search query")
  .argument("[path]", "Path to project directory", ".")
  .option("-l, --limit <number>", "Max number of symbols to return", "5")
  .option("--db <path>", "Custom database path")
  .option("--roast", "Enable brutally honest emotional damage code quality commentary", false)
  .option("--json", "Output results in JSON format", false)
  .action(async (query: string, targetPath: string, options: { limit: string; db?: string; roast?: boolean; json?: boolean }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    if (!existsSync(dbPath)) {
      if (options.json) {
        console.log(JSON.stringify({ error: "Database not found. Run 'ruas index' first." }, null, 2));
      } else {
        console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
        console.log(pc.dim("  Run `ruas index` to initialize the project graph.\n"));
      }
      return;
    }

    const storage = new SqliteStorage({ dbPath });
    try {
      await storage.init();
      const pipeline = new RetrievalPipeline(storage);
      const limit = parseInt(options.limit, 10) || 5;

      const result = await pipeline.search(query, limit, options.roast);
      await storage.close();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(pc.cyan(`\n🔍 Ruas Retrieval — Query: "${pc.bold(query)}"`));
        console.log(`  ${pc.bold("Detected Language:")}   ${pc.green(result.detectedLang.toUpperCase())}`);
        if (result.expandedConcepts.length > 0) {
          console.log(`  ${pc.bold("Concepts Expanded:")}   ${pc.dim(result.expandedConcepts.join(", "))}`);
        }
        console.log(`  ${pc.bold("Retrieval Latency:")}   ${pc.dim(`${result.durationMs}ms`)}\n`);

        if (result.symbols.length === 0) {
          console.log(pc.yellow("  No matching code symbols found.\n"));
          return;
        }

        for (let i = 0; i < result.symbols.length; i++) {
          const sym = result.symbols[i]!;
          const rankNum = pc.bold(`#${i + 1}`);
          const kindTag = pc.magenta(`[${sym.node.kind}]`);
          const name = pc.bold(pc.white(sym.node.name));
          const loc = pc.dim(`${sym.node.qualifiedName} (${sym.node.startLine}-${sym.node.endLine})`);

          console.log(`  ${rankNum} ${kindTag} ${name} — ${loc}`);
          if (sym.node.signature) {
            console.log(`     ${pc.cyan("Signature:")} ${sym.node.signature}`);
          }
          if (sym.node.docComment) {
            console.log(`     ${pc.dim("Doc:")} ${sym.node.docComment.replace(/\n\s*/g, " ").slice(0, 80)}`);
          }
          console.log(`     ${pc.dim("RRF Score:")} ${sym.rrfScore} | ${pc.dim("Inbound:")} ${sym.inboundEdges.length} | ${pc.dim("Outbound:")} ${sym.outboundEdges.length}`);

          if (sym.roastComment) {
            console.log(`     ${pc.red(pc.bold(sym.roastComment))}`);
          }
          console.log();
        }
      }
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(pc.red(`\n✖ Error during retrieval: ${message}\n`));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
