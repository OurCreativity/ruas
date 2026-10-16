import { z } from "zod";
import type { Storage } from "@ruas/store";
import { RetrievalPipeline } from "@ruas/rank";
import { ContextBudgeter, type FormattableItem } from "../budgeter.js";

export const AskCodeInputSchema = {
  query: z
    .string()
    .min(1)
    .describe(
      "Natural language or mixed code query in English, Indonesian, or technical slang (e.g. 'fungsi hitung diskon', 'qris payment verification', 'cek tarif ongkir').",
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(20)
    .default(5)
    .describe("Maximum number of relevant symbols to return (default: 5)."),
  tokenBudget: z
    .number()
    .int()
    .positive()
    .max(16000)
    .default(4000)
    .describe("Token budget ceiling for response payload (default: 4000)."),
  roast: z
    .boolean()
    .default(true)
    .describe("Enable brutal 'emotional damage' blast radius and technical debt review."),
};

export function registerAskCodeTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  pipeline?: RetrievalPipeline,
): void {
  const retrievalPipeline = pipeline ?? new RetrievalPipeline(storage);

  server.tool(
    "ask_code",
    "Search and retrieve code symbols, functions, classes, and workflows across the repository with calibrated multilingual graph ranking and brutal technical debt critique.",
    AskCodeInputSchema,
    async ({
      query,
      limit = 5,
      tokenBudget = 4000,
      roast = true,
    }: {
      query: string;
      limit?: number;
      tokenBudget?: number;
      roast?: boolean;
    }) => {
      const result = await retrievalPipeline.search(query, limit, roast);
      const allFiles = await storage.getAllFiles();
      const fileMap = new Map(allFiles.map((f) => [f.id, f.path]));

      const header = [
        `### Ruas Code Intelligence: \`${result.query}\``,
        `- **Detected Language:** ${result.detectedLang.toUpperCase()}`,
        `- **Concepts Expanded:** ${result.expandedConcepts.join(", ") || "none"}`,
        `- **Matches Found:** ${result.symbols.length} symbol(s) retrieved in ${result.durationMs}ms`,
      ].join("\n");

      const items: FormattableItem[] = [];

      for (let i = 0; i < result.symbols.length; i++) {
        const item = result.symbols[i]!;
        const node = item.node;
        const filePath = fileMap.get(node.fileId) ?? node.fileId;

        const lines: string[] = [
          `#### #${i + 1} [${node.kind}] \`${node.qualifiedName}\``,
          `- **Location:** \`${filePath}:${node.startLine}-${node.endLine}\``,
        ];

        if (node.signature) {
          lines.push(`- **Signature:** \`${node.signature}\``);
        }

        if (node.docComment) {
          lines.push(`- **Documentation:** *${node.docComment.replace(/\n+/g, " ").trim()}*`);
        }

        if (item.fuzzyEvaluation) {
          lines.push(
            `- **Fuzzy Risk Evaluation:** \`${item.fuzzyEvaluation.rawScore}% [${item.fuzzyEvaluation.crispGrade}]\` (${item.fuzzyEvaluation.rationale})`,
          );
        } else {
          lines.push(`- **Blast Radius Risk:** \`${item.riskLevel.toUpperCase()}\``);
        }

        if (roast && item.roastComment) {
          lines.push(`> ⚡ **[Emotional Damage]:** ${item.roastComment}`);
        }

        items.push({
          citation: {
            file: filePath,
            startLine: node.startLine,
            endLine: node.endLine,
            symbol: node.name,
          },
          formattedBlock: lines.join("\n"),
        });
      }

      const packet = ContextBudgeter.assemble(header, items, tokenBudget);

      return {
        content: [
          {
            type: "text",
            text: packet.text,
          },
        ],
      };
    },
  );
}
