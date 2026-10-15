import { z } from "zod";
import type { NodeRecord } from "@ruas/core";
import type { Storage } from "@ruas/store";
import { ArchitectureAnalyzer } from "@ruas/rank";

export const AnalyzeArchitectureInputSchema = {
  includeCycles: z
    .boolean()
    .default(true)
    .describe("Whether to include circular dependency cycles in the report."),
  includeOrphans: z
    .boolean()
    .default(true)
    .describe("Whether to include dead/unreferenced code orphan symbols in the report."),
  includeCoupling: z
    .boolean()
    .default(true)
    .describe("Whether to include subsystem coupling and instability metrics in the report."),
};

export function registerAnalyzeArchitectureTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void {
  server.tool(
    "analyze_architecture",
    "Analyze overall codebase architecture health, detect circular dependency cycles, find unreferenced dead code (orphans), and calculate coupling/instability metrics.",
    AnalyzeArchitectureInputSchema,
    async ({
      includeCycles = true,
      includeOrphans = true,
      includeCoupling = true,
    }: {
      includeCycles?: boolean;
      includeOrphans?: boolean;
      includeCoupling?: boolean;
    }) => {
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();

      const health = ArchitectureAnalyzer.calculateHealth(nodes, edges);

      const sections: string[] = [];

      sections.push(`# 🏛 Architecture Health Report`);
      sections.push(`- **Health Score:** ${health.score}/100 (Grade: ${health.grade})`);
      sections.push(`- **Total Symbols:** ${nodes.filter((n: NodeRecord) => n.kind !== "file").length}`);
      sections.push(`- **Total Graph Edges:** ${edges.length}`);
      sections.push(`- **Circular Cycles Detected:** ${health.totalCycles}`);
      sections.push(`- **Dead Code Orphans:** ${health.totalOrphans}`);

      if (includeCycles && health.cycles.length > 0) {
        sections.push(`\n## 🔄 Circular Dependency Cycles (${health.cycles.length})`);
        for (const cycle of health.cycles.slice(0, 10)) {
          sections.push(`- **Cycle [${cycle.length} nodes]:** ${cycle.nodeNames.join(" ➔ ")} ➔ ${cycle.nodeNames[0]}`);
          sections.push(`  - Files: ${cycle.files.join(", ")}`);
        }
      }

      if (includeOrphans && health.orphans.length > 0) {
        sections.push(`\n## 👻 Dead / Unreferenced Code Candidates (${health.orphans.length})`);
        for (const orphan of health.orphans.slice(0, 15)) {
          sections.push(`- \`${orphan.node.qualifiedName}\` (${orphan.node.kind}) — ${orphan.reason}`);
        }
      }

      if (includeCoupling && health.subsystemCouplings.length > 0) {
        sections.push(`\n## 📊 Subsystem Coupling & Instability (Robert C. Martin Metrics)`);
        for (const sub of health.subsystemCouplings) {
          sections.push(
            `- **${sub.subsystem}** (${sub.nodeCount} nodes): Ca=${sub.afferentCoupling}, Ce=${sub.efferentCoupling}, Instability=${sub.instability} (${sub.instability > 0.7 ? "Highly Volatile" : sub.instability < 0.3 ? "Highly Stable" : "Balanced"})`,
          );
        }
      }

      if (health.godNodes.length > 0) {
        sections.push(`\n## ⚡ God Symbols & High-Coupling Central Hubs`);
        for (const hub of health.godNodes) {
          sections.push(`- \`${hub.node.qualifiedName}\` — total degree: ${hub.degree}`);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: sections.join("\n"),
          },
        ],
      };
    },
  );
}
