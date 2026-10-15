import type { NodeRecord, EdgeRecord, VibeMemoryRecord, AiNativeContextManifest } from "@ruas/core";

export interface GenerateAiNativeOptions {
  readonly projectRoot: string;
  readonly nodes: readonly NodeRecord[];
  readonly edges: readonly EdgeRecord[];
  readonly vibeMemory?: VibeMemoryRecord | undefined;
  readonly tokenBudget?: number | undefined;
}

/**
 * Generates an LLM-native context manifest designed specifically as "AI's Mother Tongue":
 * High Shannon entropy, zero conversational fluff, deterministic symbol signatures,
 * Bayesian edge probabilities, and active vibe coding memory continuity.
 */
export class AiNativeGenerator {
  public static generate(options: GenerateAiNativeOptions): AiNativeContextManifest {
    const { projectRoot, nodes, edges, vibeMemory } = options;

    const dependencyKinds = new Set(["calls", "imports", "extends", "implements", "references"]);
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();

    for (const n of nodes) {
      inDegreeMap.set(n.id, 0);
      outDegreeMap.set(n.id, 0);
    }

    for (const e of edges) {
      if (dependencyKinds.has(e.kind)) {
        outDegreeMap.set(e.srcId, (outDegreeMap.get(e.srcId) ?? 0) + 1);
        inDegreeMap.set(e.dstId, (inDegreeMap.get(e.dstId) ?? 0) + 1);
      }
    }

    // Identify God Symbols / Central Hubs
    const godSymbols = nodes
      .filter((n) => n.kind !== "file")
      .map((n) => ({
        id: n.id,
        name: n.name,
        kind: n.kind,
        inDegree: inDegreeMap.get(n.id) ?? 0,
        outDegree: outDegreeMap.get(n.id) ?? 0,
      }))
      .sort((a, b) => b.inDegree + b.outDegree - (a.inDegree + a.outDegree))
      .slice(0, 10);

    // Identify High-Confidence Trajectories (Bayesian probability >= 0.8)
    const criticalTrajectories: {
      source: string;
      target: string;
      pathSignature: string;
      bayesianConfidence: number;
    }[] = [];

    const nodeNameMap = new Map<string, string>(nodes.map((n) => [n.id, n.name]));

    for (const e of edges) {
      if (dependencyKinds.has(e.kind)) {
        const conf = e.alpha / (e.alpha + e.beta);
        if (conf >= 0.8 && criticalTrajectories.length < 20) {
          const srcName = nodeNameMap.get(e.srcId) ?? e.srcId;
          const dstName = nodeNameMap.get(e.dstId) ?? e.dstId;
          criticalTrajectories.push({
            source: srcName,
            target: dstName,
            pathSignature: `[${srcName}] --(${e.kind.toUpperCase()}:${(conf * 100).toFixed(0)}%)--> [${dstName}]`,
            bayesianConfidence: Math.round(conf * 1000) / 1000,
          });
        }
      }
    }

    // Build the Markdown payload
    const lines: string[] = [];

    // YAML Frontmatter for instant parsing by Agent reasoning engines
    lines.push("---");
    lines.push("ruas_dialect: ai-native/v1");
    lines.push('target: "Autonomous AI Coding Agents (Cursor, Claude, Antigravity, Cline)"');
    lines.push(`generated_at: "${new Date().toISOString()}"`);
    lines.push(`project_root: "${projectRoot}"`);
    lines.push(`total_symbols: ${nodes.length}`);
    lines.push(`total_edges: ${edges.length}`);
    if (vibeMemory) {
      lines.push(`vibe_session_id: "${vibeMemory.id}"`);
      lines.push(`vibe_timestamp: ${vibeMemory.timestamp}`);
    }
    lines.push("---");
    lines.push("");

    lines.push("# 🌿 Ruas AI-Native Memory & Working Context");
    lines.push("> **LLM NOTICE:** This document is pre-indexed semantic ground truth. Do NOT rescan ASTs or hallucinate unverified relationships.\n");

    // Vibe Memory Section (Working memory of the coding session)
    if (vibeMemory) {
      lines.push("## 🧠 Active Vibe Intent & Working Memory");
      lines.push(`- **Developer Intent:** \`${vibeMemory.intent}\``);
      if (vibeMemory.sessionTag) {
        lines.push(`- **Session Tag:** \`${vibeMemory.sessionTag}\``);
      }
      lines.push(`- **Active Files (${vibeMemory.activeFiles.length}):**`);
      for (const f of vibeMemory.activeFiles) {
        lines.push(`  - \`${f}\``);
      }
      if (vibeMemory.architecturalNotes) {
        lines.push(`- **Architectural Notes / Invariants:**\n  ${vibeMemory.architecturalNotes}`);
      }
      if (vibeMemory.pendingDecisions && vibeMemory.pendingDecisions.length > 0) {
        lines.push("- **Pending Decisions / Open Tasks:**");
        for (const task of vibeMemory.pendingDecisions) {
          lines.push(`  - [ ] ${task}`);
        }
      }
      lines.push("");
    }

    // Hub Nodes
    lines.push("## 🏛️ Central Hub Symbols (God Nodes)");
    lines.push("| Symbol | Kind | Inbound Callers | Outbound Calls | Risk Assessment |");
    lines.push("| :--- | :--- | :---: | :---: | :--- |");
    for (const g of godSymbols) {
      const risk = g.inDegree > 5 ? "🔴 HIGH BLAST RADIUS" : "🟡 MODERATE";
      lines.push(`| \`${g.name}\` | \`${g.kind}\` | ${g.inDegree} | ${g.outDegree} | ${risk} |`);
    }
    lines.push("");

    // High-Confidence Trajectories
    lines.push("## ⚡ Bayesian Critical Call Trajectories");
    for (const traj of criticalTrajectories) {
      lines.push(`- \`${traj.pathSignature}\``);
    }
    lines.push("");

    // Compact Signatures
    lines.push("## 📐 Compact AST Signatures (Zero-Fluff Token Layout)");
    const fileIdToPath = new Map<string, string>();
    for (const n of nodes) {
      if (n.kind === "file") {
        fileIdToPath.set(n.fileId, n.qualifiedName);
      }
    }

    const fileGroup = new Map<string, NodeRecord[]>();
    for (const n of nodes) {
      if (n.kind === "file") continue;
      const path = fileIdToPath.get(n.fileId) ?? (n.qualifiedName.includes(":") ? n.qualifiedName.split(":")[0]! : "unknown");
      const list = fileGroup.get(path) ?? [];
      list.push(n);
      fileGroup.set(path, list);
    }

    for (const [file, fileNodes] of fileGroup.entries()) {
      lines.push(`### \`${file}\``);
      for (const fn of fileNodes) {
        const sig = fn.signature ? ` :: ${fn.signature}` : "";
        lines.push(`- [${fn.kind}] \`${fn.name}\`${sig} (L${fn.startLine}-L${fn.endLine})`);
      }
      lines.push("");
    }

    const rawMarkdown = lines.join("\n");

    return {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      targetProject: projectRoot,
      totalSymbols: nodes.length,
      totalEdges: edges.length,
      godSymbols,
      criticalTrajectories,
      activeVibeMemory: vibeMemory,
      rawMarkdown,
    };
  }
}
