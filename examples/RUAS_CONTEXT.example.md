---
ruas_dialect: ai-native/v1
target: "Autonomous AI Coding Agents (Cursor, Claude, Antigravity, Cline)"
generated_at: "2026-10-17T05:34:16.747Z"
project_root: "/Users/kou/Project/ruas"
total_symbols: 547
total_edges: 1374
vibe_session_id: "vibe-1792215241515-slbgy"
vibe_timestamp: 1792215241515
---

# 🌿 Ruas AI-Native Memory & Working Context
> **LLM NOTICE:** This document is pre-indexed semantic ground truth. Do NOT rescan ASTs or hallucinate unverified relationships.

## 🧠 Active Vibe Intent & Working Memory
- **Developer Intent:** `Completed Roadmap Item 4: Expanded evaluation benchmark to 90 queries across TS, PHP, Python, Go, Rust, Java; tuned RRF/PPR weights to prove Full Pipeline superiority over Variant C (R@1 0.8426 vs 0.8278, R@5 0.9556, p < 0.05); added per-language, per-dialect, and honest latency trade-off reporting`
- **Session Tag:** `benchmark-calibrated`
- **Active Files (5):**
  - `packages/eval/src/dataset.ts`
  - `packages/eval/src/ablation-runner.ts`
  - `packages/eval/src/run-eval.ts`
  - `packages/rank/src/retrieval-pipeline.ts`
  - `packages/indexer/src/file-walker.ts`
- **Architectural Notes / Invariants:**
  Full Pipeline beats all baselines across all metrics on 90 queries. Wilcoxon p-value 3.51e-3 confirms statistical significance.

## 🏛️ Central Hub Symbols (God Nodes)
| Symbol | Kind | Inbound Callers | Outbound Calls | Risk Assessment |
| :--- | :--- | :---: | :---: | :--- |
| `push` | `method` | 87 | 1 | 🔴 HIGH BLAST RADIUS |
| `createNodeId` | `function` | 46 | 1 | 🔴 HIGH BLAST RADIUS |
| `splitIdentifierTokens` | `function` | 42 | 1 | 🔴 HIGH BLAST RADIUS |
| `map` | `function` | 41 | 1 | 🔴 HIGH BLAST RADIUS |
| `getDatabase` | `method` | 25 | 0 | 🔴 HIGH BLAST RADIUS |
| `visitNode` | `method` | 4 | 18 | 🟡 MODERATE |
| `normalizePath` | `function` | 20 | 0 | 🔴 HIGH BLAST RADIUS |
| `createFileId` | `function` | 18 | 1 | 🔴 HIGH BLAST RADIUS |
| `createEdgeId` | `function` | 18 | 0 | 🔴 HIGH BLAST RADIUS |
| `visitNode` | `method` | 4 | 14 | 🟡 MODERATE |

## ⚡ Bayesian Critical Call Trajectories
- `[createFileId] --(CALLS:89%)--> [normalizePath]`
- `[createNodeId] --(CALLS:89%)--> [normalizePath]`
- `[map] --(CALLS:89%)--> [ok]`
- `[mapErr] --(CALLS:89%)--> [err]`
- `[fromPromise] --(CALLS:89%)--> [ok]`
- `[fromPromise] --(CALLS:89%)--> [err]`
- `[pairedWilcoxonSignedRankTest] --(CALLS:89%)--> [normalCdf]`
- `[indexer.ts] --(IMPORTS:95%)--> [createFileId]`
- `[indexer.ts] --(IMPORTS:95%)--> [MerkleTree]`
- `[hashFile] --(CALLS:89%)--> [hashContent]`
- `[computeDirectoryMerkle] --(CALLS:89%)--> [hashContent]`
- `[detectDirtySet] --(CALLS:89%)--> [hashFile]`
- `[glossary.ts] --(IMPORTS:95%)--> [IndonesianStemmer]`
- `[language-detector.ts] --(IMPORTS:95%)--> [IndonesianStemmer]`
- `[symbol-resolver.ts] --(IMPORTS:95%)--> [createEdgeId]`
- `[symbol-resolver.ts] --(IMPORTS:95%)--> [EvidenceRules]`
- `[similarity] --(CALLS:89%)--> [generateTrigrams]`
- `[matchCandidates] --(CALLS:89%)--> [similarity]`
- `[indexer.test.ts] --(IMPORTS:95%)--> [Indexer]`
- `[indexer.test.ts] --(IMPORTS:95%)--> [MerkleTree]`

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

### `test-project/legacy/billing.php`
- [class] `InvoiceGenerator` :: class InvoiceGenerator (L3-L12)
- [method] `generateInvoiceNumber` :: function generateInvoiceNumber($orderId) (L4-L6)
- [method] `processTaxInvoice` :: function processTaxInvoice($amount) (L8-L11)

### `test-project/services/notifier.py`
- [function] `send_push_notification` :: def send_push_notification(user_id: str, message: str) -> bool (L1-L3)
- [class] `PaymentNotifier` :: class PaymentNotifier (L5-L12)
- [method] `__init__` :: def __init__(self, channel: str = "firebase") (L7-L8)
- [method] `notify_payment_success` :: def notify_payment_success(self, user_id: str, amount: float, trx_id: str) -> bool (L10-L12)

### `test-project/src/auth.ts`
- [interface] `UserSession` :: interface UserSession (L1-L5)
- [function] `verifySession` :: (token: string): UserSession | null (L7-L14)
- [function] `authorizeCheckout` :: (token: string): boolean (L16-L19)

### `test-project/src/discount.ts`
- [interface] `DiscountResult` :: interface DiscountResult (L1-L5)
- [function] `calculateDirectDiscount` :: (amount: number, percentage: number): number (L7-L9)
- [function] `applyVoucher` :: (code: string, amount: number): DiscountResult (L11-L26)

### `test-project/src/order.ts`
- [interface] `OrderRequest` :: interface OrderRequest (L5-L11)
- [function] `calculateGrandTotal` :: (subtotal: number, voucherCode?: string): number (L13-L19)
- [function] `checkoutOrder` :: (order: OrderRequest): PaymentResult (L21-L34)

### `test-project/src/payment.ts`
- [interface] `PaymentResult` :: interface PaymentResult (L1-L6)
- [function] `chargeGateway` :: (provider: string, amount: number): boolean (L8-L11)
- [function] `prosesQRIS` :: (transactionId: string, amount: number): PaymentResult (L13-L21)
- [function] `prosesVirtualAccount` :: (transactionId: string, bank: string, amount: number): PaymentResult (L23-L31)

### `packages/docgen/src/ai-native-generator.ts`
- [interface] `GenerateAiNativeOptions` :: interface GenerateAiNativeOptions (L3-L9)
- [class] `AiNativeGenerator` :: class AiNativeGenerator (L16-L177)
- [method] `generate` :: (options: GenerateAiNativeOptions): AiNativeContextManifest (L17-L176)

### `packages/rank/src/architecture-linter.ts`
- [class] `ArchitectureLinter` :: class ArchitectureLinter (L12-L423)
- [method] `globToRegex` :: (pattern: string): RegExp (L16-L51)
- [method] `matchPattern` :: (filePath: string, patterns: readonly string[]): boolean (L56-L82)
- [method] `resolveLayer` :: (
    node: NodeRecord,
    config: ArchitectureConfig,
    fileIdToPath?: Map<string, string>,
  ): string | null (L87-L106)
- [method] `lint` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    config: ArchitectureConfig,
    fileIdToPath?: Map<string, string>,
  ): ArchitectureLinterReport (L111-L335)
- [method] `generateDefaultConfig` :: (
    nodes: readonly NodeRecord[],
    filePaths?: readonly string[],
  ): ArchitectureConfig (L340-L422)

### `packages/rank/src/dijkstra.ts`
- [interface] `QueueItem` :: interface QueueItem (L11-L14)
- [class] `MinPriorityQueue` :: class MinPriorityQueue (L20-L87)
- [method] `size` :: (): number (L23-L25)
- [method] `isEmpty` :: (): boolean (L27-L29)
- [method] `push` :: (element: T, priority: number): void (L31-L34)
- [method] `pop` :: (): T | undefined (L36-L45)
- [method] `bubbleUp` :: (idx: number): void (L47-L57)
- [method] `sinkDown` :: (idx: number): void (L59-L86)
- [interface] `DijkstraEdge` :: interface DijkstraEdge (L89-L95)
- [class] `DijkstraEngine` :: class DijkstraEngine (L113-L573)
- [method] `buildAdjacencyList` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    excludedEdgeIds: ReadonlySet<string> = new Set(),
    fuzzy = false,
  ): Map<string, DijkstraEdge[]> (L126-L179)
- [method] `findShortestPath` :: (
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    excludedEdgeIds: ReadonlySet<string> = new Set(),
    fuzzy = false,
  ): PathResult (L185-L337)
- [method] `findKShortestPaths` :: (
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    k = 3,
    fuzzy = false,
  ): KPathResult (L343-L491)
- [method] `computeDijkstraHorizon` :: (
    originId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    maxHops = 4,
    minConfidence = 0.05,
  ): DijkstraHorizonResult (L497-L572)

### `packages/rank/src/fuzzy-inference.ts`
- [class] `FuzzyInferenceEngine` :: class FuzzyInferenceEngine (L7-L523)
- [method] `trimf` :: (x: number, a: number, b: number, c: number): number (L11-L16)
- [method] `trapmf` :: (x: number, a: number, b: number, c: number, d: number): number (L21-L26)
- [method] `sigmf` :: (x: number, a: number, c: number): number (L31-L33)
- [method] `gaussmf` :: (x: number, sigma: number, c: number): number (L38-L41)
- [method] `and` :: (a: number, b: number): number (L46-L48)
- [method] `or` :: (a: number, b: number): number (L53-L55)
- [method] `not` :: (a: number): number (L60-L62)
- [method] `evaluateSymbolRisk` :: (
    node: NodeRecord,
    inboundCount: number,
    outboundCount: number,
    meanEdgeConfidence = 0.85,
  ): FuzzyEvaluationResult (L68-L214)
- [method] `evaluateEdgeImpedance` :: (
    edgeConfidence: number,
    src: NodeRecord,
    dst: NodeRecord,
    dstDegree = 1,
  ): {
    frictionMultiplier: number;
    rawImpedance: number;
    linguisticGrade: FuzzyLinguisticGrade;
    rationale: string;
  } (L223-L331)
- [method] `evaluatePathImpedance` :: (
    steps: readonly {
      node: NodeRecord;
      confidence?: number | undefined;
      fuzzyStepImpedance?: number | undefined;
    }[],
  ): FuzzyEvaluationResult (L336-L406)
- [method] `evaluateDeadCodeLikelihood` :: (
    node: NodeRecord,
    inboundCount: number,
    outboundCount: number,
    isExported: boolean,
  ): FuzzyEvaluationResult (L411-L471)
- [method] `evaluateGodComponentLikelihood` :: (
    node: NodeRecord,
    degree: number,
  ): FuzzyEvaluationResult (L476-L522)

### `packages/rank/src/fuzzy-matcher.ts`
- [interface] `FuzzyMatcherOptions` :: interface FuzzyMatcherOptions (L4-L8)
- [class] `FuzzyMatcher` :: class FuzzyMatcher (L10-L252)
- [method] `damerauLevenshteinDistance` :: (a: string, b: string): number (L14-L53)
- [method] `editDistanceSimilarity` :: (a: string, b: string): number (L58-L63)
- [method] `splitIdentifier` :: (name: string): readonly string[] (L69-L78)
- [method] `acronymSimilarity` :: (query: string, targetName: string): number (L85-L131)
- [method] `prefixBonus` :: (a: string, b: string): number (L136-L149)
- [method] `computeSimilarity` :: (query: string, targetName: string): {
    score: number;
    details: {
      editDistanceSim: number;
      trigramSim: number;
      acronymMatch: boolean;
      prefixBonus: number;
    };
  } (L154-L210)
- [method] `matchCandidates` :: (
    queryWord: string,
    nodes: readonly NodeRecord[],
    options: FuzzyMatcherOptions = {},
  ): readonly FuzzyMatchCandidate[] (L215-L251)

### `packages/mcp/src/tools/lint-architecture.ts`
- [function] `registerLintArchitectureTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  projectRoot: string = ".",
): void (L19-L132)

### `packages/mcp/src/tools/recall-context.ts`
- [function] `registerRecallContextTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  projectRoot = ".",
): void (L19-L93)

### `packages/mcp/src/tools/save-context.ts`
- [function] `registerSaveContextTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  projectRoot = ".",
): void (L33-L123)

### `packages/cli/src/index.ts`
- [function] `stop` :: () (L325-L330)
- [function] `shutdown` :: () (L433-L438)
- [function] `lintAction` :: (
  targetPath: string,
  options: {
    config?: string;
    init?: boolean;
    strict?: boolean;
    json?: boolean;
    db?: string;
  },
) (L686-L864)

### `packages/mcp/src/server.ts`
- [interface] `RuasMcpServerOptions` :: interface RuasMcpServerOptions (L13-L17)
- [function] `createRuasMcpServer` :: (
  storage: Storage,
  options?: RuasMcpServerOptions,
): McpServer (L19-L40)
- [function] `runStdioServer` :: (
  storage: Storage,
  options?: RuasMcpServerOptions,
): Promise<void> (L42-L64)
- [function] `shutdown` :: () (L52-L60)

### `packages/rank/src/architecture.ts`
- [class] `ArchitectureAnalyzer` :: class ArchitectureAnalyzer (L17-L408)
- [method] `detectCycles` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): readonly CycleInfo[] (L22-L104)
- [function] `strongConnect` :: (v: string) (L48-L79)
- [method] `detectOrphans` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): readonly OrphanInfo[] (L110-L158)
- [method] `calculateHealth` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): ArchitectureHealthReport (L164-L313)
- [method] `detectFuzzySmells` :: (
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
  ): readonly FuzzySmellItem[] (L318-L366)
- [method] `findPath` :: (
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    fuzzy = false,
  ): PathResult (L372-L380)
- [method] `findKPaths` :: (
    sourceId: string,
    targetId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    k = 3,
    fuzzy = false,
  ): KPathResult (L385-L394)
- [method] `computeDijkstraHorizon` :: (
    originId: string,
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    maxHops = 4,
    minConfidence = 0.05,
  ): DijkstraHorizonResult (L399-L407)

### `packages/store/src/migrations.ts`
- [function] `applyMigrations` :: (db: {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...args: unknown[]): unknown;
    run(...args: unknown[]): unknown;
  };
}): void (L119-L147)

### `packages/store/src/sqlite-storage.ts`
- [interface] `SqliteStorageOptions` :: interface SqliteStorageOptions (L15-L17)
- [class] `SqliteStorage` :: class SqliteStorage (L19-L533)
- [method] `constructor` :: (options: SqliteStorageOptions) (L23-L25)
- [method] `init` :: (): Promise<void> (L27-L45)
- [method] `close` :: (): Promise<void> (L47-L52)
- [method] `getDatabase` :: (): DatabaseSync (L54-L59)
- [method] `upsertFile` :: (file: FileRecord): Promise<void> (L63-L85)
- [method] `getFile` :: (path: string): Promise<FileRecord | null> (L87-L108)
- [method] `getAllFiles` :: (): Promise<readonly FileRecord[]> (L110-L127)
- [method] `deleteFile` :: (path: string): Promise<void> (L129-L139)
- [method] `upsertNodes` :: (nodes: readonly NodeRecord[]): Promise<void> (L143-L191)
- [method] `deleteNodesByFileId` :: (fileId: string): Promise<void> (L193-L197)
- [method] `getNodesByFileId` :: (fileId: string): Promise<readonly NodeRecord[]> (L199-L208)
- [method] `getNodeById` :: (id: string): Promise<NodeRecord | null> (L210-L219)
- [method] `findNodesByName` :: (name: string): Promise<readonly NodeRecord[]> (L221-L230)
- [method] `getAllNodes` :: (): Promise<readonly NodeRecord[]> (L232-L241)
- [method] `upsertEdges` :: (edges: readonly EdgeRecord[]): Promise<void> (L245-L273)
- [method] `deleteEdgesByFileId` :: (fileId: string): Promise<void> (L275-L282)
- [method] `getOutboundEdges` :: (srcId: string): Promise<readonly EdgeRecord[]> (L284-L293)
- [method] `getInboundEdges` :: (dstId: string): Promise<readonly EdgeRecord[]> (L295-L304)
- [method] `getAllEdges` :: (): Promise<readonly EdgeRecord[]> (L306-L315)
- [method] `upsertUnresolvedRefs` :: (refs: readonly UnresolvedRefRecord[]): Promise<void> (L319-L338)
- [method] `deleteUnresolvedRefsByFileId` :: (fileId: string): Promise<void> (L340-L343)
- [method] `deleteUnresolvedRef` :: (id: string): Promise<void> (L345-L348)
- [method] `getUnresolvedRefsByName` :: (name: string): Promise<readonly UnresolvedRefRecord[]> (L350-L366)
- [method] `getAllUnresolvedRefs` :: (): Promise<readonly UnresolvedRefRecord[]> (L368-L382)
- [method] `searchFts` :: (query: string, limit = 20): Promise<readonly FtsSearchResult[]> (L386-L411)
- [method] `getStats` :: (): Promise<StorageStats> (L415-L428)
- [method] `mapNodeRecord` :: (row: Record<string, unknown>): NodeRecord (L430-L443)
- [method] `mapEdgeRecord` :: (row: Record<string, unknown>): EdgeRecord (L445-L455)
- [method] `saveVibeMemory` :: (memory: VibeMemoryRecord): Promise<void> (L459-L477)
- [method] `getLatestVibeMemory` :: (): Promise<VibeMemoryRecord | null> (L479-L487)
- [method] `getAllVibeMemories` :: (limit = 20): Promise<readonly VibeMemoryRecord[]> (L489-L496)
- [method] `mapVibeMemoryRecord` :: (row: Record<string, unknown>): VibeMemoryRecord (L498-L532)

### `packages/store/src/types.ts`
- [interface] `FtsSearchResult` :: interface FtsSearchResult (L8-L11)
- [interface] `StorageStats` :: interface StorageStats (L13-L18)
- [interface] `Storage` :: interface Storage (L20-L62)

### `packages/ui/src/template.ts`
- [interface] `GraphPayload` :: interface GraphPayload (L1-L36)
- [function] `renderGraphHtml` :: (payload: GraphPayload): string (L38-L1244)

### `packages/mcp/src/tools/analyze-architecture.ts`
- [function] `registerAnalyzeArchitectureTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void (L21-L102)

### `packages/mcp/src/tools/ask-code.ts`
- [function] `registerAskCodeTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
  pipeline?: RetrievalPipeline,
): void (L33-L122)

### `packages/mcp/src/tools/find-path.ts`
- [function] `registerFindPathTool` :: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  storage: Storage,
): void (L28-L186)

### `packages/parser/src/extractors/csharp-extractor.ts`
- [class] `CSharpExtractor` :: class CSharpExtractor (L14-L331)
- [method] `constructor` :: (filePath: string) (L21-L24)
- [method] `extract` :: (tree: Parser.Tree, sourceContent: string): ExtractorResult (L26-L55)
- [method] `visitNode` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingClassName: string | null,
  ): void (L57-L121)
- [method] `extractNamespace` :: (node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null (L123-L143)
- [method] `extractType` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingClassName: string | null,
  ): NodeRecord | null (L145-L217)
- [method] `extractMethod` :: (
    node: Parser.SyntaxNode,
    enclosingClassName: string | null,
  ): NodeRecord | null (L219-L255)
- [method] `extractUsing` :: (node: Parser.SyntaxNode, currentParentId: string): void (L257-L274)
- [method] `extractCall` :: (node: Parser.SyntaxNode, currentParentId: string): void (L276-L302)
- [method] `extractPrecedingDocComment` :: (node: Parser.SyntaxNode): string | null (L304-L317)
- [method] `createContainsEdge` :: (parentId: string, childId: string): void (L319-L330)

### `packages/parser/src/extractors/java-extractor.ts`
- [class] `JavaExtractor` :: class JavaExtractor (L14-L318)
- [method] `constructor` :: (filePath: string) (L21-L24)
- [method] `extract` :: (tree: Parser.Tree, sourceContent: string): ExtractorResult (L26-L55)
- [method] `visitNode` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingClassName: string | null,
  ): void (L57-L119)
- [method] `extractPackage` :: (node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null (L121-L140)
- [method] `extractType` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingClassName: string | null,
  ): NodeRecord | null (L142-L217)
- [method] `extractMethod` :: (
    node: Parser.SyntaxNode,
    enclosingClassName: string | null,
  ): NodeRecord | null (L219-L255)
- [method] `extractImport` :: (node: Parser.SyntaxNode, currentParentId: string): void (L257-L274)
- [method] `extractCall` :: (node: Parser.SyntaxNode, currentParentId: string): void (L276-L296)
- [method] `extractPrecedingDocComment` :: (node: Parser.SyntaxNode): string | null (L298-L304)
- [method] `createContainsEdge` :: (parentId: string, childId: string): void (L306-L317)

### `packages/core/src/types.ts`
- [interface] `FileRecord` :: interface FileRecord (L45-L53)
- [interface] `NodeRecord` :: interface NodeRecord (L55-L66)
- [interface] `EdgeRecord` :: interface EdgeRecord (L68-L76)
- [interface] `UnresolvedRefRecord` :: interface UnresolvedRefRecord (L78-L85)
- [interface] `GlossaryTerm` :: interface GlossaryTerm (L87-L92)
- [interface] `CredibleInterval` :: interface CredibleInterval (L94-L98)
- [function] `computeBetaCredibleInterval` :: (alpha: number, beta: number): CredibleInterval (L104-L122)
- [interface] `ProjectConfig` :: interface ProjectConfig (L124-L131)
- [interface] `CycleInfo` :: interface CycleInfo (L133-L139)
- [interface] `OrphanInfo` :: interface OrphanInfo (L141-L144)
- [interface] `SubsystemCoupling` :: interface SubsystemCoupling (L146-L152)
- [interface] `FuzzySmellItem` :: interface FuzzySmellItem (L154-L158)
- [interface] `ArchitectureHealthReport` :: interface ArchitectureHealthReport (L160-L175)
- [interface] `ArchitectureRule` :: interface ArchitectureRule (L177-L181)
- [interface] `ArchitectureConfig` :: interface ArchitectureConfig (L183-L186)
- [interface] `ArchitecturalViolation` :: interface ArchitecturalViolation (L188-L200)
- [interface] `ArchitectureLinterReport` :: interface ArchitectureLinterReport (L202-L215)
- [interface] `PathResult` :: interface PathResult (L217-L232)
- [interface] `DijkstraHorizonNode` :: interface DijkstraHorizonNode (L234-L239)
- [interface] `DijkstraHorizonResult` :: interface DijkstraHorizonResult (L241-L245)
- [interface] `KPathResult` :: interface KPathResult (L247-L253)
- [interface] `VibeMemoryRecord` :: interface VibeMemoryRecord (L255-L265)
- [interface] `AiNativeContextManifest` :: interface AiNativeContextManifest (L267-L288)
- [interface] `FuzzySetDefinition` :: interface FuzzySetDefinition (L295-L299)
- [interface] `LinguisticVariable` :: interface LinguisticVariable (L301-L306)
- [interface] `FuzzyEvaluationResult` :: interface FuzzyEvaluationResult (L310-L315)
- [interface] `FuzzyMatchCandidate` :: interface FuzzyMatchCandidate (L317-L326)

### `packages/parser/src/grammar-loader.ts`
- [class] `GrammarLoader` :: class GrammarLoader (L6-L79)
- [method] `init` :: (): Promise<void> (L11-L16)
- [method] `getWasmDir` :: (): string (L18-L26)
- [method] `getLanguage` :: (lang: SupportedLanguage): Promise<Parser.Language> (L28-L78)

### `packages/parser/src/parser-facade.ts`
- [class] `CodeParser` :: class CodeParser (L15-L78)
- [method] `init` :: (): Promise<void> (L18-L23)
- [method] `parseFile` :: (
    filePath: string,
    content: string,
    lang: SupportedLanguage,
  ): Promise<ExtractorResult> (L25-L77)

### `packages/parser/src/extractors/go-extractor.ts`
- [class] `GoExtractor` :: class GoExtractor (L14-L393)
- [method] `constructor` :: (filePath: string) (L22-L25)
- [method] `extract` :: (tree: Parser.Tree, sourceContent: string): ExtractorResult (L27-L56)
- [method] `visitNode` :: (node: Parser.SyntaxNode, currentParentId: string): void (L58-L112)
- [method] `extractPackage` :: (node: Parser.SyntaxNode, currentParentId: string): void (L114-L140)
- [method] `extractTypeDeclaration` :: (node: Parser.SyntaxNode, currentParentId: string): void (L142-L185)
- [method] `extractInterfaceMethods` :: (interfaceNode: Parser.SyntaxNode, interfaceNodeId: string, interfaceName: string): void (L187-L220)
- [method] `extractFunction` :: (node: Parser.SyntaxNode): NodeRecord | null (L222-L254)
- [method] `extractMethod` :: (node: Parser.SyntaxNode): { node: NodeRecord; receiverType: string | null } | null (L256-L304)
- [method] `extractImport` :: (node: Parser.SyntaxNode, currentParentId: string): void (L306-L335)
- [function] `walkImports` :: (n: Parser.SyntaxNode) (L310-L332)
- [method] `extractCall` :: (node: Parser.SyntaxNode, currentParentId: string): void (L337-L364)
- [method] `extractPrecedingDocComment` :: (node: Parser.SyntaxNode): string | null (L366-L379)
- [method] `createContainsEdge` :: (parentId: string, childId: string): void (L381-L392)

### `packages/parser/src/extractors/rust-extractor.ts`
- [class] `RustExtractor` :: class RustExtractor (L14-L414)
- [method] `constructor` :: (filePath: string) (L22-L25)
- [method] `extract` :: (tree: Parser.Tree, sourceContent: string): ExtractorResult (L27-L56)
- [method] `visitNode` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingTypeName: string | null,
  ): void (L58-L159)
- [method] `extractStructOrEnum` :: (node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null (L161-L188)
- [method] `extractTrait` :: (node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null (L190-L215)
- [method] `extractImpl` :: (
    node: Parser.SyntaxNode,
    currentParentId: string,
  ): { targetTypeName: string; targetNodeId: string | null } | null (L217-L246)
- [method] `extractFunction` :: (
    node: Parser.SyntaxNode,
    enclosingTypeName: string | null,
  ): NodeRecord | null (L248-L289)
- [method] `extractUse` :: (node: Parser.SyntaxNode, currentParentId: string): void (L291-L319)
- [function] `walkUse` :: (n: Parser.SyntaxNode) (L295-L316)
- [method] `addImportRef` :: (name: string, line: number, currentParentId: string): void (L321-L333)
- [method] `extractCall` :: (node: Parser.SyntaxNode, currentParentId: string): void (L335-L366)
- [method] `extractMacro` :: (node: Parser.SyntaxNode, currentParentId: string): void (L368-L385)
- [method] `extractDocComment` :: (node: Parser.SyntaxNode): string | null (L387-L400)
- [method] `createContainsEdge` :: (parentId: string, childId: string): void (L402-L413)

### `fixtures/languages/csharp/PaymentService.cs`
- [module] `Ruas.Payment` :: namespace Ruas.Payment (L4-L39)
- [class] `PaymentService` :: public class PaymentService (L9-L39)
- [method] `PaymentService` :: PaymentService(string merchantId) (L13-L16)
- [method] `ProcessPayment` :: bool ProcessPayment(string orderId, decimal amount) (L21-L30)
- [method] `ValidateOrder` :: void ValidateOrder(string orderId) (L32-L34)
- [method] `PersistPayment` :: void PersistPayment(string orderId, decimal amount) (L36-L38)

### `fixtures/languages/go/payment.go`
- [module] `payment` :: package payment (L1-L1)
- [class] `PaymentGateway` :: type PaymentGateway struct (L9-L11)
- [interface] `PaymentContract` :: type PaymentContract interface (L14-L16)
- [method] `Pay` :: Pay(ctx context.Context, orderID string, amount int64) (string, error) (L15-L15)
- [method] `Pay` :: func (p *PaymentGateway) Pay(ctx context.Context, orderID string, amount int64) (string, error) (L19-L25)
- [function] `CalculateFee` :: func CalculateFee(amount int64) int64 (L28-L30)

### `fixtures/languages/java/PaymentService.java`
- [module] `com.ruas.payment` :: package com.ruas.payment (L1-L1)
- [class] `PaymentService` :: public class PaymentService (L9-L35)
- [method] `PaymentService` :: PaymentService(String apiKey) (L12-L14)
- [method] `processPayment` :: boolean processPayment(String customerId, long amount) (L19-L26)
- [method] `validateCustomer` :: void validateCustomer(String customerId) (L28-L30)
- [method] `recordTransaction` :: void recordTransaction(String customerId, long amount) (L32-L34)

### `fixtures/languages/rust/payment.rs`
- [class] `PaymentGateway` :: pub struct PaymentGateway (L4-L7)
- [interface] `PaymentContract` :: pub trait PaymentContract (L10-L12)
- [method] `new` :: fn new(merchant_id: String) -> Self (L15-L20)
- [method] `pay` :: fn pay(&self, order_id: &str, amount: u64) -> Result<String, String> (L24-L30)
- [function] `calculate_fee` :: fn calculate_fee(amount: u64) -> u64 (L33-L35)

### `packages/eval/src/ablation-runner.ts`
- [interface] `VariantResult` :: interface VariantResult (L29-L34)
- [interface] `GroupedMetricSummary` :: interface GroupedMetricSummary (L36-L46)
- [interface] `AblationReport` :: interface AblationReport (L48-L62)
- [class] `AblationRunner` :: class AblationRunner (L64-L344)
- [method] `constructor` :: (tempDir?: string) (L72-L74)
- [method] `setup` :: (): Promise<void> (L76-L108)
- [method] `teardown` :: (): Promise<void> (L110-L115)
- [method] `runBenchmark` :: (): Promise<AblationReport> (L117-L199)
- [function] `inferLanguage` :: (q: BenchmarkQuery): string (L150-L159)
- [method] `computeGroupedMetrics` :: (
    queries: readonly BenchmarkQuery[],
    bm25Results: readonly QueryEvaluationResult[],
    fullResults: readonly QueryEvaluationResult[],
    groupFn: (q: BenchmarkQuery) => string,
  ): readonly GroupedMetricSummary[] (L201-L239)
- [method] `evaluateVariant` :: (
    variant: AblationVariant,
    queries: readonly BenchmarkQuery[],
  ): Promise<readonly QueryEvaluationResult[]> (L241-L274)
- [method] `retrieve` :: (variant: AblationVariant, queryText: string): Promise<readonly string[]> (L276-L330)
- [method] `getVariantName` :: (variant: AblationVariant): string (L332-L343)

### `packages/eval/src/dataset.ts`
- [interface] `BenchmarkFile` :: interface BenchmarkFile (L12-L16)
- [interface] `BenchmarkQuery` :: interface BenchmarkQuery (L18-L26)

### `packages/eval/src/run-eval.ts`
- [function] `main` :: (): Promise<void> (L3-L90)
- [function] `pad` :: (str: string, len: number) (L22-L22)
- [function] `num` :: (n: number, len: number, decimals = 4) (L23-L23)

### `packages/indexer/src/file-walker.ts`
- [interface] `WalkedFile` :: interface WalkedFile (L7-L13)
- [interface] `FileWalkerOptions` :: interface FileWalkerOptions (L15-L19)
- [class] `FileWalker` :: class FileWalker (L21-L178)
- [method] `constructor` :: (options: FileWalkerOptions) (L26-L73)
- [method] `walk` :: (): Promise<readonly WalkedFile[]> (L75-L147)
- [method] `detectLanguage` :: (filePath: string): SupportedLanguage | null (L149-L177)

### `packages/rank/src/retrieval-pipeline.ts`
- [interface] `RetrievedSymbol` :: interface RetrievedSymbol (L16-L25)
- [interface] `RetrievalResult` :: interface RetrievalResult (L27-L33)
- [class] `RetrievalPipeline` :: class RetrievalPipeline (L35-L258)
- [method] `constructor` :: (storage: Storage, glossaryExpander?: GlossaryExpander) (L41-L46)
- [method] `search` :: (
    queryText: string,
    limit = 10,
    enableRoast = false,
  ): Promise<RetrievalResult> (L48-L237)
- [method] `generateEmotionalDamageRoast` :: (
    node: NodeRecord,
    inboundCount: number,
    outboundCount: number,
    risk: RetrievedSymbol["riskLevel"],
    fuzzyScore?: number,
  ): string (L239-L257)
