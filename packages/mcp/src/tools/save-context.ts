import { z } from "zod";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Storage } from "@ruas/store";
import type { VibeMemoryRecord } from "@ruas/core";
import { AiNativeGenerator } from "@ruas/docgen";

export const SaveContextInputSchema = {
  intent: z
    .string()
    .min(1)
    .describe("The current vibe coding task, architectural intent, or feature goal being implemented."),
  activeFiles: z
    .array(z.string())
    .describe("List of relative or absolute file paths currently being modified or inspected."),
  architecturalNotes: z
    .string()
    .describe("Crucial invariants, design decisions, architectural traps, or rules the AI should remember."),
  pendingDecisions: z
    .array(z.string())
    .optional()
    .describe("List of pending tasks, unanswered questions, or next steps."),
  sessionTag: z
    .string()
    .optional()
    .describe("Optional tag to classify this working session (e.g. 'qris-refactor', 'auth-flow')."),
  syncContextFile: z
    .boolean()
    .optional()
    .describe("If true, automatically regenerates and writes RUAS_CONTEXT.md in project root (default: true)."),
};

export function registerSaveContextTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  projectRoot = ".",
): void {
  server.tool(
    "save_context",
    "Persist the AI agent's current working memory, active files, architectural invariants, and pending tasks using Ruas Vibe Memory and AI-Native Mother Tongue dialect.",
    SaveContextInputSchema,
    async ({
      intent,
      activeFiles,
      architecturalNotes,
      pendingDecisions = [],
      sessionTag,
      syncContextFile = true,
    }: {
      intent: string;
      activeFiles: string[];
      architecturalNotes: string;
      pendingDecisions?: string[];
      sessionTag?: string;
      syncContextFile?: boolean;
    }) => {
      const memory: VibeMemoryRecord = {
        id: `vibe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        intent,
        activeFiles,
        architecturalNotes,
        pendingDecisions,
        sessionTag,
      };

      await storage.saveVibeMemory(memory);

      let contextFileWritten = false;
      let contextFilePath = "";

      if (syncContextFile) {
        try {
          const nodes = await storage.getAllNodes();
          const edges = await storage.getAllEdges();
          const manifest = AiNativeGenerator.generate({
            projectRoot,
            nodes,
            edges,
            vibeMemory: memory,
          });

          // Write both to .ruas/memory/latest.md and root RUAS_CONTEXT.md
          const ruasDir = join(projectRoot, ".ruas", "memory");
          if (!existsSync(ruasDir)) {
            mkdirSync(ruasDir, { recursive: true });
          }
          writeFileSync(join(ruasDir, "latest.md"), manifest.rawMarkdown, "utf-8");

          contextFilePath = join(projectRoot, "RUAS_CONTEXT.md");
          writeFileSync(contextFilePath, manifest.rawMarkdown, "utf-8");
          contextFileWritten = true;
        } catch {
          // If disk write fails, storage entry is still safe
        }
      }

      const lines: string[] = [];
      lines.push("## 💾 Ruas AI Working Memory Checkpointed Successfully");
      lines.push(`- **Memory ID:** \`${memory.id}\``);
      lines.push(`- **Session Intent:** ${intent}`);
      lines.push(`- **Active Files:** ${activeFiles.length} file(s)`);
      if (sessionTag) lines.push(`- **Tag:** \`${sessionTag}\``);
      if (pendingDecisions.length > 0) {
        lines.push(`- **Pending Tasks:** ${pendingDecisions.length} recorded`);
      }
      if (contextFileWritten) {
        lines.push(`- **AI Mother Tongue Manifest:** Synced to \`${contextFilePath}\` and \`.ruas/memory/latest.md\``);
        lines.push("> Any subsequent AI agent session will automatically inherit this context without re-scanning.");
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
