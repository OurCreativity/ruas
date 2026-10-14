import { createServer, type Server } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Storage } from "@ruas/store";
import type { FileRecord, NodeRecord } from "@ruas/core";
import {
  LeidenCommunityDetector,
  PersonalizedPageRank,
  SubsystemLabeler,
} from "@ruas/rank";
import { renderGraphHtml, type GraphPayload } from "./template.js";

export interface ServerOptions {
  readonly storage: Storage;
  readonly projectName?: string;
  readonly port?: number;
  readonly host?: string;
}

export interface RunningServer {
  readonly port: number;
  readonly url: string;
  readonly close: () => Promise<void>;
}

export async function buildGraphPayload(
  storage: Storage,
  projectName = "Ruas Project",
): Promise<GraphPayload> {
  const files = await storage.getAllFiles();
  const fileMap = new Map<string, FileRecord>();
  for (const f of files) {
    fileMap.set(f.id, f);
  }

  const allNodes: NodeRecord[] = [];
  const nonFileNodes: NodeRecord[] = [];
  for (const f of files) {
    const nodes = await storage.getNodesByFileId(f.id);
    for (const n of nodes) {
      allNodes.push(n);
      if (n.kind !== "file") {
        nonFileNodes.push(n);
      }
    }
  }

  const allEdges = await storage.getAllEdges();
  const nonFileNodeIds = nonFileNodes.map((n) => n.id);

  // Community detection (Leiden)
  const detector = new LeidenCommunityDetector({ resolution: 1.0, maxIterations: 15 });
  const rawCommunities = detector.detect(nonFileNodeIds, allEdges);
  const labeledCommunities = SubsystemLabeler.labelCommunities(
    rawCommunities.communities,
    nonFileNodes,
    3,
  );

  const nodeToCommMap = new Map<string, { id: number; label: string }>();
  for (const c of labeledCommunities) {
    for (const nid of c.nodeIds) {
      nodeToCommMap.set(nid, { id: c.communityId, label: c.label ?? `subsystem-${c.communityId}` });
    }
  }

  // PageRank centrality
  const ppr = new PersonalizedPageRank({ damping: 0.85, maxIterations: 20 });
  const seeds = new Map<string, number>();
  const uniformSeed = 1.0 / (nonFileNodeIds.length || 1);
  for (const id of nonFileNodeIds) {
    seeds.set(id, uniformSeed);
  }
  const pprScoresList = ppr.compute(nonFileNodeIds, allEdges, seeds);
  const pprMap = new Map<string, number>();
  for (const s of pprScoresList) {
    pprMap.set(s.nodeId, s.score);
  }

  const PALETTE = [
    "#06B6D4", "#8B5CF6", "#10B981", "#EC4899",
    "#F59E0B", "#3B82F6", "#14B8A6", "#A855F7",
    "#6366F1", "#F43F5E", "#84CC16", "#0EA5E9",
  ];

  const subsystems = labeledCommunities.map((c, idx) => ({
    id: c.communityId,
    label: c.label ?? `subsystem-${c.communityId}`,
    count: c.nodeIds.length,
    color: PALETTE[idx % PALETTE.length]!,
  }));

  const payloadNodes = nonFileNodes.map((n) => {
    const file = fileMap.get(n.fileId);
    const commInfo = nodeToCommMap.get(n.id) ?? { id: 0, label: "default" };
    return {
      id: n.id,
      name: n.name,
      kind: n.kind,
      file: file ? file.path : "unknown",
      startLine: n.startLine,
      endLine: n.endLine,
      signature: n.signature,
      docComment: n.docComment,
      pprScore: pprMap.get(n.id) ?? 0,
      communityId: commInfo.id,
      subsystemLabel: commInfo.label,
    };
  });

  const payloadEdges = allEdges.map((e) => {
    const conf = e.alpha / (e.alpha + e.beta);
    return {
      id: e.id,
      srcId: e.srcId,
      dstId: e.dstId,
      kind: e.kind,
      confidence: conf,
      credibleInterval: [Math.max(0, conf - 0.1), Math.min(1, conf + 0.1)] as const,
    };
  });

  return {
    projectName,
    nodes: payloadNodes,
    edges: payloadEdges,
    subsystems,
    stats: {
      totalFiles: files.length,
      totalNodes: payloadNodes.length,
      totalEdges: payloadEdges.length,
      totalSubsystems: subsystems.length,
    },
  };
}

export async function exportStandaloneHtml(
  storage: Storage,
  outPath: string,
  projectName = "Ruas Project",
): Promise<void> {
  const payload = await buildGraphPayload(storage, projectName);
  const html = renderGraphHtml(payload);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf-8");
}

export async function startGraphServer(options: ServerOptions): Promise<RunningServer> {
  const host = options.host ?? "localhost";
  const port = options.port ?? 4200;
  const payload = await buildGraphPayload(options.storage, options.projectName);

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);

    if (url.pathname === "/api/graph") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderGraphHtml(payload));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      const actualUrl = `http://${host}:${actualPort}`;
      resolve({
        port: actualPort,
        url: actualUrl,
        close: async () => {
          return new Promise<void>((res) => {
            server.close(() => res());
          });
        },
      });
    });
  });
}
