import type { Storage } from "@ruas/store";

export function registerProjectOverviewTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void {
  server.tool(
    "project_overview",
    "Get an executive graph overview of the codebase topology, language composition, structural hubs, and overall technical debt summary.",
    {},
    async () => {
      const stats = await storage.getStats();
      const files = await storage.getAllFiles();
      const edges = await storage.getAllEdges();

      // Language distribution
      const langCounts = new Map<string, number>();
      for (const f of files) {
        langCounts.set(f.lang, (langCounts.get(f.lang) ?? 0) + 1);
      }
      const langList = Array.from(langCounts.entries())
        .map(([lang, count]) => `${lang}: ${count} file(s) (${((count / (files.length || 1)) * 100).toFixed(1)}%)`)
        .join(", ");

      // Edge kinds
      const edgeKinds = new Map<string, number>();
      for (const e of edges) {
        edgeKinds.set(e.kind, (edgeKinds.get(e.kind) ?? 0) + 1);
      }
      const edgeSummary = Array.from(edgeKinds.entries())
        .map(([k, c]) => `${k}: ${c}`)
        .join(", ");

      // Top 10 In-degree Hubs (symbols most depended upon)
      const inDegree = new Map<string, number>();
      for (const e of edges) {
        if (e.kind === "calls" || e.kind === "imports") {
          inDegree.set(e.dstId, (inDegree.get(e.dstId) ?? 0) + 1);
        }
      }

      const sortedHubs = Array.from(inDegree.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const topHubsText: string[] = [];
      for (let i = 0; i < sortedHubs.length; i++) {
        const [nodeId, degree] = sortedHubs[i]!;
        const node = await storage.getNodeById(nodeId);
        if (node && node.kind !== "file") {
          topHubsText.push(`  ${i + 1}. \`${node.qualifiedName}\` (${node.kind}) — **${degree} inbound callers/dependents**`);
        }
      }

      const totalRelations = stats.edgeCount;
      let complexityCritique = "";
      if (stats.fileCount > 0 && totalRelations / stats.fileCount > 15) {
        complexityCritique = "Tingkat coupling codebase sangat tinggi (rata-rata >15 edges per file). Waspada 'god objects' dan circular dependencies.";
      } else if (stats.unresolvedCount > stats.nodeCount * 0.5) {
        complexityCritique = "Banyak unresolved references terdeteksi. Kemungkinan ada dynamic imports, missing stubs, atau global variable injection.";
      } else {
        complexityCritique = "Arsitektur coupling dalam batas wajar. Tetap monitor regression saat refactoring central hubs.";
      }

      const output = [
        "## 🏛 Ruas Project Graph Overview",
        "",
        "### 📊 Repository Composition",
        `- **Total Files Scanned:** ${stats.fileCount}`,
        `- **Languages Detected:** ${langList || "none"}`,
        `- **Total AST Nodes Extracted:** ${stats.nodeCount}`,
        `- **Total Calibrated Edges:** ${stats.edgeCount} (${edgeSummary || "none"})`,
        `- **Pending Unresolved References:** ${stats.unresolvedCount}`,
        "",
        "### 🌟 Top 10 Central Hubs (Highest Blast Radius)",
        topHubsText.length > 0 ? topHubsText.join("\n") : "  *(No cross-symbol dependencies indexed yet)*",
        "",
        "### ⚡ [Architectural Critique]",
        `> ${complexityCritique}`,
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    },
  );
}
