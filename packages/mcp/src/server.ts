import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Storage } from "@ruas/store";
import { registerAskCodeTool } from "./tools/ask-code.js";
import { registerTraceImpactTool } from "./tools/trace-impact.js";
import { registerProjectOverviewTool } from "./tools/project-overview.js";
import { registerAnalyzeArchitectureTool } from "./tools/analyze-architecture.js";
import { registerFindPathTool } from "./tools/find-path.js";

export interface RuasMcpServerOptions {
  readonly name?: string | undefined;
  readonly version?: string | undefined;
}

export function createRuasMcpServer(
  storage: Storage,
  options?: RuasMcpServerOptions,
): McpServer {
  const server = new McpServer({
    name: options?.name ?? "ruas-code-intelligence",
    version: options?.version ?? "0.1.0",
  });

  registerAskCodeTool(server, storage);
  registerTraceImpactTool(server, storage);
  registerProjectOverviewTool(server, storage);
  registerAnalyzeArchitectureTool(server, storage);
  registerFindPathTool(server, storage);

  return server;
}

export async function runStdioServer(
  storage: Storage,
  options?: RuasMcpServerOptions,
): Promise<void> {
  await storage.init();
  const server = createRuasMcpServer(storage, options);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Clean shutdown handling
  const shutdown = async () => {
    try {
      await server.close();
      await storage.close();
    } catch {
      // Ignore shutdown errors
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}
