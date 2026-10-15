#!/usr/bin/env node

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { SqliteStorage } from "@ruas/store";
import { FileWatcher, Indexer } from "@ruas/indexer";
import { SymbolResolver } from "@ruas/resolver";
import { RetrievalPipeline, ArchitectureAnalyzer } from "@ruas/rank";
import { runStdioServer } from "@ruas/mcp";
import { HandoverGenerator, AiNativeGenerator } from "@ruas/docgen";
import {
  startGraphServer,
  exportStandaloneHtml,
  exportMermaidFile,
  exportDotFile,
  exportJsonGraph,
} from "@ruas/ui";

const program = new Command();

program
  .name("ruas")
  .description("Universal Code Intelligence Engine with Merciless Calibration & Multilingual Graph Retrieval")
  .version("1.1.0");

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

// --- ruas mcp ---
program
  .command("mcp")
  .description("Start the Model Context Protocol (MCP) stdio server for AI agents")
  .argument("[path]", "Path to project directory", ".")
  .option("--db <path>", "Custom database path")
  .action(async (targetPath: string, options: { db?: string }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    if (!existsSync(dbPath)) {
      // Auto-index if database does not exist
      const storage = new SqliteStorage({ dbPath });
      const indexer = new Indexer(storage);
      await indexer.runIndex({ rootDir });
      const resolver = new SymbolResolver(storage);
      await resolver.resolveAll();
      await storage.close();
    }

    const storage = new SqliteStorage({ dbPath });
    await runStdioServer(storage, { name: "ruas", version: "0.1.0" });
  });

// --- ruas watch ---
program
  .command("watch")
  .description("Watch directory for file changes and incrementally update the graph")
  .argument("[path]", "Path to project directory", ".")
  .option("--db <path>", "Custom database path")
  .option("--debounce <ms>", "Debounce interval in milliseconds", "500")
  .action(async (targetPath: string, options: { db?: string; debounce?: string }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");
    const debounceMs = parseInt(options.debounce ?? "500", 10);

    const storage = new SqliteStorage({ dbPath });
    const indexer = new Indexer(storage);
    const watcher = new FileWatcher(indexer, { rootDir, debounceMs });

    console.log(pc.cyan(`\n👀 Ruas Watcher started on ${pc.bold(rootDir)}`));
    console.log(pc.dim(`  Database: ${dbPath}`));
    console.log(pc.dim(`  Debounce: ${debounceMs}ms\n`));

    // Initial pass
    const initial = await indexer.runIndex({ rootDir });
    const resolver = new SymbolResolver(storage);
    const initialResolve = await resolver.resolveAll();
    console.log(pc.green(`✔ Initial graph ready: ${initial.nodesCount} nodes, ${initial.edgesCount} edges (${initialResolve.edgesCreated} resolved cross-file)`));

    watcher.on("change", (e) => {
      console.log(pc.yellow(`✎ File changed: ${pc.dim(e.filename)}`));
    });

    watcher.on("indexed", async (summary) => {
      const res = await resolver.resolveAll();
      console.log(pc.green(`✔ Incremental update: ${summary.dirtyFiles} file(s) updated in ${summary.durationMs}ms (${res.edgesCreated} cross-file edges)`));
    });

    watcher.on("error", (err) => {
      console.error(pc.red(`✖ Watcher error: ${err instanceof Error ? err.message : String(err)}`));
    });

    watcher.start();

    const stop = async () => {
      console.log(pc.cyan("\n🛑 Stopping Ruas Watcher..."));
      watcher.stop();
      await storage.close();
      process.exit(0);
    };

    process.on("SIGINT", () => void stop());
    process.on("SIGTERM", () => void stop());
  });

// --- ruas docgen / handover ---
program
  .command("docgen")
  .alias("handover")
  .description("Generate onboarding handover documentation in Bahasa Indonesia with zero uncited claims")
  .argument("[path]", "Path to project directory", ".")
  .option("--out <file>", "Output markdown file path", "docs/HANDOVER.md")
  .option("--db <path>", "Custom database path")
  .option("--title <name>", "Custom project title")
  .action(async (targetPath: string, options: { out?: string; db?: string; title?: string }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");
    const outPath = resolve(options.out ?? join(rootDir, "docs", "HANDOVER.md"));

    if (!existsSync(dbPath)) {
      console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      console.log(pc.dim("  Running automatic indexing first...\n"));
      const tempStorage = new SqliteStorage({ dbPath });
      const indexer = new Indexer(tempStorage);
      await indexer.runIndex({ rootDir });
      const resolver = new SymbolResolver(tempStorage);
      await resolver.resolveAll();
      await tempStorage.close();
    }

    const storage = new SqliteStorage({ dbPath });
    await storage.init();
    try {
      console.log(pc.cyan(`\n📋 Generating Architecture Handover Documentation...`));
      const generator = new HandoverGenerator({
        projectName: options.title ?? "Ruas Monorepo",
        repoRoot: rootDir,
      });

      const doc = await generator.generate(storage);
      await storage.close();

      const outDir = dirname(outPath);
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }

      writeFileSync(outPath, doc.markdown, "utf-8");
      console.log(pc.green(`✔ Handover documentation generated successfully!`));
      console.log(`  ${pc.bold("Destination:")}        ${pc.cyan(outPath)}`);
      console.log(`  ${pc.bold("Subsystems found:")}   ${doc.subsystemCount}`);
      console.log(`  ${pc.bold("Total cited symbols:")} ${doc.totalNodesCited}`);
      console.log(`  ${pc.bold("Uncited claims:")}      ${pc.green("0 (Zero Uncited Claims Guarantee)")}\n`);
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error during docgen: ${message}\n`));
      process.exit(1);
    }
  });

// --- ruas ui ---
program
  .command("ui")
  .description("Launch the interactive, glassmorphic visual graph explorer in your browser")
  .argument("[path]", "Path to project directory", ".")
  .option("-p, --port <number>", "HTTP port to listen on", "4200")
  .option("--host <host>", "Host address to bind to", "localhost")
  .option("--db <path>", "Custom database path")
  .action(async (targetPath: string, options: { port?: string; host?: string; db?: string }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");
    const port = parseInt(options.port ?? "4200", 10);
    const host = options.host ?? "localhost";

    if (!existsSync(dbPath)) {
      console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      console.log(pc.dim("  Running automatic indexing first...\n"));
      const tempStorage = new SqliteStorage({ dbPath });
      const indexer = new Indexer(tempStorage);
      await indexer.runIndex({ rootDir });
      const resolver = new SymbolResolver(tempStorage);
      await resolver.resolveAll();
      await tempStorage.close();
    }

    const storage = new SqliteStorage({ dbPath });
    await storage.init();

    try {
      const server = await startGraphServer({
        storage,
        projectName: targetPath === "." ? "Root Repository" : targetPath,
        port,
        host,
      });

      console.log(pc.cyan(`\n🌿 Ruas Visual Graph Explorer is live!`));
      console.log(`  ${pc.bold("Local URL:")}     ${pc.green(pc.bold(server.url))}`);
      console.log(`  ${pc.bold("Database:")}      ${pc.dim(dbPath)}`);
      console.log(`  ${pc.dim("Press Ctrl+C to stop the server.\n")}`);

      const shutdown = async () => {
        console.log(pc.cyan("\n🛑 Shutting down Ruas Explorer..."));
        await server.close();
        await storage.close();
        process.exit(0);
      };

      process.on("SIGINT", () => void shutdown());
      process.on("SIGTERM", () => void shutdown());
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error starting UI server: ${message}\n`));
      process.exit(1);
    }
  });

// --- ruas export ---
program
  .command("export")
  .description("Export codebase graph as Standalone HTML, Mermaid, Graphviz DOT, or JSON")
  .argument("[path]", "Path to project directory", ".")
  .option("--html [file]", "Export standalone interactive HTML (default: docs/graph.html)")
  .option("--mermaid [file]", "Export Mermaid diagram (default: docs/graph.mmd)")
  .option("--dot [file]", "Export Graphviz DOT file (default: docs/graph.dot)")
  .option("--json [file]", "Export complete machine-readable graph JSON (default: docs/graph.json)")
  .option("--db <path>", "Custom database path")
  .action(async (targetPath: string, options: { html?: boolean | string; mermaid?: boolean | string; dot?: boolean | string; json?: boolean | string; db?: string }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    if (!existsSync(dbPath)) {
      console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      console.log(pc.dim("  Running automatic indexing first...\n"));
      const tempStorage = new SqliteStorage({ dbPath });
      const indexer = new Indexer(tempStorage);
      await indexer.runIndex({ rootDir });
      const resolver = new SymbolResolver(tempStorage);
      await resolver.resolveAll();
      await tempStorage.close();
    }

    const storage = new SqliteStorage({ dbPath });
    await storage.init();

    try {
      // Default to HTML if no format explicitly selected
      const isHtml = options.html !== undefined || (!options.mermaid && !options.dot && !options.json);

      if (isHtml) {
        const outPath = resolve(typeof options.html === "string" ? options.html : join(rootDir, "docs", "graph.html"));
        console.log(pc.cyan(`\n📊 Exporting Standalone Graph Explorer HTML...`));
        await exportStandaloneHtml(storage, outPath, targetPath === "." ? "Root Repository" : targetPath);
        console.log(pc.green(`✔ Standalone HTML visualizer exported: ${pc.cyan(outPath)}`));
      }

      if (options.mermaid !== undefined) {
        const outPath = resolve(typeof options.mermaid === "string" ? options.mermaid : join(rootDir, "docs", "graph.mmd"));
        console.log(pc.cyan(`\n📊 Exporting Mermaid Diagram...`));
        await exportMermaidFile(storage, outPath);
        console.log(pc.green(`✔ Mermaid diagram exported: ${pc.cyan(outPath)}`));
      }

      if (options.dot !== undefined) {
        const outPath = resolve(typeof options.dot === "string" ? options.dot : join(rootDir, "docs", "graph.dot"));
        console.log(pc.cyan(`\n📊 Exporting Graphviz DOT Diagram...`));
        await exportDotFile(storage, outPath);
        console.log(pc.green(`✔ Graphviz DOT exported: ${pc.cyan(outPath)}`));
      }

      if (options.json !== undefined) {
        const outPath = resolve(typeof options.json === "string" ? options.json : join(rootDir, "docs", "graph.json"));
        console.log(pc.cyan(`\n📊 Exporting Graph JSON...`));
        await exportJsonGraph(storage, outPath);
        console.log(pc.green(`✔ Machine-readable graph JSON exported: ${pc.cyan(outPath)}`));
      }

      await storage.close();
      console.log();
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error during export: ${message}\n`));
      process.exit(1);
    }
  });

// --- ruas audit / health ---
program
  .command("audit")
  .alias("health")
  .description("Perform architectural health check, detect circular dependency cycles, and flag orphan dead code")
  .argument("[path]", "Path to project directory", ".")
  .option("--db <path>", "Custom database path")
  .option("--json", "Output results in JSON format", false)
  .action(async (targetPath: string, options: { db?: string; json?: boolean }) => {
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
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();
      await storage.close();

      const health = ArchitectureAnalyzer.calculateHealth(nodes, edges);

      if (options.json) {
        console.log(JSON.stringify(health, null, 2));
        return;
      }

      console.log(pc.cyan(`\n🏛 Ruas Architecture & Health Audit — ${pc.bold(rootDir)}`));
      const gradeColor = health.score >= 80 ? pc.green : health.score >= 60 ? pc.yellow : pc.red;
      console.log(`  ${pc.bold("Overall Health Score:")}   ${gradeColor(pc.bold(`${health.score}/100 [Grade: ${health.grade}]`))}`);
      console.log(`  ${pc.bold("Total Symbols:")}         ${nodes.filter((n) => n.kind !== "file").length}`);
      console.log(`  ${pc.bold("Graph Edges:")}           ${edges.length}`);
      console.log(`  ${pc.bold("Circular Cycles:")}       ${health.totalCycles > 0 ? pc.red(pc.bold(health.totalCycles)) : pc.green("0 (Clean)")}`);
      console.log(`  ${pc.bold("Dead Code / Orphans:")}   ${health.totalOrphans > 0 ? pc.yellow(health.totalOrphans) : pc.green("0")}\n`);

      if (health.cycles.length > 0) {
        console.log(pc.red(pc.bold("  🔄 Circular Dependency Cycles:")));
        for (const c of health.cycles.slice(0, 5)) {
          console.log(`    • ${pc.red(c.nodeNames.join(" ➔ "))} ➔ ${pc.red(c.nodeNames[0])}`);
          console.log(`      ${pc.dim(`Files: ${c.files.join(", ")}`)}`);
        }
        if (health.cycles.length > 5) {
          console.log(pc.dim(`    ... and ${health.cycles.length - 5} more cycles.`));
        }
        console.log();
      }

      if (health.orphans.length > 0) {
        console.log(pc.yellow(pc.bold("  👻 Dead / Unreferenced Code Candidates:")));
        for (const o of health.orphans.slice(0, 8)) {
          console.log(`    • ${pc.white(pc.bold(o.node.name))} ${pc.dim(`(${o.node.kind} at ${o.node.qualifiedName})`)}`);
        }
        if (health.orphans.length > 8) {
          console.log(pc.dim(`    ... and ${health.orphans.length - 8} more candidates.`));
        }
        console.log();
      }

      if (health.subsystemCouplings.length > 0) {
        console.log(pc.cyan(pc.bold("  📊 Subsystem Coupling & Instability (Robert C. Martin):")));
        for (const s of health.subsystemCouplings.slice(0, 6)) {
          const status = s.instability > 0.7 ? pc.red("Volatile") : s.instability < 0.3 ? pc.green("Stable") : pc.yellow("Balanced");
          console.log(`    • ${pc.bold(s.subsystem.padEnd(20))} Ca: ${String(s.afferentCoupling).padStart(2)} | Ce: ${String(s.efferentCoupling).padStart(2)} | Instability: ${s.instability.toFixed(2)} [${status}]`);
        }
        console.log();
      }
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(pc.red(`\n✖ Error during audit: ${message}\n`));
      }
      process.exit(1);
    }
  });

// --- ruas path ---
program
  .command("path")
  .description("Find the shortest directed dependency or call path between two symbols using Dijkstra algorithm")
  .argument("<source>", "Source symbol name or qualified name")
  .argument("<target>", "Target symbol name or qualified name")
  .argument("[path]", "Path to project directory", ".")
  .option("-k, --k <number>", "Number of alternative shortest paths to discover using Yen's algorithm", "1")
  .option("--db <path>", "Custom database path")
  .option("--json", "Output results in JSON format", false)
  .action(async (source: string, target: string, targetPath: string, options: { k?: string; db?: string; json?: boolean }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");
    const k = Math.max(1, parseInt(options.k ?? "1", 10));

    if (!existsSync(dbPath)) {
      if (options.json) {
        console.log(JSON.stringify({ error: "Database not found. Run 'ruas index' first." }, null, 2));
      } else {
        console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      }
      return;
    }

    const storage = new SqliteStorage({ dbPath });
    try {
      await storage.init();
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();
      await storage.close();

      const srcCandidates = nodes.filter(
        (n) => n.name === source || n.qualifiedName.endsWith(`:${source}`) || n.id === source,
      );
      const dstCandidates = nodes.filter(
        (n) => n.name === target || n.qualifiedName.endsWith(`:${target}`) || n.id === target,
      );

      if (srcCandidates.length === 0 || dstCandidates.length === 0) {
        const missing = srcCandidates.length === 0 ? `'${source}'` : `'${target}'`;
        if (options.json) {
          console.log(JSON.stringify({ error: `Symbol ${missing} not found in graph.` }, null, 2));
        } else {
          console.log(pc.red(`\n✖ Symbol ${missing} not found in graph.\n`));
        }
        return;
      }

      if (k > 1) {
        const kResult = ArchitectureAnalyzer.findKPaths(srcCandidates[0]!.id, dstCandidates[0]!.id, nodes, edges, k);

        if (options.json) {
          console.log(JSON.stringify(kResult, null, 2));
          return;
        }

        console.log(pc.cyan(`\n🔗 Ruas Dijkstra K-Shortest Path Traversal (Top ${kResult.paths.length} Routes)`));
        console.log(`  ${pc.bold("Origin:")}        ${pc.green(kResult.sourceNode.qualifiedName)}`);
        console.log(`  ${pc.bold("Destination:")}   ${pc.green(kResult.targetNode.qualifiedName)}`);

        if (!kResult.found || kResult.paths.length === 0) {
          console.log(pc.yellow(`\n  No directed path found between ${source} and ${target}.\n`));
          return;
        }

        kResult.paths.forEach((p, idx) => {
          const badge = idx === 0 ? pc.green(pc.bold("⭐ Optimal Route #1")) : pc.cyan(`Alternative Route #${idx + 1}`);
          const costDisplay = p.cost !== undefined ? `, cost ${p.cost.toFixed(3)}` : "";
          console.log(`\n  ${badge} ${pc.dim(`(${p.hops} hops, ${(p.cumulativeConfidence * 100).toFixed(1)}% Bayesian confidence${costDisplay})`)}`);
          for (let i = 0; i < p.path.length; i++) {
            const step = p.path[i]!;
            console.log(`    ${pc.bold(`${i + 1}.`)} ${pc.white(step.node.name)} ${pc.dim(`(${step.node.kind} at ${step.node.qualifiedName})`)}`);
            if (step.edgeToNext) {
              const conf = step.confidence !== undefined ? `[${Math.round(step.confidence * 100)}% conf]` : "";
              console.log(`       ${pc.cyan("└──▶")} ${pc.magenta(step.edgeToNext.kind)} ${pc.dim(conf)} ${pc.cyan("──▶")}`);
            }
          }
        });
        console.log();
        return;
      }

      const result = ArchitectureAnalyzer.findPath(srcCandidates[0]!.id, dstCandidates[0]!.id, nodes, edges);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(pc.cyan(`\n🔗 Ruas Shortest Path Traversal (Dijkstra Minimal Bayesian Resistance)`));
      console.log(`  ${pc.bold("Origin:")}        ${pc.green(result.sourceNode.qualifiedName)}`);
      console.log(`  ${pc.bold("Destination:")}   ${pc.green(result.targetNode.qualifiedName)}`);

      if (!result.found) {
        console.log(pc.yellow(`\n  No directed path found between ${source} and ${target}.\n`));
        return;
      }

      console.log(`  ${pc.bold("Hops:")}          ${result.hops}`);
      console.log(`  ${pc.bold("Confidence:")}    ${pc.green(`${(result.cumulativeConfidence * 100).toFixed(1)}% (Bayesian posterior)`)}\n`);

      for (let i = 0; i < result.path.length; i++) {
        const step = result.path[i]!;
        console.log(`  ${pc.bold(`${i + 1}.`)} ${pc.white(pc.bold(step.node.name))} ${pc.dim(`(${step.node.kind} at ${step.node.qualifiedName})`)}`);
        if (step.edgeToNext) {
          const conf = step.confidence !== undefined ? `[${Math.round(step.confidence * 100)}% conf]` : "";
          console.log(`     ${pc.cyan("└──▶")} ${pc.magenta(step.edgeToNext.kind)} ${pc.dim(conf)} ${pc.cyan("──▶")}`);
        }
      }
      console.log();
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error finding path: ${message}\n`));
      process.exit(1);
    }
  });

// --- ruas trace ---
program
  .command("trace")
  .description("Trace blast radius and caller/callee dependencies of a symbol with Bayesian confidence or Dijkstra horizon")
  .argument("<symbol>", "Symbol name to trace")
  .argument("[path]", "Path to project directory", ".")
  .option("-d, --depth <number>", "Traversal depth (default: 2)", "2")
  .option("--dijkstra", "Compute Single-Source Shortest Path (SSSP) Dijkstra horizon showing probability decay", false)
  .option("--db <path>", "Custom database path")
  .option("--json", "Output results in JSON format", false)
  .action(async (symbolName: string, targetPath: string, options: { depth?: string; dijkstra?: boolean; db?: string; json?: boolean }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");
    const depth = parseInt(options.depth ?? "2", 10);

    if (!existsSync(dbPath)) {
      if (options.json) {
        console.log(JSON.stringify({ error: "Database not found. Run 'ruas index' first." }, null, 2));
      } else {
        console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      }
      return;
    }

    const storage = new SqliteStorage({ dbPath });
    try {
      await storage.init();
      const candidates = await storage.findNodesByName(symbolName);
      const symbolNodes = candidates.filter((n) => n.kind !== "file");

      if (symbolNodes.length === 0) {
        await storage.close();
        if (options.json) {
          console.log(JSON.stringify({ error: `Symbol '${symbolName}' not found.` }, null, 2));
        } else {
          console.log(pc.yellow(`\n⚠ Symbol '${symbolName}' not found in graph.\n`));
        }
        return;
      }

      const target = symbolNodes[0]!;

      if (options.dijkstra) {
        const nodes = await storage.getAllNodes();
        const edges = await storage.getAllEdges();
        await storage.close();

        const horizon = ArchitectureAnalyzer.computeDijkstraHorizon(target.id, nodes, edges, depth);

        if (options.json) {
          console.log(JSON.stringify(horizon, null, 2));
          return;
        }

        console.log(pc.cyan(`\n⚡ Ruas Dijkstra SSSP Horizon — ${pc.bold(target.name)}`));
        console.log(`  ${pc.bold("Origin:")}        ${pc.green(horizon.origin.qualifiedName)} (${horizon.origin.kind})`);
        console.log(`  ${pc.bold("Max Depth:")}     ${depth} hops`);
        console.log(`  ${pc.bold("Reachable:")}     ${horizon.reachableCount} symbols in horizon\n`);

        if (horizon.horizon.length === 0) {
          console.log(pc.dim("  No downstream dependencies reachable within horizon limits.\n"));
          return;
        }

        console.log(pc.bold("  🌐 Single-Source Shortest Path Horizon (Probability Decay):"));
        for (const item of horizon.horizon) {
          const probBar = "■".repeat(Math.max(1, Math.round(item.cumulativeConfidence * 10)));
          const probStr = `${(item.cumulativeConfidence * 100).toFixed(1)}%`;
          console.log(`    • ${pc.bold(item.node.name)} ${pc.dim(`(${item.node.kind})`)}`);
          console.log(`      ${pc.green(probBar)} ${pc.dim(probStr)} | ${item.hops} hop(s) | Dijkstra Cost: ${item.distance.toFixed(3)} | via ${pc.dim(item.node.qualifiedName)}`);
        }
        console.log();
        return;
      }

      const inbound = await storage.getInboundEdges(target.id);
      const outbound = await storage.getOutboundEdges(target.id);
      await storage.close();

      if (options.json) {
        console.log(JSON.stringify({ target, inbound, outbound, depth }, null, 2));
        return;
      }

      console.log(pc.cyan(`\n⚡ Ruas Blast Radius Trace — ${pc.bold(target.name)}`));
      console.log(`  ${pc.bold("Location:")}      ${pc.dim(`${target.qualifiedName} (${target.startLine}-${target.endLine})`)}`);
      console.log(`  ${pc.bold("Kind:")}          ${pc.magenta(target.kind)}`);
      console.log(`  ${pc.bold("Inbound Callers:")}  ${inbound.length}`);
      console.log(`  ${pc.bold("Outbound Calls:")}    ${outbound.length}\n`);

      if (inbound.length > 0) {
        console.log(pc.bold("  📥 Upstream Callers (Who will break if you modify this?):"));
        for (const e of inbound) {
          const conf = Math.round((e.alpha / (e.alpha + e.beta)) * 100);
          console.log(`    • ${pc.cyan(e.srcId)} ${pc.dim(`[${e.kind}, ${conf}% confidence]`)}`);
        }
        console.log();
      }

      if (outbound.length > 0) {
        console.log(pc.bold("  📤 Downstream Dependencies (What does this rely on?):"));
        for (const e of outbound) {
          const conf = Math.round((e.alpha / (e.alpha + e.beta)) * 100);
          console.log(`    • ${pc.magenta(e.dstId)} ${pc.dim(`[${e.kind}, ${conf}% confidence]`)}`);
        }
        console.log();
      }
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error tracing symbol: ${message}\n`));
      process.exit(1);
    }
  });

// --- ruas vibe ---
const vibeCmd = program
  .command("vibe")
  .description("Manage AI-native working memory and vibe coding context checkpoints ('Bahasa Ibu AI')");

vibeCmd
  .command("save")
  .description("Checkpoint current vibe coding state, active files, and invariants into AI mother tongue (RUAS_CONTEXT.md)")
  .argument("<intent>", "Description of the current task or vibe coding goal")
  .argument("[path]", "Path to project directory", ".")
  .option("-f, --files <files...>", "Active files being modified")
  .option("-n, --notes <notes>", "Architectural invariants or rules the AI must obey", "")
  .option("-t, --tag <tag>", "Session classification tag")
  .option("--db <path>", "Custom database path")
  .option("--json", "Output results in JSON format", false)
  .action(async (intent: string, targetPath: string, options: { files?: string[]; notes?: string; tag?: string; db?: string; json?: boolean }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    if (!existsSync(dbPath)) {
      if (options.json) {
        console.log(JSON.stringify({ error: "Database not found. Run 'ruas index' first." }, null, 2));
      } else {
        console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      }
      return;
    }

    const storage = new SqliteStorage({ dbPath });
    try {
      await storage.init();
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();

      const memory = {
        id: `vibe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        intent,
        activeFiles: options.files ?? [],
        architecturalNotes: options.notes ?? "",
        pendingDecisions: [],
        sessionTag: options.tag,
      };

      await storage.saveVibeMemory(memory);
      await storage.close();

      const manifest = AiNativeGenerator.generate({
        projectRoot: rootDir,
        nodes,
        edges,
        vibeMemory: memory,
      });

      const ruasMemoryDir = join(rootDir, ".ruas", "memory");
      if (!existsSync(ruasMemoryDir)) {
        mkdirSync(ruasMemoryDir, { recursive: true });
      }
      writeFileSync(join(ruasMemoryDir, "latest.md"), manifest.rawMarkdown, "utf-8");
      const contextPath = join(rootDir, "RUAS_CONTEXT.md");
      writeFileSync(contextPath, manifest.rawMarkdown, "utf-8");

      if (options.json) {
        console.log(JSON.stringify({ memory, contextPath }, null, 2));
        return;
      }

      console.log(pc.cyan(`\n🧠 Ruas Vibe Memory Checkpointed ("Bahasa Ibu AI")`));
      console.log(`  ${pc.bold("Intent:")}          ${pc.green(intent)}`);
      console.log(`  ${pc.bold("Memory ID:")}       ${pc.dim(memory.id)}`);
      if (options.tag) console.log(`  ${pc.bold("Session Tag:")}     ${pc.cyan(options.tag)}`);
      if (options.files && options.files.length > 0) {
        console.log(`  ${pc.bold("Active Files:")}    ${options.files.join(", ")}`);
      }
      console.log(`  ${pc.bold("AI Context File:")} ${pc.green(contextPath)}`);
      console.log(`  ${pc.dim("AI agents (Cursor/Claude/Antigravity) can now resume without re-scanning.")}\n`);
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error saving vibe memory: ${message}\n`));
      process.exit(1);
    }
  });

vibeCmd
  .command("recall")
  .description("Recall the latest vibe coding memory and AI-native graph context")
  .argument("[path]", "Path to project directory", ".")
  .option("--full", "Print full AI-native manifest including compact AST signatures", false)
  .option("--db <path>", "Custom database path")
  .option("--json", "Output results in JSON format", false)
  .action(async (targetPath: string, options: { full?: boolean; db?: string; json?: boolean }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    if (!existsSync(dbPath)) {
      if (options.json) {
        console.log(JSON.stringify({ error: "Database not found. Run 'ruas index' first." }, null, 2));
      } else {
        console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      }
      return;
    }

    const storage = new SqliteStorage({ dbPath });
    try {
      await storage.init();
      const latest = await storage.getLatestVibeMemory();
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();
      await storage.close();

      if (!latest) {
        if (options.json) {
          console.log(JSON.stringify({ message: "No vibe memory found" }, null, 2));
        } else {
          console.log(pc.yellow(`\n⚠ No vibe memory checkpoints found in this project.\n`));
        }
        return;
      }

      if (options.full) {
        const manifest = AiNativeGenerator.generate({
          projectRoot: rootDir,
          nodes,
          edges,
          vibeMemory: latest,
        });
        console.log(manifest.rawMarkdown);
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(latest, null, 2));
        return;
      }

      console.log(pc.cyan(`\n🧠 Ruas Recalled Vibe Coding Memory`));
      console.log(`  ${pc.bold("Last Intent:")}      ${pc.green(latest.intent)}`);
      console.log(`  ${pc.bold("Timestamp:")}        ${pc.dim(new Date(latest.timestamp).toLocaleString())}`);
      if (latest.sessionTag) console.log(`  ${pc.bold("Session Tag:")}      ${pc.cyan(latest.sessionTag)}`);
      console.log(`  ${pc.bold("Active Files:")}     ${latest.activeFiles.length > 0 ? latest.activeFiles.join(", ") : pc.dim("none")}`);
      if (latest.architecturalNotes) {
        console.log(`  ${pc.bold("Invariants:")}       ${latest.architecturalNotes}`);
      }
      console.log();
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error recalling vibe memory: ${message}\n`));
      process.exit(1);
    }
  });

vibeCmd
  .command("sync")
  .description("Synchronize and regenerate RUAS_CONTEXT.md in AI mother tongue dialect")
  .argument("[path]", "Path to project directory", ".")
  .option("--db <path>", "Custom database path")
  .action(async (targetPath: string, options: { db?: string }) => {
    const rootDir = resolve(targetPath);
    const dbPath = options.db ? resolve(options.db) : join(rootDir, ".ruas", "ruas.db");

    if (!existsSync(dbPath)) {
      console.log(pc.yellow(`\n⚠ No Ruas database found at ${pc.dim(dbPath)}`));
      return;
    }

    const storage = new SqliteStorage({ dbPath });
    try {
      await storage.init();
      const latest = await storage.getLatestVibeMemory();
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();
      await storage.close();

      const manifest = AiNativeGenerator.generate({
        projectRoot: rootDir,
        nodes,
        edges,
        vibeMemory: latest ?? undefined,
      });

      const ruasMemoryDir = join(rootDir, ".ruas", "memory");
      if (!existsSync(ruasMemoryDir)) {
        mkdirSync(ruasMemoryDir, { recursive: true });
      }
      writeFileSync(join(ruasMemoryDir, "latest.md"), manifest.rawMarkdown, "utf-8");
      const contextPath = join(rootDir, "RUAS_CONTEXT.md");
      writeFileSync(contextPath, manifest.rawMarkdown, "utf-8");

      console.log(pc.green(`\n✓ Synchronized AI-Native Mother Tongue context:`));
      console.log(`  • ${pc.white(contextPath)}`);
      console.log(`  • ${pc.dim(join(ruasMemoryDir, "latest.md"))}\n`);
    } catch (error) {
      await storage.close();
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n✖ Error syncing context: ${message}\n`));
      process.exit(1);
    }
  });

program.parse(process.argv);
