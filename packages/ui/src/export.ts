import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Storage } from "@ruas/store";
import { ArchitectureAnalyzer } from "@ruas/rank";
import { buildGraphPayload } from "./server.js";

export interface ExportDiagramOptions {
  readonly maxNodes?: number;
  readonly direction?: "TD" | "LR";
  readonly includeConfidence?: boolean;
}

/**
 * Generates an interactive/renderable Mermaid diagram from the code property graph.
 */
export async function generateMermaidGraph(
  storage: Storage,
  options?: ExportDiagramOptions,
): Promise<string> {
  const payload = await buildGraphPayload(storage);
  const maxNodes = options?.maxNodes ?? 60;
  const direction = options?.direction ?? "TD";
  const includeConfidence = options?.includeConfidence ?? true;

  // Select top nodes by PageRank centrality
  const topNodes = [...payload.nodes]
    .sort((a, b) => b.pprScore - a.pprScore)
    .slice(0, maxNodes);
  const topNodeIds = new Set(topNodes.map((n) => n.id));

  const lines: string[] = [];
  lines.push(`graph ${direction}`);
  lines.push(`  %% Ruas Code Intelligence Graph (${payload.projectName})`);
  lines.push(`  classDef func fill:#06B6D4,stroke:#0891B2,color:#fff,stroke-width:2px;`);
  lines.push(`  classDef cls fill:#8B5CF6,stroke:#7C3AED,color:#fff,stroke-width:2px;`);
  lines.push(`  classDef route fill:#F43F5E,stroke:#E11D48,color:#fff,stroke-width:2px;`);
  lines.push(`  classDef meth fill:#10B981,stroke:#059669,color:#fff,stroke-width:2px;`);
  lines.push(`  classDef def fill:#334155,stroke:#475569,color:#fff,stroke-width:1px;`);

  // Group by subsystem
  const subsystemMap = new Map<string, typeof topNodes>();
  for (const n of topNodes) {
    const list = subsystemMap.get(n.subsystemLabel) ?? [];
    list.push(n);
    subsystemMap.set(n.subsystemLabel, list);
  }

  // Sanitize IDs for Mermaid (replace colons, slashes, dashes with underscores)
  const sanitize = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, "_");

  for (const [subsystem, nodes] of subsystemMap.entries()) {
    const cleanSub = sanitize(subsystem);
    lines.push(`  subgraph ${cleanSub}["${subsystem}"]`);
    for (const n of nodes) {
      const nid = sanitize(n.id);
      const label = n.name.replace(/"/g, "'");
      if (n.kind === "function") {
        lines.push(`    ${nid}(["${label}()"]):::func`);
      } else if (n.kind === "class") {
        lines.push(`    ${nid}["Class: ${label}"]:::cls`);
      } else if (n.kind === "route") {
        lines.push(`    ${nid}[["Route: ${label}"]]:::route`);
      } else if (n.kind === "method") {
        lines.push(`    ${nid}["${label}()"]:::meth`);
      } else {
        lines.push(`    ${nid}["${label}"]:::def`);
      }
    }
    lines.push(`  end`);
  }

  // Add dependency edges
  for (const e of payload.edges) {
    if (topNodeIds.has(e.srcId) && topNodeIds.has(e.dstId)) {
      const src = sanitize(e.srcId);
      const dst = sanitize(e.dstId);
      const confStr = includeConfidence ? ` |${e.kind} (${Math.round(e.confidence * 100)}%)|` : ` |${e.kind}|`;
      lines.push(`  ${src} -->${confStr} ${dst}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates Graphviz DOT representation of the code graph.
 */
export async function generateDotGraph(
  storage: Storage,
  options?: ExportDiagramOptions,
): Promise<string> {
  const payload = await buildGraphPayload(storage);
  const maxNodes = options?.maxNodes ?? 80;
  const topNodes = [...payload.nodes]
    .sort((a, b) => b.pprScore - a.pprScore)
    .slice(0, maxNodes);
  const topNodeIds = new Set(topNodes.map((n) => n.id));

  const lines: string[] = [];
  lines.push(`digraph CodeGraph {`);
  lines.push(`  rankdir=${options?.direction ?? "LR"};`);
  lines.push(`  bgcolor="#07090E";`);
  lines.push(`  node [fontname="Helvetica", style="filled", fontcolor="#FFFFFF", penwidth=2];`);
  lines.push(`  edge [fontname="Helvetica", fontsize=9, fontcolor="#94A3B8", color="#334155"];`);

  const sanitize = (id: string) => `"${id.replace(/"/g, '\\"')}"`;

  for (const n of topNodes) {
    const nid = sanitize(n.id);
    let fill = "#334155";
    let color = "#475569";
    let shape = "box";

    if (n.kind === "function") {
      fill = "#06B6D4";
      color = "#0891B2";
      shape = "ellipse";
    } else if (n.kind === "class") {
      fill = "#8B5CF6";
      color = "#7C3AED";
      shape = "component";
    } else if (n.kind === "route") {
      fill = "#F43F5E";
      color = "#E11D48";
      shape = "doubleoctagon";
    } else if (n.kind === "method") {
      fill = "#10B981";
      color = "#059669";
      shape = "rect";
    }

    lines.push(`  ${nid} [label="${n.name}", fillcolor="${fill}", color="${color}", shape="${shape}"];`);
  }

  for (const e of payload.edges) {
    if (topNodeIds.has(e.srcId) && topNodeIds.has(e.dstId)) {
      const src = sanitize(e.srcId);
      const dst = sanitize(e.dstId);
      const conf = Math.round(e.confidence * 100);
      lines.push(`  ${src} -> ${dst} [label="${e.kind} (${conf}%)", weight=${conf}];`);
    }
  }

  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Exports full graph as a machine-readable JSON file.
 */
export async function exportJsonGraph(
  storage: Storage,
  outPath: string,
): Promise<void> {
  const payload = await buildGraphPayload(storage);
  const nodes = await storage.getAllNodes();
  const edges = await storage.getAllEdges();
  const health = ArchitectureAnalyzer.calculateHealth(nodes, edges);

  const fullData = {
    ...payload,
    architectureHealth: health,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(fullData, null, 2), "utf-8");
}

/**
 * Exports Mermaid diagram to a file.
 */
export async function exportMermaidFile(
  storage: Storage,
  outPath: string,
  options?: ExportDiagramOptions,
): Promise<void> {
  const mermaid = await generateMermaidGraph(storage, options);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, mermaid, "utf-8");
}

/**
 * Exports DOT diagram to a file.
 */
export async function exportDotFile(
  storage: Storage,
  outPath: string,
  options?: ExportDiagramOptions,
): Promise<void> {
  const dot = await generateDotGraph(storage, options);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, dot, "utf-8");
}
