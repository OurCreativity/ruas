import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { ArchitectureConfig } from "@ruas/core";
import type { Storage } from "@ruas/store";
import { ArchitectureLinter } from "@ruas/rank";

export const LintArchitectureInputSchema = {
  preset: z
    .enum([
      "clean-architecture",
      "hexagonal",
      "onion",
      "feature-sliced-design",
      "modular-monolith",
    ])
    .optional()
    .describe("Built-in architecture preset name (clean-architecture, hexagonal, onion, feature-sliced-design, modular-monolith)."),
  configJson: z
    .string()
    .optional()
    .describe("Optional JSON string defining layers and dependency boundary rules."),
  configPath: z
    .string()
    .optional()
    .describe("Optional relative or absolute path to architecture.json configuration file."),
};

export function registerLintArchitectureTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  projectRoot: string = ".",
): void {
  server.tool(
    "lint_architecture",
    "Lint codebase against architectural layer boundaries, detecting forbidden dependencies, Clean Architecture breaches, and computing continuous fuzzy violation severity scores.",
    LintArchitectureInputSchema,
    async ({
      preset,
      configJson,
      configPath,
    }: {
      preset?: string | undefined;
      configJson?: string | undefined;
      configPath?: string | undefined;
    }) => {
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();

      let config: ArchitectureConfig | null = null;

      if (preset) {
        config = ArchitectureLinter.getPreset(preset) ?? null;
      }

      if (!config && configJson) {
        try {
          config = JSON.parse(configJson) as ArchitectureConfig;
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: "text", text: `Error parsing configJson: ${err}` }],
            isError: true,
          };
        }
      } else {
        const candidatePaths = [
          configPath,
          join(projectRoot, ".ruas", "architecture.json"),
          join(projectRoot, "ruas.architecture.json"),
          join(projectRoot, ".architecture.json"),
        ].filter(Boolean) as string[];

        for (const p of candidatePaths) {
          if (existsSync(p)) {
            try {
              const raw = readFileSync(p, "utf-8");
              config = JSON.parse(raw) as ArchitectureConfig;
              break;
            } catch {
              // try next
            }
          }
        }
      }

      if (!config) {
        config = ArchitectureLinter.generateDefaultConfig(nodes);
      }

      const report = ArchitectureLinter.lint(nodes, edges, config);

      const sections: string[] = [];
      sections.push(`# 🏛 Architectural Boundary Linter Report`);
      sections.push(`- **Purity Score:** ${report.purityScore}/100 (Grade: ${report.grade})`);
      if (report.fuzzyEvaluation) {
        sections.push(
          `- **Fuzzy Risk Assessment:** ${report.fuzzyEvaluation.crispGrade} (Score: ${report.fuzzyEvaluation.rawScore}%)`,
        );
        const dist = report.fuzzyEvaluation.linguisticDistribution;
        sections.push(
          `- **Fuzzy Distribution:** Clean: ${Math.round((dist.Clean ?? 0) * 100)}% | Fair: ${Math.round((dist.Fair ?? 0) * 100)}% | Fragile: ${Math.round((dist.Fragile ?? 0) * 100)}% | Critical: ${Math.round((dist.Critical ?? 0) * 100)}%`,
        );
        sections.push(`- **Rationale:** *${report.fuzzyEvaluation.rationale}*`);
      }
      sections.push(`- **Total Violations:** ${report.totalViolations}`);
      sections.push(`- **Declared Layers:** ${Object.keys(config.layers).join(", ")}`);

      sections.push(`\n## 📁 Layer Breakdown & Cross-Boundary Outbound Flows`);
      sections.push(`| Layer | Symbols | Outbound Calls | Boundary Violations |`);
      sections.push(`| :--- | :--- | :--- | :--- |`);
      for (const st of report.layerStats) {
        sections.push(
          `| **${st.layer}** | ${st.symbolCount} | ${st.outboundCalls} | ${st.violationCount > 0 ? `⚠️ **${st.violationCount}**` : "✅ 0"} |`,
        );
      }

      if (report.violations.length > 0) {
        sections.push(`\n## 🚫 Boundary Violations (${report.violations.length})`);
        for (const v of report.violations.slice(0, 20)) {
          const badge =
            v.severity === "Critical" ? "🔴 [Critical]" : v.severity === "Warning" ? "🟡 [Warning]" : "⚪ [Info]";
          sections.push(
            `- ${badge} **${v.srcNode.name}** (\`${v.srcLayer}\`) ➔ **${v.dstNode.name}** (\`${v.dstLayer}\`) via \`${v.edge.kind}\` (μ=${v.fuzzyViolationDegree.toFixed(2)})`,
          );
          sections.push(`  - **Rule Message:** ${v.message}`);
          sections.push(`  - **Source Location:** \`${v.srcNode.qualifiedName}\``);
        }
        if (report.violations.length > 20) {
          sections.push(`- *... and ${report.violations.length - 20} additional boundary violations.*`);
        }
      } else {
        sections.push(`\n## ✅ Architectural Compliance`);
        sections.push(`All dependency flows respect defined layer boundaries. Zero violations detected.`);
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
