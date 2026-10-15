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
};

export function registerFindPathTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void {
  server.tool(
    "find_path",
    "Find the shortest directed call and dependency path between two symbols in the codebase with step-by-step Bayesian confidence scoring.",
    FindPathInputSchema,
    async ({
      fromSymbol,
      toSymbol,
    }: {
      fromSymbol: string;
      toSymbol: string;
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

      const result = ArchitectureAnalyzer.findPath(srcNode.id, dstNode.id, nodes, edges);

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
      lines.push(`## 🔗 Shortest Dependency Path`);
      lines.push(`- **Origin:** \`${result.sourceNode.qualifiedName}\` (${result.sourceNode.kind})`);
      lines.push(`- **Destination:** \`${result.targetNode.qualifiedName}\` (${result.targetNode.kind})`);
      lines.push(`- **Hops:** ${result.hops}`);
      lines.push(`- **Cumulative Bayesian Confidence:** ${(result.cumulativeConfidence * 100).toFixed(1)}%\n`);

      lines.push(`### Step-by-Step Traversal:`);
      for (let i = 0; i < result.path.length; i++) {
        const step = result.path[i]!;
        lines.push(`${i + 1}. \`${step.node.qualifiedName}\` (${step.node.kind})`);
        if (step.edgeToNext) {
          const conf = step.confidence !== undefined ? `[confidence: ${(step.confidence * 100).toFixed(1)}%]` : "";
          lines.push(`   └─▶ ${step.edgeToNext.kind.toUpperCase()} ${conf} ──▶`);
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
