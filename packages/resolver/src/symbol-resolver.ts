import {
  type EdgeRecord,
  createEdgeId,
} from "@ruas/core";
import type { Storage } from "@ruas/store";
import { EvidenceRules } from "./evidence-rules.js";

export interface ResolutionSummary {
  readonly totalRefsEvaluated: number;
  readonly edgesCreated: number;
  readonly highConfidenceEdges: number;
  readonly ambiguousEdges: number;
}

export class SymbolResolver {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  public async resolveAll(): Promise<ResolutionSummary> {
    const refs = await this.storage.getAllUnresolvedRefs();
    const newEdges: EdgeRecord[] = [];
    let highConfCount = 0;
    let ambiguousCount = 0;

    // Cache candidate queries by symbol name
    const candidateCache = new Map<string, Awaited<ReturnType<Storage["findNodesByName"]>>>();

    for (const ref of refs) {
      let candidates = candidateCache.get(ref.name);
      if (!candidates) {
        candidates = await this.storage.findNodesByName(ref.name);
        candidateCache.set(ref.name, candidates);
      }

      // Filter out file nodes, keep symbols (functions, methods, classes, interfaces)
      const validCandidates = candidates.filter(
        (c) => c.kind !== "file" && c.id !== ref.srcId,
      );

      if (validCandidates.length === 0) {
        continue;
      }

      // 1. Same-scope / same-file check
      const sameFileCandidate = validCandidates.find((c) => c.fileId === ref.fileId);
      if (sameFileCandidate) {
        const evidence = EvidenceRules.sameScope(ref.fileId);
        const edge: EdgeRecord = {
          id: createEdgeId(ref.srcId, sameFileCandidate.id, ref.kind),
          srcId: ref.srcId,
          dstId: sameFileCandidate.id,
          kind: ref.kind,
          alpha: evidence.alpha,
          beta: evidence.beta,
          evidenceJson: JSON.stringify(evidence),
        };
        newEdges.push(edge);
        highConfCount += 1;
        await this.storage.deleteUnresolvedRef(ref.id);
        continue;
      }

      // 2. Exact import check
      if (ref.kind === "imports") {
        // Find best candidate
        const candidate = validCandidates[0]!;
        const evidence = EvidenceRules.exactImport(ref.fileId);
        const edge: EdgeRecord = {
          id: createEdgeId(ref.srcId, candidate.id, "imports"),
          srcId: ref.srcId,
          dstId: candidate.id,
          kind: "imports",
          alpha: evidence.alpha,
          beta: evidence.beta,
          evidenceJson: JSON.stringify(evidence),
        };
        newEdges.push(edge);
        highConfCount += 1;
        await this.storage.deleteUnresolvedRef(ref.id);
        continue;
      }

      // 3. Unique candidate check
      if (validCandidates.length === 1) {
        const candidate = validCandidates[0]!;
        const evidence = EvidenceRules.uniqueCandidate(candidate.id);
        const edge: EdgeRecord = {
          id: createEdgeId(ref.srcId, candidate.id, ref.kind),
          srcId: ref.srcId,
          dstId: candidate.id,
          kind: ref.kind,
          alpha: evidence.alpha,
          beta: evidence.beta,
          evidenceJson: JSON.stringify(evidence),
        };
        newEdges.push(edge);
        const p = evidence.alpha / (evidence.alpha + evidence.beta);
        if (p >= 0.85) {
          highConfCount += 1;
        }
        await this.storage.deleteUnresolvedRef(ref.id);
        continue;
      }

      // 4. Ambiguous candidates ($K > 1$)
      const evidence = EvidenceRules.ambiguousCandidates(validCandidates.length);
      for (const candidate of validCandidates) {
        const edge: EdgeRecord = {
          id: createEdgeId(ref.srcId, candidate.id, ref.kind),
          srcId: ref.srcId,
          dstId: candidate.id,
          kind: ref.kind,
          alpha: evidence.alpha,
          beta: evidence.beta,
          evidenceJson: JSON.stringify(evidence),
        };
        newEdges.push(edge);
      }
      ambiguousCount += validCandidates.length;
      await this.storage.deleteUnresolvedRef(ref.id);
    }

    if (newEdges.length > 0) {
      await this.storage.upsertEdges(newEdges);
    }

    return {
      totalRefsEvaluated: refs.length,
      edgesCreated: newEdges.length,
      highConfidenceEdges: highConfCount,
      ambiguousEdges: ambiguousCount,
    };
  }
}
