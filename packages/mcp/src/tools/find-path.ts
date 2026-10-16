import { z } from "zod";
import type { NodeRecord } from "@ruas/core";
import type { Storage } from "@ruas/store";
import { ArchitectureAnalyzer } from "@ruas/rank";

export const FindPathInputSchema = {
  fromSymbol: z
    .string()
    .min(1)
    .describe("Name or qualified name of the source symbol (caller / origin)."),
  toSymbol: z
    .string()
    .min(1)
    .describe("Name or qualified name of the target symbol (callee / destination)."),
  k: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Number of alternative shortest paths to discover using Yen's algorithm (default: 1)."),
  fuzzy: z
    .boolean()
    .optional()
    .describe("Apply Mamdani fuzzy impedance weighting to discover minimum-friction paths and evaluate path fragility."),
};

export function registerFindPathTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void {
  server.tool(
    "find_path",
    "Find the optimal and alternative directed call/dependency paths between two symbols in the codebase using Dijkstra and Yen's algorithms with Bayesian confidence and Mamdani Fuzzy impedance scoring.",
    FindPathInputSchema,
    async ({
      fromSymbol,
      toSymbol,
      k = 1,
      fuzzy = false,
    }: {
      fromSymbol: string;
      toSymbol: string;
      k?: number;
      fuzzy?: boolean;
    }) => {
      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();

      const srcCandidates = nodes.filter(
        (n: NodeRecord) => n.name === fromSymbol || n.qualifiedName.endsWith(`:${fromSymbol}`) || n.id === fromSymbol,
      );
      const dstCandidates = nodes.filter(
        (n: NodeRecord) => n.name === toSymbol || n.qualifiedName.endsWith(`:${toSymbol}`) || n.id === toSymbol,
      );

      if (srcCandidates.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Source symbol '${fromSymbol}' was not found in the codebase graph.`,
            },
          ],
        };
      }

      if (dstCandidates.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Target symbol '${toSymbol}' was not found in the codebase graph.`,
            },
          ],
        };
      }

      const srcNode = srcCandidates[0]!;
      const dstNode = dstCandidates[0]!;

      if (k > 1) {
        const kResult = ArchitectureAnalyzer.findKPaths(srcNode.id, dstNode.id, nodes, edges, k, fuzzy);
        if (!kResult.found || kResult.paths.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No directed call or dependency path found between \`${srcNode.qualifiedName}\` and \`${dstNode.qualifiedName}\`.`,
              },
            ],
          };
        }

        const lines: string[] = [];
        lines.push(`## 🔗 Top ${kResult.paths.length} Shortest Paths (Dijkstra / Yen's Algorithm${fuzzy ? " + Fuzzy FIS" : ""})`);
        lines.push(`- **Origin:** \`${kResult.sourceNode.qualifiedName}\` (${kResult.sourceNode.kind})`);
        lines.push(`- **Destination:** \`${kResult.targetNode.qualifiedName}\` (${kResult.targetNode.kind})\n`);

        kResult.paths.forEach((p, idx) => {
          const badge = idx === 0 ? "⭐ Optimal Route" : `Alternative Route #${idx + 1}`;
          const costStr = p.cost !== undefined ? `cost ${p.cost.toFixed(3)}` : "";
          const fuzzyStr = p.fuzzyResistance !== undefined ? `friction ${p.fuzzyResistance}/100` : "";
          const meta = [
            `${p.hops} hops`,
            `${(p.cumulativeConfidence * 100).toFixed(1)}% confidence`,
            costStr,
            fuzzyStr,
          ]
            .filter(Boolean)
            .join(", ");
          lines.push(`### ${badge} (${meta})`);
          if (p.fuzzyEvaluation) {
            lines.push(`> 🧠 **Fuzzy Risk:** ${p.fuzzyEvaluation.crispGrade} (${p.fuzzyEvaluation.rawScore}/100) — *${p.fuzzyEvaluation.rationale}*\n`);
          }
          for (let i = 0; i < p.path.length; i++) {
            const step = p.path[i]!;
            lines.push(`  ${i + 1}. \`${step.node.qualifiedName}\` (${step.node.kind})`);
            if (step.edgeToNext) {
              const conf = step.confidence !== undefined ? `[confidence: ${(step.confidence * 100).toFixed(1)}%]` : "";
              const fImp = step.fuzzyStepImpedance !== undefined ? ` [impedance: ${step.fuzzyStepImpedance}]` : "";
              lines.push(`     └─▶ ${step.edgeToNext.kind.toUpperCase()} ${conf}${fImp} ──▶`);
            }
          }
          lines.push("");
        });

        return {
          content: [
            {
              type: "text",
              text: lines.join("\n"),
            },
          ],
        };
      }

      const result = ArchitectureAnalyzer.findPath(srcNode.id, dstNode.id, nodes, edges, fuzzy);

      if (!result.found) {
        return {
          content: [
            {
              type: "text",
              text: `No directed call or dependency path found between \`${srcNode.qualifiedName}\` and \`${dstNode.qualifiedName}\`.`,
            },
          ],
        };
      }

      const lines: string[] = [];
      lines.push(`## 🔗 Optimal Shortest Path (Dijkstra${fuzzy ? " + Fuzzy Impedance" : ""})`);
      lines.push(`- **Origin:** \`${result.sourceNode.qualifiedName}\` (${result.sourceNode.kind})`);
      lines.push(`- **Destination:** \`${result.targetNode.qualifiedName}\` (${result.targetNode.kind})`);
      lines.push(`- **Hops:** ${result.hops}`);
      lines.push(`- **Cumulative Bayesian Confidence:** ${(result.cumulativeConfidence * 100).toFixed(1)}%`);
      if (result.fuzzyEvaluation) {
        lines.push(`- **Fuzzy Path Resistance:** ${result.fuzzyEvaluation.rawScore}/100 (${result.fuzzyEvaluation.crispGrade})`);
        lines.push(`- **Fuzzy Trajectory Evaluation:** ${result.fuzzyEvaluation.rationale}\n`);
      } else {
        lines.push("");
      }

      lines.push(`### Step-by-Step Traversal:`);
      for (let i = 0; i < result.path.length; i++) {
        const step = result.path[i]!;
        lines.push(`${i + 1}. \`${step.node.qualifiedName}\` (${step.node.kind})`);
        if (step.edgeToNext) {
          const conf = step.confidence !== undefined ? `[confidence: ${(step.confidence * 100).toFixed(1)}%]` : "";
          const fImp = step.fuzzyStepImpedance !== undefined ? ` [friction: ${step.fuzzyStepImpedance}]` : "";
          lines.push(`   └─▶ ${step.edgeToNext.kind.toUpperCase()} ${conf}${fImp} ──▶`);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: lines.join("\n"),
          },
        ],
      };
    },
  );
}
