---
ruas_dialect: ai-native/v1
target: "Autonomous AI Coding Agents (Cursor, Claude, Antigravity, Cline)"
generated_at: "2026-10-15T03:33:49.559Z"
project_root: "/Users/kou/Project/Graph_Draft"
total_symbols: 349
total_edges: 855
vibe_session_id: "vibe-1792035229556-gjmnz"
vibe_timestamp: 1792035229556
---

# 🌿 Ruas AI-Native Memory & Working Context
> **LLM NOTICE:** This document is pre-indexed semantic ground truth. Do NOT rescan ASTs or hallucinate unverified relationships.

## 🧠 Active Vibe Intent & Working Memory
- **Developer Intent:** `Implementasi Vibe Coding Memory & Bahasa Ibu AI`
- **Session Tag:** `vibe-system`
- **Active Files (1):**
  - `packages/docgen/src/ai-native-generator.ts`
- **Architectural Notes / Invariants:**
  Format Shannon entropy tinggi, bebas fluff, simpan ke RUAS_CONTEXT.md

## 🏛️ Central Hub Symbols (God Nodes)
| Symbol | Kind | Inbound Callers | Outbound Calls | Risk Assessment |
| :--- | :--- | :---: | :---: | :--- |
| `map` | `function` | 33 | 1 | 🔴 HIGH BLAST RADIUS |
| `createNodeId` | `function` | 22 | 1 | 🔴 HIGH BLAST RADIUS |
| `getDatabase` | `method` | 22 | 0 | 🔴 HIGH BLAST RADIUS |
| `splitIdentifierTokens` | `function` | 19 | 1 | 🔴 HIGH BLAST RADIUS |
| `NodeRecord` | `interface` | 16 | 0 | 🔴 HIGH BLAST RADIUS |
| `buildGraphPayload` | `function` | 8 | 7 | 🔴 HIGH BLAST RADIUS |
| `normalizePath` | `function` | 12 | 0 | 🔴 HIGH BLAST RADIUS |
| `visitNode` | `method` | 3 | 9 | 🟡 MODERATE |
| `EdgeRecord` | `interface` | 12 | 0 | 🔴 HIGH BLAST RADIUS |
| `createFileId` | `function` | 10 | 1 | 🔴 HIGH BLAST RADIUS |

## ⚡ Bayesian Critical Call Trajectories
- `[createFileId] --(CALLS:89%)--> [normalizePath]`
- `[createNodeId] --(CALLS:89%)--> [normalizePath]`
- `[map] --(CALLS:89%)--> [ok]`
- `[mapErr] --(CALLS:89%)--> [err]`
- `[fromPromise] --(CALLS:89%)--> [ok]`
- `[fromPromise] --(CALLS:89%)--> [err]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [IndonesianStemmer]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [GlossaryExpander]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [Indexer]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [SymbolResolver]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [RetrievalPipeline]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [AggregateMetrics]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [QueryEvaluationResult]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [aggregateMetrics]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [calculateNdcgAtK]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [calculateRecallAtK]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [calculateReciprocalRank]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [pairedWilcoxonSignedRankTest]`
- `[ablation-runner.ts] --(IMPORTS:95%)--> [BenchmarkQuery]`
- `[runBenchmark] --(CALLS:89%)--> [evaluateVariant]`

## 📐 Compact AST Signatures (Zero-Fluff Token Layout)
### `packages/core/src/ids.ts`
- [function] `normalizePath` :: (filePath: string): string (L7-L9)
- [function] `createFileId` :: (filePath: string): string (L14-L17)
- [function] `createNodeId` :: (
  filePath: string,
  qualifiedName: string,
  kind: NodeKind,
): string (L22-L30)
- [function] `createEdgeId` :: (
  srcId: string,
  dstId: string,
  kind: EdgeKind,
): string (L35-L42)

### `packages/core/src/result.ts`
- [function] `ok` :: (value: T): Ok<T> (L17-L19)
- [function] `err` :: (error: E): Err<E> (L21-L23)
- [function] `isOk` :: (result: Result<T, E>): result is Ok<T> (L25-L27)
- [function] `isErr` :: (result: Result<T, E>): result is Err<E> (L29-L31)
- [function] `unwrap` :: (result: Result<T, E>): T (L33-L44)
- [function] `unwrapOr` :: (result: Result<T, E>, fallback: T): T (L46-L48)
- [function] `map` :: (
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> (L50-L55)
- [function] `mapErr` :: (
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> (L57-L62)
- [function] `andThen` :: (
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> (L64-L69)
- [function] `fromPromise` :: (
  promise: Promise<T>,
  errorHandler: (error: unknown) => E,
): Promise<Result<T, E>> (L71-L81)

### `packages/eval/src/ablation-runner.ts`
- [interface] `VariantResult` :: interface VariantResult (L29-L34)
- [interface] `AblationReport` :: interface AblationReport (L36-L43)
- [class] `AblationRunner` :: class AblationRunner (L45-L248)
- [method] `constructor` :: (tempDir?: string) (L53-L55)
- [method] `setup` :: (): Promise<void> (L57-L89)
- [method] `teardown` :: (): Promise<void> (L91-L96)
- [method] `runBenchmark` :: (): Promise<AblationReport> (L98-L143)
- [method] `evaluateVariant` :: (
    variant: AblationVariant,
    queries: readonly BenchmarkQuery[],
  ): Promise<readonly QueryEvaluationResult[]> (L145-L178)
- [method] `retrieve` :: (variant: AblationVariant, queryText: string): Promise<readonly string[]> (L180-L234)
- [method] `getVariantName` :: (variant: AblationVariant): string (L236-L247)

### `packages/eval/src/dataset.ts`
- [interface] `BenchmarkFile` :: interface BenchmarkFile (L10-L14)
- [interface] `BenchmarkQuery` :: interface BenchmarkQuery (L16-L23)

### `packages/eval/src/metrics.ts`
- [interface] `QueryEvaluationResult` :: interface QueryEvaluationResult (L7-L19)
- [interface] `AggregateMetrics` :: interface AggregateMetrics (L21-L31)
- [function] `calculateRecallAtK` :: (
  retrieved: readonly string[],
  expected: readonly string[],
  k: number,
): number (L37-L51)
- [function] `calculateReciprocalRank` :: (
  retrieved: readonly string[],
  expected: readonly string[],
): number (L57-L70)
- [function] `calculateNdcgAtK` :: (
  retrieved: readonly string[],
  expected: readonly string[],
  k: number,
): number (L77-L103)
- [function] `aggregateMetrics` :: (
  results: readonly QueryEvaluationResult[],
): AggregateMetrics (L108-L157)
- [function] `pairedWilcoxonSignedRankTest` :: (
  scoresA: readonly number[],
  scoresB: readonly number[],
): { readonly statistic: number; readonly pValue: number; readonly isSignificant: boolean } (L164-L237)
- [function] `normalCdf` :: (x: number): number (L242-L257)

### `packages/eval/src/run-eval.ts`
- [function] `main` :: (): Promise<void> (L3-L50)
- [function] `pad` :: (str: string, len: number) (L22-L22)
- [function] `num` :: (n: number, len: number, decimals = 4) (L23-L23)

### `packages/indexer/src/indexer.ts`
- [interface] `IndexOptions` :: interface IndexOptions (L8-L12)
- [interface] `IndexSummary` :: interface IndexSummary (L14-L23)
- [class] `Indexer` :: class Indexer (L25-L120)
- [method] `constructor` :: (storage: Storage, parser?: CodeParser) (L29-L32)
- [method] `runIndex` :: (options: IndexOptions): Promise<IndexSummary> (L34-L119)

### `packages/indexer/src/merkle.ts`
- [interface] `FileManifestEntry` :: interface FileManifestEntry (L6-L11)
- [interface] `DirtySet` :: interface DirtySet (L13-L19)
- [class] `MerkleTree` :: class MerkleTree (L21-L108)
- [method] `hashContent` :: (content: string | Buffer): string (L22-L24)
- [method] `hashFile` :: (absolutePath: string): string (L26-L29)
- [method] `computeDirectoryMerkle` :: (
    fileHashes: ReadonlyMap<string, string>,
  ): ReadonlyMap<string, string> (L34-L57)
- [method] `detectDirtySet` :: (
    currentDiskFiles: readonly WalkedFile[],
    storedFiles: readonly FileRecord[],
  ): DirtySet (L63-L107)

### `packages/nlp/src/glossary.ts`
- [interface] `ExpandedQuery` :: interface ExpandedQuery (L97-L104)
- [class] `GlossaryExpander` :: class GlossaryExpander (L106-L179)
- [method] `constructor` :: (customTerms?: readonly GlossaryTerm[]) (L110-L116)
- [method] `loadYaml` :: (yamlText: string): void (L118-L124)
- [method] `expandQuery` :: (rawQuery: string): ExpandedQuery (L126-L178)

### `packages/nlp/src/language-detector.ts`
- [function] `detectLanguage` :: (text: string): DetectedLanguage (L26-L69)

### `packages/resolver/src/evidence-rules.ts`
- [interface] `EvidenceEvaluation` :: interface EvidenceEvaluation (L5-L10)
- [class] `EvidenceRules` :: class EvidenceRules (L12-L61)
- [method] `exactImport` :: (sourcePath: string): EvidenceEvaluation (L16-L23)
- [method] `sameScope` :: (filePath: string): EvidenceEvaluation (L28-L35)
- [method] `uniqueCandidate` :: (candidateId: string): EvidenceEvaluation (L40-L47)
- [method] `ambiguousCandidates` :: (candidateCount: number): EvidenceEvaluation (L52-L60)

### `packages/resolver/src/symbol-resolver.ts`
- [interface] `ResolutionSummary` :: interface ResolutionSummary (L8-L13)
- [class] `SymbolResolver` :: class SymbolResolver (L15-L137)
- [method] `constructor` :: (storage: Storage) (L18-L20)
- [method] `resolveAll` :: (): Promise<ResolutionSummary> (L22-L136)

### `packages/rank/src/personalized-pagerank.ts`
- [interface] `PprNodeScore` :: interface PprNodeScore (L3-L6)
- [interface] `PprOptions` :: interface PprOptions (L8-L12)
- [class] `PersonalizedPageRank` :: class PersonalizedPageRank (L14-L153)
- [method] `constructor` :: (options?: PprOptions) (L19-L23)
- [method] `compute` :: (
    allNodeIds: readonly string[],
    edges: readonly EdgeRecord[],
    seeds: ReadonlyMap<string, number>, // nodeId -> lexical seed weight
  ): readonly PprNodeScore[] (L25-L152)

### `packages/rank/src/reciprocal-rank-fusion.ts`
- [interface] `RankedItem` :: interface RankedItem (L1-L4)
- [interface] `FusionResult` :: interface FusionResult (L6-L10)
- [class] `ReciprocalRankFusion` :: class ReciprocalRankFusion (L12-L68)
- [method] `constructor` :: (k = 60) (L15-L17)
- [method] `fuse` :: (
    rankedSystems: ReadonlyMap<string, readonly T[]>,
    idSelector: (item: T) => string,
    weights?: ReadonlyMap<string, number>,
  ): readonly FusionResult<T>[] (L25-L67)

### `packages/rank/src/retrieval-pipeline.ts`
- [interface] `RetrievedSymbol` :: interface RetrievedSymbol (L12-L20)
- [interface] `RetrievalResult` :: interface RetrievalResult (L22-L28)
- [class] `RetrievalPipeline` :: class RetrievalPipeline (L30-L222)
- [method] `constructor` :: (storage: Storage, glossaryExpander?: GlossaryExpander) (L36-L41)
- [method] `search` :: (
    queryText: string,
    limit = 10,
    enableRoast = false,
  ): Promise<RetrievalResult> (L43-L203)
- [method] `generateEmotionalDamageRoast` :: (
    node: NodeRecord,
    inboundCount: number,
    outboundCount: number,
    risk: RetrievedSymbol["riskLevel"],
  ): string (L205-L221)

### `packages/rank/src/trigram-matcher.ts`
- [interface] `FuzzyMatchResult` :: interface FuzzyMatchResult (L3-L6)
- [class] `TrigramMatcher` :: class TrigramMatcher (L8-L70)
- [method] `generateTrigrams` :: (text: string): readonly string[] (L9-L16)
- [method] `similarity` :: (a: string, b: string): number (L18-L44)
- [method] `matchCandidates` :: (
    queryWord: string,
    nodes: readonly NodeRecord[],
    threshold = 0.45,
  ): readonly FuzzyMatchResult[] (L46-L69)

### `packages/store/src/migrations.ts`
- [function] `applyMigrations` :: (db: {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...args: unknown[]): unknown;
    run(...args: unknown[]): unknown;
  };
}): void (L103-L123)

### `packages/nlp/src/stemmer/indonesian-stemmer.ts`
- [class] `IndonesianStemmer` :: class IndonesianStemmer (L7-L232)
- [method] `constructor` :: (customDictionary?: ReadonlySet<string>) (L10-L12)
- [method] `stem` :: (word: string): string (L14-L69)
- [method] `removeParticle` :: (word: string): string (L71-L79)
- [method] `removePossessive` :: (word: string): string (L81-L89)
- [method] `removeSuffix` :: (word: string): string (L91-L102)
- [method] `removePrefix` :: (word: string): string (L104-L231)

### `packages/parser/src/extractors/php-extractor.ts`
- [class] `PhpExtractor` :: class PhpExtractor (L14-L304)
- [method] `constructor` :: (filePath: string) (L21-L24)
- [method] `extract` :: (tree: Parser.Tree, sourceContent: string): ExtractorResult (L26-L55)
- [method] `visitNode` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingScopeName: string | null,
  ): void (L57-L130)
- [method] `extractClass` :: (node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null (L132-L155)
- [method] `extractInterface` :: (node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null (L157-L180)
- [method] `extractMethod` :: (node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null (L182-L207)
- [method] `extractFunction` :: (node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null (L209-L234)
- [method] `extractUseDeclaration` :: (node: Parser.SyntaxNode): void (L236-L249)
- [method] `extractCallExpression` :: (node: Parser.SyntaxNode, callerNodeId: string): void (L251-L276)
- [method] `createContainsEdge` :: (srcId: string, dstId: string): void (L278-L292)
- [method] `findLeadingDocComment` :: (node: Parser.SyntaxNode): string | null (L294-L303)

### `packages/parser/src/extractors/ts-extractor.ts`
- [interface] `ExtractorResult` :: interface ExtractorResult (L14-L18)
- [class] `TypeScriptExtractor` :: class TypeScriptExtractor (L20-L420)
- [method] `constructor` :: (filePath: string) (L27-L30)
- [method] `extract` :: (tree: Parser.Tree, sourceContent: string): ExtractorResult (L32-L61)
- [method] `visitNode` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingScopeName: string | null,
  ): void (L63-L144)
- [method] `extractFunction` :: (
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): NodeRecord | null (L146-L173)
- [method] `extractClass` :: (
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): NodeRecord | null (L175-L201)
- [method] `extractInterface` :: (
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): NodeRecord | null (L203-L229)
- [method] `extractMethod` :: (
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): NodeRecord | null (L231-L258)
- [method] `extractArrowFunctions` :: (
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): readonly NodeRecord[] (L260-L300)
- [method] `extractImports` :: (node: Parser.SyntaxNode): void (L302-L344)
- [method] `extractCallExpression` :: (
    node: Parser.SyntaxNode,
    callerNodeId: string,
  ): void (L346-L375)
- [method] `createContainsEdge` :: (srcId: string, dstId: string): void (L377-L391)
- [method] `getFunctionSignature` :: (node: Parser.SyntaxNode): string | null (L393-L405)
- [method] `findLeadingDocComment` :: (node: Parser.SyntaxNode): string | null (L407-L419)

### `packages/parser/src/utils/tokenizer.ts`
- [function] `splitIdentifierTokens` :: (identifier: string): readonly string[] (L6-L26)

### `packages/core/src/calibration.ts`
- [interface] `CalibrationSample` :: interface CalibrationSample (L9-L12)
- [interface] `CalibrationBin` :: interface CalibrationBin (L14-L22)
- [interface] `CalibrationReport` :: interface CalibrationReport (L24-L31)
- [function] `calculateExpectedCalibrationError` :: (
  samples: readonly CalibrationSample[],
  numBins = 10,
): CalibrationReport (L37-L123)

### `packages/docgen/src/handover-generator.ts`
- [interface] `HandoverOptions` :: interface HandoverOptions (L10-L15)
- [interface] `HandoverDocument` :: interface HandoverDocument (L17-L24)
- [class] `HandoverGenerator` :: class HandoverGenerator (L26-L261)
- [method] `constructor` :: (options?: HandoverOptions) (L31-L35)
- [method] `generate` :: (storage: Storage): Promise<HandoverDocument> (L37-L260)
- [function] `formatCitation` :: (node: NodeRecord): string (L104-L109)

### `packages/indexer/src/file-watcher.ts`
- [interface] `FileWatcherOptions` :: interface FileWatcherOptions (L6-L10)
- [interface] `FileChangeEvent` :: interface FileChangeEvent (L12-L15)
- [class] `FileWatcher` :: class FileWatcher (L17-L128)
- [method] `constructor` :: (indexer: Indexer, options: FileWatcherOptions) (L27-L45)
- [method] `start` :: (): void (L47-L71)
- [method] `stop` :: (): void (L73-L82)
- [method] `isIgnored` :: (relPath: string): boolean (L84-L96)
- [method] `triggerIndex` :: (): Promise<IndexSummary | null> (L98-L117)
- [method] `scheduleReindex` :: (): void (L119-L127)

### `packages/mcp/src/budgeter.ts`
- [interface] `SourceCitation` :: interface SourceCitation (L6-L11)
- [interface] `BudgetedPacket` :: interface BudgetedPacket (L13-L20)
- [interface] `FormattableItem` :: interface FormattableItem (L22-L25)
- [class] `ContextBudgeter` :: class ContextBudgeter (L27-L83)
- [method] `estimateTokens` :: (text: string): number (L31-L33)
- [method] `assemble` :: (
    header: string,
    items: readonly FormattableItem[],
    maxTokens = 4000,
  ): BudgetedPacket (L41-L82)

### `packages/mcp/src/server.ts`
- [interface] `RuasMcpServerOptions` :: interface RuasMcpServerOptions (L10-L13)
- [function] `createRuasMcpServer` :: (
  storage: Storage,
  options?: RuasMcpServerOptions,
): McpServer (L15-L31)
- [function] `runStdioServer` :: (
  storage: Storage,
  options?: RuasMcpServerOptions,
): Promise<void> (L33-L55)
- [function] `shutdown` :: () (L43-L51)

### `packages/rank/src/architecture.ts`
- [class] `ArchitectureAnalyzer` :: class ArchitectureAnalyzer (L11-L433)
- [method] `detectCycles` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): readonly CycleInfo[] (L16-L98)
- [function] `strongConnect` :: (v: string) (L42-L73)
- [method] `detectOrphans` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): readonly OrphanInfo[] (L104-L152)
- [method] `calculateHealth` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): ArchitectureHealthReport (L158-L283)
- [method] `findPath` :: (
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): PathResult (L289-L432)

### `packages/rank/src/community-detection.ts`
- [interface] `CommunityPartition` :: interface CommunityPartition (L3-L7)
- [interface] `LeidenResult` :: interface LeidenResult (L9-L13)
- [interface] `LeidenOptions` :: interface LeidenOptions (L15-L19)
- [class] `LeidenCommunityDetector` :: class LeidenCommunityDetector (L26-L290)
- [method] `constructor` :: (options?: LeidenOptions) (L31-L35)
- [method] `pseudoRandom` :: (): number (L37-L40)
- [method] `detect` :: (
    nodeIds: readonly string[],
    edges: readonly EdgeRecord[],
  ): LeidenResult (L42-L217)
- [method] `adjustedRandIndex` :: (
    partitionA: ReadonlyMap<string, number>,
    partitionB: ReadonlyMap<string, number>,
  ): number (L224-L289)

### `packages/rank/src/subsystem-labeler.ts`
- [class] `SubsystemLabeler` :: class SubsystemLabeler (L75-L161)
- [method] `labelCommunities` :: (
    communities: readonly CommunityPartition[],
    nodes: readonly NodeRecord[],
    topTermsPerLabel = 3,
  ): readonly CommunityPartition[] (L80-L160)

### `packages/ui/src/export.ts`
- [interface] `ExportDiagramOptions` :: interface ExportDiagramOptions (L7-L11)
- [function] `generateMermaidGraph` :: (
  storage: Storage,
  options?: ExportDiagramOptions,
): Promise<string> (L16-L83)
- [function] `sanitize` :: (id: string) (L49-L49)
- [function] `generateDotGraph` :: (
  storage: Storage,
  options?: ExportDiagramOptions,
): Promise<string> (L88-L146)
- [function] `sanitize` :: (id: string) (L106-L106)
- [function] `exportJsonGraph` :: (
  storage: Storage,
  outPath: string,
): Promise<void> (L151-L167)
- [function] `exportMermaidFile` :: (
  storage: Storage,
  outPath: string,
  options?: ExportDiagramOptions,
): Promise<void> (L172-L180)
- [function] `exportDotFile` :: (
  storage: Storage,
  outPath: string,
  options?: ExportDiagramOptions,
): Promise<void> (L185-L193)

### `packages/ui/src/server.ts`
- [interface] `ServerOptions` :: interface ServerOptions (L13-L18)
- [interface] `RunningServer` :: interface RunningServer (L20-L24)
- [function] `buildGraphPayload` :: (
  storage: Storage,
  projectName = "Ruas Project",
): Promise<GraphPayload> (L26-L135)
- [function] `exportStandaloneHtml` :: (
  storage: Storage,
  outPath: string,
  projectName = "Ruas Project",
): Promise<void> (L137-L146)
- [function] `startGraphServer` :: (options: ServerOptions): Promise<RunningServer> (L148-L189)

### `packages/ui/src/template.ts`
- [interface] `GraphPayload` :: interface GraphPayload (L1-L36)
- [function] `renderGraphHtml` :: (payload: GraphPayload): string (L38-L1032)

### `fixtures/asean-store/src/customer/member.ts`
- [function] `calculateMemberDiscount` :: (customerId: string, subtotal: number): number (L5-L13)
- [function] `getLoyaltyPoints` :: (subtotal: number): number (L15-L17)

### `fixtures/asean-store/src/order/checkout.ts`
- [interface] `CheckoutRequest` :: interface CheckoutRequest (L9-L13)
- [function] `handleCheckoutOrder` :: (req: CheckoutRequest): Promise<{ orderId: string; resi: string; total: number }> (L15-L29)

### `fixtures/asean-store/src/payment/qris.ts`
- [interface] `QrisTransaction` :: interface QrisTransaction (L5-L10)
- [function] `generateQrPayload` :: (merchantId: string, amount: number): string (L12-L14)
- [function] `processQrisSettlement` :: (trxId: string, amount: number): Promise<boolean> (L16-L22)
- [function] `verifySignature` :: (trxId: string, amount: number): boolean (L24-L26)

### `fixtures/asean-store/src/shipping/kurir.ts`
- [function] `generateNomorResi` :: (ekspedisi: "JNE" | "SICEPAT", customerId: string): string (L5-L9)
- [function] `hitungOngkir` :: (beratGram: number, kotaTujuan: string): number (L11-L15)

### `packages/mcp/src/tools/analyze-architecture.ts`
- [function] `registerAnalyzeArchitectureTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void (L21-L94)

### `packages/mcp/src/tools/ask-code.ts`
- [function] `registerAskCodeTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  pipeline?: RetrievalPipeline,
): void (L33-L119)

### `packages/mcp/src/tools/find-path.ts`
- [function] `registerFindPathTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void (L17-L108)

### `packages/mcp/src/tools/project-overview.ts`
- [function] `registerProjectOverviewTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void (L3-L93)

### `packages/mcp/src/tools/trace-impact.ts`
- [interface] `TraversedPath` :: interface TraversedPath (L31-L36)
- [function] `registerTraceImpactTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void (L38-L206)

### `packages/parser/src/extractors/python-extractor.ts`
- [class] `PythonExtractor` :: class PythonExtractor (L14-L367)
- [method] `constructor` :: (filePath: string) (L21-L24)
- [method] `extract` :: (tree: Parser.Tree, sourceContent: string): ExtractorResult (L26-L55)
- [method] `visitNode` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingClassName: string | null,
    decorators: string[] | null,
  ): void (L57-L128)
- [method] `extractFunction` :: (
    node: Parser.SyntaxNode,
    enclosingClassName: string | null,
    decorators: string[] | null,
  ): NodeRecord | null (L130-L180)
- [method] `extractClass` :: (
    node: Parser.SyntaxNode,
    enclosingClassName: string | null,
  ): NodeRecord | null (L182-L222)
- [method] `extractSuperclasses` :: (superclassesNode: Parser.SyntaxNode, className: string): void (L224-L242)
- [method] `extractImport` :: (node: Parser.SyntaxNode, currentParentId: string): void (L244-L293)
- [method] `extractCall` :: (node: Parser.SyntaxNode, currentParentId: string): void (L295-L324)
- [method] `extractDocstring` :: (bodyNode: Parser.SyntaxNode | null): string | null (L326-L353)
- [method] `createContainsEdge` :: (parentId: string, childId: string): void (L355-L366)

### `packages/core/src/types.ts`
- [interface] `FileRecord` :: interface FileRecord (L35-L43)
- [interface] `NodeRecord` :: interface NodeRecord (L45-L56)
- [interface] `EdgeRecord` :: interface EdgeRecord (L58-L66)
- [interface] `UnresolvedRefRecord` :: interface UnresolvedRefRecord (L68-L75)
- [interface] `GlossaryTerm` :: interface GlossaryTerm (L77-L82)
- [interface] `CredibleInterval` :: interface CredibleInterval (L84-L88)
- [function] `computeBetaCredibleInterval` :: (alpha: number, beta: number): CredibleInterval (L94-L112)
- [interface] `ProjectConfig` :: interface ProjectConfig (L114-L121)
- [interface] `CycleInfo` :: interface CycleInfo (L123-L129)
- [interface] `OrphanInfo` :: interface OrphanInfo (L131-L134)
- [interface] `SubsystemCoupling` :: interface SubsystemCoupling (L136-L142)
- [interface] `ArchitectureHealthReport` :: interface ArchitectureHealthReport (L144-L157)
- [interface] `PathResult` :: interface PathResult (L159-L170)

### `packages/cli/src/index.ts`
- [function] `stop` :: () (L301-L306)
- [function] `shutdown` :: () (L409-L414)

### `packages/indexer/src/file-walker.ts`
- [interface] `WalkedFile` :: interface WalkedFile (L7-L13)
- [interface] `FileWalkerOptions` :: interface FileWalkerOptions (L15-L19)
- [class] `FileWalker` :: class FileWalker (L21-L166)
- [method] `constructor` :: (options: FileWalkerOptions) (L26-L73)
- [method] `walk` :: (): Promise<readonly WalkedFile[]> (L75-L143)
- [method] `detectLanguage` :: (filePath: string): SupportedLanguage | null (L145-L165)

### `packages/parser/src/grammar-loader.ts`
- [class] `GrammarLoader` :: class GrammarLoader (L6-L67)
- [method] `init` :: (): Promise<void> (L11-L16)
- [method] `getWasmDir` :: (): string (L18-L26)
- [method] `getLanguage` :: (lang: SupportedLanguage): Promise<Parser.Language> (L28-L66)

### `packages/parser/src/parser-facade.ts`
- [class] `CodeParser` :: class CodeParser (L11-L58)
- [method] `init` :: (): Promise<void> (L14-L19)
- [method] `parseFile` :: (
    filePath: string,
    content: string,
    lang: SupportedLanguage,
  ): Promise<ExtractorResult> (L21-L57)

### `packages/store/src/sqlite-storage.ts`
- [interface] `SqliteStorageOptions` :: interface SqliteStorageOptions (L14-L16)
- [class] `SqliteStorage` :: class SqliteStorage (L18-L455)
- [method] `constructor` :: (options: SqliteStorageOptions) (L22-L24)
- [method] `init` :: (): Promise<void> (L26-L44)
- [method] `close` :: (): Promise<void> (L46-L51)
- [method] `getDatabase` :: (): DatabaseSync (L53-L58)
- [method] `upsertFile` :: (file: FileRecord): Promise<void> (L62-L84)
- [method] `getFile` :: (path: string): Promise<FileRecord | null> (L86-L107)
- [method] `getAllFiles` :: (): Promise<readonly FileRecord[]> (L109-L126)
- [method] `deleteFile` :: (path: string): Promise<void> (L128-L138)
- [method] `upsertNodes` :: (nodes: readonly NodeRecord[]): Promise<void> (L142-L190)
- [method] `deleteNodesByFileId` :: (fileId: string): Promise<void> (L192-L196)
- [method] `getNodesByFileId` :: (fileId: string): Promise<readonly NodeRecord[]> (L198-L207)
- [method] `getNodeById` :: (id: string): Promise<NodeRecord | null> (L209-L218)
- [method] `findNodesByName` :: (name: string): Promise<readonly NodeRecord[]> (L220-L229)
- [method] `getAllNodes` :: (): Promise<readonly NodeRecord[]> (L231-L240)
- [method] `upsertEdges` :: (edges: readonly EdgeRecord[]): Promise<void> (L244-L272)
- [method] `deleteEdgesByFileId` :: (fileId: string): Promise<void> (L274-L281)
- [method] `getOutboundEdges` :: (srcId: string): Promise<readonly EdgeRecord[]> (L283-L292)
- [method] `getInboundEdges` :: (dstId: string): Promise<readonly EdgeRecord[]> (L294-L303)
- [method] `getAllEdges` :: (): Promise<readonly EdgeRecord[]> (L305-L314)
- [method] `upsertUnresolvedRefs` :: (refs: readonly UnresolvedRefRecord[]): Promise<void> (L318-L337)
- [method] `deleteUnresolvedRefsByFileId` :: (fileId: string): Promise<void> (L339-L342)
- [method] `deleteUnresolvedRef` :: (id: string): Promise<void> (L344-L347)
- [method] `getUnresolvedRefsByName` :: (name: string): Promise<readonly UnresolvedRefRecord[]> (L349-L365)
- [method] `getAllUnresolvedRefs` :: (): Promise<readonly UnresolvedRefRecord[]> (L367-L381)
- [method] `searchFts` :: (query: string, limit = 20): Promise<readonly FtsSearchResult[]> (L385-L410)
- [method] `getStats` :: (): Promise<StorageStats> (L414-L427)
- [method] `mapNodeRecord` :: (row: Record<string, unknown>): NodeRecord (L429-L442)
- [method] `mapEdgeRecord` :: (row: Record<string, unknown>): EdgeRecord (L444-L454)

### `packages/store/src/types.ts`
- [interface] `FtsSearchResult` :: interface FtsSearchResult (L8-L11)
- [interface] `StorageStats` :: interface StorageStats (L13-L18)
- [interface] `Storage` :: interface Storage (L20-L57)
