import { z } from "zod";
import type { Storage } from "@ruas/store";
import { AiNativeGenerator } from "@ruas/docgen";

export const RecallContextInputSchema = {
  includeFullManifest: z
    .boolean()
    .optional()
    .describe("If true, returns the complete AI-native mother tongue manifest including compact AST signatures (default: true)."),
  sessionLimit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Number of recent vibe memory checkpoints to inspect (default: 3)."),
};

export function registerRecallContextTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  projectRoot = ".",
): void {
  server.tool(
    "recall_context",
    "Recall previously persisted vibe coding memory, working state, and AI-native graph context to prevent LLM amnesia and context drift.",
    RecallContextInputSchema,
    async ({
      includeFullManifest = true,
      sessionLimit = 3,
    }: {
      includeFullManifest?: boolean;
      sessionLimit?: number;
    }) => {
      const memories = await storage.getAllVibeMemories(sessionLimit);

      if (memories.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No vibe coding memory checkpoints found yet. You can save your working memory using the `save_context` tool or CLI command `ruas vibe save`.",
            },
          ],
        };
      }

      const latest = memories[0]!;

      if (!includeFullManifest) {
        const lines: string[] = [];
        lines.push("## 🧠 Recalled Vibe Coding Memory");
        lines.push(`- **Latest Intent:** \`${latest.intent}\``);
        lines.push(`- **Last Saved:** ${new Date(latest.timestamp).toLocaleString()}`);
        lines.push(`- **Active Files (${latest.activeFiles.length}):**`);
        for (const f of latest.activeFiles) lines.push(`  - \`${f}\``);
        lines.push(`- **Architectural Invariants:**\n  ${latest.architecturalNotes}`);
        if (latest.pendingDecisions.length > 0) {
          lines.push("- **Pending Tasks:**");
          for (const d of latest.pendingDecisions) lines.push(`  - [ ] ${d}`);
        }
        return {
          content: [
            {
              type: "text",
              text: lines.join("\n"),
            },
          ],
        };
      }

      const nodes = await storage.getAllNodes();
      const edges = await storage.getAllEdges();

      const manifest = AiNativeGenerator.generate({
        projectRoot,
        nodes,
        edges,
        vibeMemory: latest,
      });

      return {
        content: [
          {
            type: "text",
            text: manifest.rawMarkdown,
          },
        ],
      };
    },
  );
}
