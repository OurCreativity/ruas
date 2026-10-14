import { z } from "zod";
import { computeBetaCredibleInterval, type EdgeRecord, type NodeRecord } from "@ruas/core";
import type { Storage } from "@ruas/store";
import { ContextBudgeter, type FormattableItem } from "../budgeter.js";

export const TraceImpactInputSchema = {
  symbol: z
    .string()
    .min(1)
    .describe("Name or qualified name of the target function, method, or class to inspect."),
  direction: z
    .enum(["inbound", "outbound", "both"])
    .default("both")
    .describe("Trace inbound callers (who calls this), outbound callees (what this calls), or both."),
  depth: z
    .number()
    .int()
    .positive()
    .max(4)
    .default(2)
    .describe("Maximum traversal depth in the code call graph (1-4, default: 2)."),
  tokenBudget: z
    .number()
    .int()
    .positive()
    .max(16000)
    .default(4000)
    .describe("Maximum token budget for response payload (default: 4000)."),
};

interface TraversedPath {
  readonly edge: EdgeRecord;
  readonly neighborNode: NodeRecord;
  readonly direction: "inbound" | "outbound";
  readonly depth: number;
}

export function registerTraceImpactTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void {
  server.tool(
    "trace_impact",
    "Trace blast radius, dependency call chains, and breaking change risks for a symbol using statistically calibrated Bayesian edges.",
    TraceImpactInputSchema,
    async ({
      symbol,
      direction = "both",
      depth = 2,
      tokenBudget = 4000,
    }: {
      symbol: string;
      direction?: "inbound" | "outbound" | "both";
      depth?: number;
      tokenBudget?: number;
    }) => {
      const candidates = await storage.findNodesByName(symbol);
      const symbolNodes = candidates.filter((n) => n.kind !== "file");

      if (symbolNodes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No symbol found matching '${symbol}'. Check the symbol name or run 'ask_code' to locate it.`,
            },
          ],
        };
      }

      const target = symbolNodes[0]!;
      const allFiles = await storage.getAllFiles();
      const fileMap = new Map(allFiles.map((f) => [f.id, f.path]));

      // BFS Graph Traversal up to specified depth
      const visitedNodes = new Set<string>([target.id]);
      const paths: TraversedPath[] = [];

      let currentLayer = [target.id];

      for (let d = 1; d <= depth; d++) {
        const nextLayer: string[] = [];

        for (const nodeId of currentLayer) {
          // 1. Inbound edges (Callers)
          if (direction === "inbound" || direction === "both") {
            const inEdges = await storage.getInboundEdges(nodeId);
            for (const edge of inEdges) {
              if (!visitedNodes.has(edge.srcId)) {
                visitedNodes.add(edge.srcId);
                nextLayer.push(edge.srcId);
                const callerNode = await storage.getNodeById(edge.srcId);
                if (callerNode && callerNode.kind !== "file") {
                  paths.push({
                    edge,
                    neighborNode: callerNode,
                    direction: "inbound",
                    depth: d,
                  });
                }
              }
            }
          }

          // 2. Outbound edges (Callees)
          if (direction === "outbound" || direction === "both") {
            const outEdges = await storage.getOutboundEdges(nodeId);
            for (const edge of outEdges) {
              if (!visitedNodes.has(edge.dstId)) {
                visitedNodes.add(edge.dstId);
                nextLayer.push(edge.dstId);
                const calleeNode = await storage.getNodeById(edge.dstId);
                if (calleeNode && calleeNode.kind !== "file") {
                  paths.push({
                    edge,
                    neighborNode: calleeNode,
                    direction: "outbound",
                    depth: d,
                  });
                }
              }
            }
          }
        }

        currentLayer = nextLayer;
        if (currentLayer.length === 0) break;
      }

      const inboundPaths = paths.filter((p) => p.direction === "inbound");
      const outboundPaths = paths.filter((p) => p.direction === "outbound");
      const impactedFileIds = new Set(paths.map((p) => p.neighborNode.fileId));

      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      if (inboundPaths.length > 10 || impactedFileIds.size > 5) {
        riskLevel = "CRITICAL";
      } else if (inboundPaths.length > 5 || impactedFileIds.size > 2) {
        riskLevel = "HIGH";
      } else if (inboundPaths.length > 1) {
        riskLevel = "MEDIUM";
      }

      // Emotional damage assessment
      let roastVerdict = "";
      if (riskLevel === "CRITICAL") {
        roastVerdict = `Lu mau refactor '${target.name}'? Ada ${inboundPaths.length} callers di ${impactedFileIds.size} files berbeda yang bakal nangis darah kalau lu ubah signature tanpa deprecation grace period. Jangan sotoy.`;
      } else if (riskLevel === "HIGH") {
        roastVerdict = `Perubahan di '${target.name}' bakal bocor ke ${inboundPaths.length} callers. Kalau lu gak nulis unit test buat semua caller ini, lu cuma mindahin bug ke production.`;
      } else if (riskLevel === "MEDIUM") {
        roastVerdict = `Blast radius lumayan (${inboundPaths.length} callers). Minimal run test suite sebelum lu merge PR ini.`;
      } else {
        roastVerdict = `Fungsi aman atau terisolasi (${inboundPaths.length} callers). Bisa diubah santai, tapi jangan sampai bikin dead code baru.`;
      }

      const targetPath = fileMap.get(target.fileId) ?? target.fileId;
      const header = [
        `### Impact Trace & Blast Radius: \`${target.qualifiedName}\``,
        `- **Location:** \`${targetPath}:${target.startLine}-${target.endLine}\``,
        `- **Blast Radius Risk:** \`${riskLevel}\``,
        `- **Direct & Transitive Callers (Inbound):** ${inboundPaths.length}`,
        `- **Direct & Transitive Callees (Outbound):** ${outboundPaths.length}`,
        `- **Affected Files Count:** ${impactedFileIds.size}`,
        `> ⚡ **[Emotional Damage Assessment]:** ${roastVerdict}`,
        "",
        "---",
      ].join("\n");

      const items: FormattableItem[] = [];

      for (const p of paths) {
        const filePath = fileMap.get(p.neighborNode.fileId) ?? p.neighborNode.fileId;
        const interval = computeBetaCredibleInterval(p.edge.alpha, p.edge.beta);
        const dirLabel = p.direction === "inbound" ? "⬅ CALLER" : "➡ CALLEE";

        const block = [
          `#### [Hop ${p.depth}] ${dirLabel}: \`${p.neighborNode.qualifiedName}\``,
          `- **Location:** \`${filePath}:${p.neighborNode.startLine}-${p.neighborNode.endLine}\``,
          `- **Edge Relationship:** \`${p.edge.kind}\``,
          `- **Bayesian Confidence:** Mean ${(interval.mean * 100).toFixed(1)}% (95% CI: [${(interval.lower * 100).toFixed(1)}%, ${(interval.upper * 100).toFixed(1)}%], α=${p.edge.alpha}, β=${p.edge.beta})`,
        ].join("\n");

        items.push({
          citation: {
            file: filePath,
            startLine: p.neighborNode.startLine,
            endLine: p.neighborNode.endLine,
            symbol: p.neighborNode.name,
          },
          formattedBlock: block,
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
