# MASTER PLAN — ASEAN-First Code Intelligence Engine

> **Project Code Name Proposals:** `ruas` | `suluh` | `sandi`  
> **Status:** Phase 0 (Planning & Architecture)  
> **Target Audience:** AI Agents (via MCP) & Human Software Engineers  
> **Author:** Antigravity (Senior Staff Engineer) for Ghani (Lead Engineer & UI/UX Designer)  
> **Repository:** `Graph_Draft`

---

## 1. Executive Summary & Product Thesis

Most existing code intelligence platforms (sourcegraph, code property graphs, and agent indexing tools) suffer from two structural shortcomings:
1. **Linguistic & Domain Blindness:** They operate strictly on English semantics and ASCII identifiers. In Southeast Asia (notably Indonesia), production enterprise codebases (fintech, e-commerce, logistics, edutech, government) mix Indonesian and English identifiers (e.g., `hitungTotalDiskon`, `pelangganRepository`, `cekStatusOngkir`, `generateFakturPajak`), and developers express queries in colloquial or formal Bahasa Indonesia.
2. **Heuristic Black-Box Graph Traversal:** Many agent retrieval tools either dump flattened raw symbol dumps or rely on uncalibrated binary relations ("extracted" vs "inferred"). They lack statistical confidence calibration, leading to hallucinated agent call paths.

This project delivers an **offline-first, zero-external-API, statistically calibrated, multilingual code intelligence engine** for AI agents (via the Model Context Protocol) and human developers.

---

## 2. Proposed System Architecture

### 2.1 Monorepo Module Topology

The system is organized as a pnpm workspace with strict module boundaries. Dependencies flow inward; `core` and `nlp` have zero knowledge of databases, CLI, or MCP.

```
                           ┌────────────────────────┐
                           │      CLI (@/cli)       │
                           │  index | ask | status  │
                           └───────────┬────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │  MCP (@/mcp)     │       │ Docgen (@/docgen)│       │  Eval (@/eval)   │
  │ stdio protocol   │       │ Bahasa handovers │       │ CI benchmark &   │
  │ budgeted bundles │       │ source citations │       │ Wilcoxon testing │
  └─────────┬────────┘       └─────────┬────────┘       └─────────┬────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                             ┌──────────────────┐
                             │  Rank (@/rank)   │
                             │ FTS5 + Trigram + │
                             │   PPR + RRF      │
                             └─────────┬────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │Indexer(@/indexer)│       │ Resolver(@/res.) │       │   NLP (@/nlp)    │
  │ Merkle walker    │──────▶│ Beta-Bernoulli   │◀──────│ Subword split    │
  │ Dirty-set diff   │       │ Call/Import link │       │ Nazief-Adriani   │
  └─────────┬────────┘       └─────────┬────────┘       │ Glossary expand  │
            │                          │                └─────────┬────────┘
            ▼                          ▼                          │
  ┌──────────────────┐       ┌──────────────────┐                 │
  │ Parser(@/parser) │       │  Store (@/store) │                 │
  │ web-tree-sitter  │       │ SQLite + FTS5    │                 │
  │ TS/JS/PHP WASM   │       │ Migrations & WAL │                 │
  └─────────┬────────┘       └─────────┬────────┘                 │
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                             ┌──────────────────┐
                             │  Core (@/core)   │
                             │ Types, Result<T> │
                             │ Zod Config, IDs  │
                             └──────────────────┘
```

### 2.2 Data Flow

#### A. Indexing Pipeline (Cold & Incremental)
1. **File Walking & Dirty-Set Hashing (`@/indexer`):**
   - Traverse repository honoring `.gitignore` and `.projectignore`.
   - Compute BLAKE3/SHA-256 content hashes per file and aggregate directory Merkle hashes.
   - For incremental runs, compute the symmetric difference between current hashes and the stored file manifest in SQLite.
2. **AST Parsing (`@/parser`):**
   - Load pre-compiled WASM grammars for TypeScript/JavaScript/TSX and PHP using `web-tree-sitter`.
   - Extract declarations: functions, methods, classes, interfaces, routes, modules, imports, calls, assignments.
   - Generate deterministic canonical node IDs: `SHA256(rel_path + ":" + qualified_name + ":" + kind)`.
3. **Cross-File Resolution (`@/resolver`):**
   - First-pass: Insert all local definitions into `nodes` and unresolved references into `unresolved_refs`.
   - Second-pass: Resolve call sites and inheritance hierarchies against imported symbols and lexical scopes.
   - Attach statistical Bayesian priors: each resolution heuristic rule emits a Beta update $(\Delta\alpha, \Delta\beta)$, calculating posterior mean $p = \frac{\alpha}{\alpha + \beta}$ and 95% equal-tailed credible intervals.
4. **Token Ingestion & Indexing (`@/store` & `@/nlp`):**
   - Deconstruct identifiers via subword splitting (camelCase, snake_case, PascalCase, mixed abbreviations).
   - Apply Indonesian affix stripping (Nazief–Adriani) alongside English stemming (Porter/Snowball).
   - Write documents into SQLite tables and populate the FTS5 virtual index with stemmed and raw tokens.

#### B. Retrieval Pipeline (`ask_code` / CLI `ask`)
```
[User Query: "fungsi hitung diskon pelanggan"]
       │
       ▼
 1. Language Detection & Normalization (heuristic token scan + glossary lookup)
       │
       ▼
 2. Tokenization & Indonesian/English Stemming ("fungsi" -> func, "hitung" -> hitung, "diskon" -> diskon)
       │
       ▼
 3. Glossary Expansion (diskon -> discount [w=0.9], pelanggan -> customer [w=0.9])
       │
       ├─────────────────────────────────────────┬──────────────────────────────────────┐
       ▼                                         ▼                                      ▼
4a. FTS5 Lexical Search                   4b. Trigram Fuzzy Match               4c. Exact Symbol Filter
    (name^4, qname^3, doc^1)                  (handles typos, e.g. pelangan)        (exact identifier hits)
       │                                         │                                      │
       └─────────────────────────────────────────┴──────────────────────────────────────┘
                                                 │
                                                 ▼
                                5. Candidate Seed Pool (Top-N items)
                                                 │
                                                 ▼
                                6. Personalized PageRank (PPR)
                                   - Matrix: Edges (calls, imports, contains) with confidence weights
                                   - Damping factor: alpha = 0.85
                                   - Personalization vector: Lexical BM25 rank distribution
                                                 │
                                                 ▼
                                7. Reciprocal Rank Fusion (RRF, k = 60)
                                   - Merges Lexical Score Rank + Trigram Rank + PPR Rank
                                                 │
                                                 ▼
                                8. Context Budgeting & Assembly
                                   - Target token budget: 4,000 tokens (configurable)
                                   - Deduplication, snippet truncation, call-path stitching
                                   - Staleness detection banner if files were modified
```

---

## 3. Candidate Project Names

We propose three distinct names that honor the Indonesian roots of the project while remaining international, short, and CLI-ergonomic:

| Candidate | Meaning & Concept | CLI Ergonomics | npm Availability Reasoning |
| :--- | :--- | :--- | :--- |
| **`ruas`** (Recommended) | Indonesian/Malay for *internode / segment* (the structural joint between nodes on bamboo, sugarcane, or skeletons). Perfectly describes graph nodes, AST segments, and structured code modularity. | `npx ruas index`<br>`ruas ask "hitung diskon"` | Word is short and distinct. `ruas` package on npm may be dormant or squatted; recommended published package scope: `@ruas/cli` or `@ruas-ai/cli` with binary alias `ruas`. |
| **`suluh`** | Indonesian for *torch / lantern / illuminator*. A guide that brings clarity to dark, complex, undocumented legacy codebases. | `npx suluh index`<br>`suluh ask "ongkir"` | Poetic, memorable, pronounceable in both Indonesian and English. Recommended scope: `@suluh/cli` or `@suluh-dev/cli`. |
| **`sandi`** | Old Javanese / Sanskrit root for *code, cipher, or articulation/junction*. Connects "source code" with "connecting joints". | `npx sandi index`<br>`sandi trace ...` | Extremely natural in Indonesian. High probability of npm collision for bare name; recommended scope: `@sandi-code/cli` or `@sandi-ai/cli`. |

---

## 4. Architecture Decision Records (ADRs)

### ADR-001: Monorepo Tooling & Workspace Structure
- **Context:** We need a strict, high-performance monorepo for ~10 modular packages with shared TS configs and fast CI.
- **Alternatives Considered:** Turborepo + npm, Nx, Lerna, pnpm workspaces alone.
- **Decision:** **pnpm workspaces with native TypeScript project references and Vitest.**
- **Rationale:** pnpm delivers strict dependency isolation (preventing phantom dependencies), zero native compilation overhead, fast symlinking, and works seamlessly on 8GB laptops.
- **Trade-offs:** Developers must have `pnpm` installed (`corepack enable pnpm`).

### ADR-002: AST Parsing Engine via `web-tree-sitter` (WASM)
- **Context:** Extracting syntactic definitions across TypeScript, JavaScript, and PHP without requiring Python/C++ toolchains on end-user machines.
- **Alternatives Considered:**
  1. Native `tree-sitter` Node bindings: Fast, but requires `node-gyp`, Python, and C++ compiler toolchains on user laptops; frequently breaks on macOS ARM vs Linux x64.
  2. Babel / `@typescript-eslint/parser`: Excellent for TS, but completely useless for PHP.
  3. `web-tree-sitter` (WebAssembly): Uses Emscripten-compiled WASM binaries for the runtime and per-language grammars.
- **Decision:** **`web-tree-sitter` WASM with vendored `.wasm` grammars.**
- **Rationale:** 100% cross-platform zero-install guarantee. Works on Windows, macOS, and Linux without native builds.
- **Trade-offs:** Approximately 1.5x–2.0x slower parse throughput compared to native C bindings, and slightly higher memory consumption per worker. Acceptable for our target (5,000 files in $\le 60$s).

### ADR-003: Storage Layer & Lexical Search
- **Context:** Need embedded persistent storage for graph nodes, edges, file hashes, and BM25 search with zero network dependencies.
- **Alternatives Considered:**
  1. DuckDB: High analytical capability, but heavy binary footprint (~60MB), slower single-row inserts and updates.
  2. Pure in-memory graph (e.g. Graphology) + JSON dump: Fast, but exceeds 1.5GB RAM at 20,000 files and lacks persistent FTS.
  3. SQLite with FTS5: Ubiquitous, lightweight (<1MB overhead), ACID WAL mode, robust FTS5 with BM25 scoring.
- **Decision:** **SQLite with WAL mode and FTS5, accessed via an abstract `Storage` interface supporting `node:sqlite` (Node 22 native) with fallback to `better-sqlite3`.**
- **Rationale:** SQLite WAL mode handles concurrent read queries from multiple agent processes while indexing in the background. FTS5 provides fast BM25 ranking.
- **Trade-offs:** Node 22's `node:sqlite` is stabilizing; fallback abstraction ensures stability across diverse Node environments.

### ADR-004: Indonesian Natural Language Processing & Stemmer
- **Context:** Queries like *"fungsi hitung diskon pelanggan"* must match `calculateDiscount(customer)` and mixed identifiers like `hitungDiskonPelanggan`.
- **Alternatives Considered:**
  1. Porting external Python libraries (e.g. PySastrawi): Requires Python runtime, violating our offline single-binary/Node constraint.
  2. Pre-trained BERT/MiniLM embeddings: Violates the constraint of avoiding dense vector embeddings as core dependencies and keeping RAM $\le 1.5$GB.
  3. Custom Clean-Room TypeScript Implementation of Nazief–Adriani Morphological Stemmer + Community YAML Glossary.
- **Decision:** **Clean-room TypeScript implementation of Nazief–Adriani affix-stripping stemmer with a curated root-word list and YAML-based bilingual glossary expansion.**
- **Rationale:** Deterministic, instantaneous execution (<1ms per query), zero memory footprint (<5MB), completely offline, and customizable via user YAML files.
- **Trade-offs:** Morphophonemic edge cases in complex Indonesian affixes require comprehensive unit tests and dictionary lookups.

### ADR-005: Probabilistic Edge Confidence via Beta-Bernoulli Updating
- **Context:** Static code analysis cannot resolve 100% of dynamic call sites (e.g., PHP `$this->$method()` or dynamic JS object dispatch). Binary labels (`inferred` vs `extracted`) give agent LLMs no mathematical basis to assess path validity.
- **Alternatives Considered:**
  1. Binary flag: `is_inferred: boolean`. No gradient of confidence.
  2. Ad-hoc heuristic scoring: Arbitrary weights (e.g., 0.7 for same file, 0.4 for global match). Hard to calibrate or interpret mathematically.
  3. Beta-Bernoulli Conjugate Model: Prior $\text{Beta}(\alpha_0, \beta_0)$ updated by independent evidential observations $(\Delta\alpha_i, \Delta\beta_i)$ to yield posterior $\text{Beta}(\alpha, \beta)$.
- **Decision:** **Beta-Bernoulli conjugate model per edge with calibrated evidence rules.**
- **Posterior Mean:** $\mathbb{E}[p] = \frac{\alpha}{\alpha + \beta}$
- **Credible Interval:** Exact 95% equal-tailed interval via regularized incomplete beta function inversion.
- **Rules & Priors:**
  - *Explicit Direct Import + Named Call:* $\alpha_0 = 10, \beta_0 = 0.5 \implies \mathbb{E}[p] \approx 0.952$
  - *Same File / Same Scope Declaration:* $\alpha_0 = 8, \beta_0 = 1 \implies \mathbb{E}[p] \approx 0.889$
  - *Unique Global Symbol Match (Single Candidate):* $\alpha_0 = 6, \beta_0 = 2 \implies \mathbb{E}[p] \approx 0.750$
  - *Ambiguous Candidate Match ($K$ candidates):* $\alpha_0 = 2, \beta_0 = 2 \times K \implies \mathbb{E}[p] \le 0.33$
- **Rationale:** Allows agents to query edges with uncertainty bounds and enables empirical calibration checks (Expected Calibration Error).

### ADR-006: Structural Graph Re-ranking via Personalized PageRank & RRF
- **Context:** Pure lexical search over source code produces high false positive rates due to ubiquitous utility names (`get`, `handle`, `execute`). We must combine keyword matching with structural centrality without relying on neural vector models.
- **Alternatives Considered:**
  1. Dense Vector Re-ranking (Cross-Encoder / Cohere / Ollama): Expensive, slow, high RAM, non-deterministic.
  2. Pure Shortest-Path / Breadth-First Expansion: Sensitive to noise, explodes combinatorial search space on dense dependency graphs.
  3. Personalized PageRank (PPR) seeded by Lexical Matches, fused with Reciprocal Rank Fusion (RRF).
- **Decision:** **Personalized PageRank (PPR) over the weighted call/import graph combined with BM25 and Trigram scores via Reciprocal Rank Fusion ($k = 60$).**
- **Formulation:**
  $$\mathbf{p}^{(t+1)} = (1 - d) \mathbf{s} + d \mathbf{W}^T \mathbf{p}^{(t)}$$
  where $\mathbf{s}$ is the normalized top lexical candidate distribution, $d = 0.85$, and $\mathbf{W}$ is the stochastic transition matrix weighted by edge confidence and inverse degree.
  $$\text{RRF Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
- **Rationale:** Guaranteed convergence within 15 iterations (<25ms for 50k nodes), high explainability, and strong ranking boost for architectural hubs.

### ADR-007: Agent Integration via Model Context Protocol (MCP)
- **Context:** Exposing code graph intelligence to LLMs and AI agent workflows (Claude, Cursor, Gemini, Cline, Antigravity).
- **Alternatives Considered:**
  1. Language Server Protocol (LSP): Geared towards editor autocompletion and diagnostic squiggles, poor abstraction for conversational context budgeting.
  2. Custom REST/GraphQL API: Requires running a persistent web server and managing ports, authentication, and background processes.
  3. Model Context Protocol (MCP) over `stdio`: Standardized by Anthropic and rapidly adopted by major AI developer tools.
- **Decision:** **Standard MCP server over `stdio` using `@modelcontextprotocol/sdk`.**
- **Exposed Tools:**
  - `ask_code`: Question answering with budgeted, cited context bundles.
  - `trace_impact`: Symbol blast radius with decay and confidence intervals.
  - `project_overview`: High-level topology, languages, freshness, and key hubs.
  - `generate_handover`: Structured handover generation with strict claim citations.
- **Rationale:** Instant compatibility with all leading AI agent environments; zero socket overhead.

### ADR-008: Merkle-Tree Incremental Indexing & Dirty-Set Invalidation
- **Context:** Re-indexing 5,000+ files on every file edit violates the $\le 500$ms incremental latency target.
- **Alternatives Considered:**
  1. File timestamp (`mtime`) polling: Prone to clock skew, git checkouts, and missed rapid saves.
  2. Global re-indexing on every save: Violates latency budget.
  3. Hierarchical Merkle Tree + Dependent Symbol Invalidation Graph.
- **Decision:** **Content-hash based Merkle tree combined with a reverse dependency dirty-set tracker.**
- **Algorithm:**
  1. Watcher detects change in `path/to/foo.ts`.
  2. Hash `foo.ts`; if hash unchanged, early exit (<1ms).
  3. Re-parse `foo.ts`; delete previous nodes and outbound edges.
  4. Query `unresolved_refs` and inbound call/import edges to identify the **dirty set** of dependent files.
  5. Re-run resolution only on the dirty set.
- **Invariant:** $\text{Graph}(\text{Incremental}) \equiv \text{Graph}(\text{Cold Rebuild})$ (verified via property testing).

---

## 5. Milestone Breakdown (M1–M5)

```
Milestone Timeline (4 Weeks)
========================================================================
[Week 1] M1: Foundations & Core AST Extraction (TS/JS)
         ├─ Monorepo, strict TS, Core types & Result<T, E>
         ├─ SQLite schema, migrations, WAL, Storage abstraction
         ├─ File walker, Merkle dirty-set, .gitignore engine
         ├─ web-tree-sitter WASM loader & TS/JS/TSX extractor
         └─ CLI `index`, `status` + Golden file tests
------------------------------------------------------------------------
[Week 2] M2: Cross-File Resolution & Multilingual Retrieval
         ├─ Reference resolver with Beta-Bernoulli evidence updating
         ├─ NLP: Subword tokenizer, Nazief-Adriani ID stemmer, Glossary
         ├─ FTS5 BM25 + Trigram indexing
         ├─ Personalized PageRank (PPR) & Reciprocal Rank Fusion (RRF)
         ├─ PHP tree-sitter extractor
         ├─ CLI `ask` command
         └─ Eval Harness v1 (≥40 queries) + Ablation table
------------------------------------------------------------------------
[Week 3] M3: Agent Protocol (MCP) & Incremental Engine
         ├─ MCP Server implementation over stdio (@modelcontextprotocol/sdk)
         ├─ Tools: `ask_code`, `trace_impact`, `project_overview`
         ├─ Context budget assembler (line-numbered snippets, blast radius)
         ├─ File watcher with debounce & Merkle dirty-set invalidation
         ├─ Staleness banner mechanism
         └─ Benchmarking against performance targets (cold/inc/RAM)
------------------------------------------------------------------------
[Week 4] M4: Statistical Rigor, Community Detection & Final Eval
         ├─ Beta confidence calibration (Reliability diagram & ECE)
         ├─ Leiden community detection with ARI stability check (≥10 seeds)
         ├─ Glossary expansion to ≥150 terms across 7 ASEAN domains
         ├─ Full Evaluation Harness (≥150 queries, 8 repos, 95% CIs, Wilcoxon)
         ├─ Documentation: METHODOLOGY.md, CLEANROOM.md, THIRD_PARTY.md
         └─ M4 Delivery Review with Ghani
------------------------------------------------------------------------
[Stretch] M5: Human-Facing Handover & Visual Explorer
         ├─ `generate_handover` tool in Bahasa with per-claim citations
         ├─ Graph Explorer UI (Vite + Sigma.js/d3-force, glassmorphic dark)
         └─ Optional local Ollama semantic integration
========================================================================
```

### Detailed Milestone Breakdown

#### Milestone 1: Foundations & Core Ingestion
- **Deliverables:**
  - Monorepo configured with `pnpm`, `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Biome linter/formatter.
  - `@ruas/core`: Domain models (`Node`, `Edge`, `FileRecord`, `UnresolvedRef`), `Result<T, E>`, canonical ID generator.
  - `@ruas/store`: SQLite schema migrations, WAL mode setup, `Storage` interface supporting Node 22 `node:sqlite` with fallback.
  - `@ruas/indexer`: Fast directory walker honoring `.gitignore`, file hashing (SHA-256), Merkle tree dirty tracking.
  - `@ruas/parser`: WASM loader for `web-tree-sitter`, TypeScript/JavaScript/TSX tree-sitter extractor for declarations and imports.
  - `@ruas/cli`: `ruas index` and `ruas status` commands with `--json` support.
- **Acceptance Criteria:**
  - `pnpm test` runs with 100% pass rate in Vitest.
  - Golden-file tests confirm identical AST node extraction on standard TypeScript code samples.
  - Indexing a 1,000-file TypeScript project produces verified SQLite records in `< 10`s.

#### Milestone 2: Cross-File Resolution & Multilingual Retrieval
- **Deliverables:**
  - `@ruas/resolver`: Two-pass symbol linker with Beta-Bernoulli evidential updates and 95% credible intervals.
  - `@ruas/nlp`: Subword splitting, clean-room Nazief-Adriani stemmer for Bahasa Indonesia, YAML glossary loader with validation.
  - `@ruas/rank`: SQLite FTS5 BM25 search, Trigram fuzzy index, Personalized PageRank power-iteration engine, Reciprocal Rank Fusion ($k=60$).
  - `@ruas/parser`: PHP tree-sitter extractor for classes, methods, functions, namespaces, imports, and calls.
  - `@ruas/cli`: `ruas ask "<query>"` command.
  - `@ruas/eval`: Initial evaluation suite with 40 hand-labeled queries across 2 open-source repos (TS & PHP).
- **Acceptance Criteria:**
  - Query `"fungsi hitung diskon pelanggan"` matches `calculateDiscount(customer)` in top 3 hits.
  - Ablation test shows Glossary + Stemming + PPR outperforms pure BM25 on Indonesian queries with statistical significance ($p < 0.05$).
  - PHP golden files pass for object-oriented and functional syntax.

#### Milestone 3: Agent Protocol (MCP) & Incremental Engine
- **Deliverables:**
  - `@ruas/mcp`: Official `@modelcontextprotocol/sdk` stdio server exposing `ask_code`, `trace_impact`, and `project_overview`.
  - Context budgeter: Packets assembled within token budgets (default 4,000 tokens) with source snippet citations and truncation metadata.
  - `@ruas/indexer`: File watcher with configurable debounce (500ms–2000ms) and dirty-set incremental resolution.
  - Invariant testing: Property-based tests verifying $\text{Graph}(\text{Incremental}) \equiv \text{Graph}(\text{Full Rebuild})$.
- **Acceptance Criteria:**
  - MCP server connects to Claude Desktop and Cursor without error.
  - Incremental update on a single modified file finishes in $\le 500$ms.
  - Cold indexing of 5,000 files completes in $\le 60$s; peak RAM remains $\le 1.5$GB.

#### Milestone 4: Statistical Rigor, Community Detection & Final Eval
- **Deliverables:**
  - Calibration assessment: Reliability diagram and Expected Calibration Error (ECE) for edge priors.
  - Community detection: Leiden algorithm implementation with Adjusted Rand Index (ARI) stability testing across 10 random seeds.
  - Community term extraction: TF-IDF based subsystem labeling without external LLMs.
  - Glossary expansion: $\ge 150$ terms across 7 ASEAN enterprise domains (e-commerce, payments, taxes, HR, logistics, edutech, government).
  - Comprehensive benchmark in `@ruas/eval`: $\ge 150$ queries over 8 open-source repositories, paired Wilcoxon signed-rank tests, 10,000-resample bootstrap 95% CIs.
  - Documentation: `docs/METHODOLOGY.md`, `docs/CLEANROOM.md`, `docs/THIRD_PARTY.md`.
- **Acceptance Criteria:**
  - ECE $\le 0.15$ on hand-labeled edge sample.
  - Leiden community stability ARI $\ge 0.75$ across 10 seeds.
  - Full evaluation shows statistically significant superiority over keyword baselines with 95% CIs excluding zero.

#### Milestone 5 (Stretch): Human-Facing Delivery & Visual Explorer
- **Deliverables:**
  - `@ruas/docgen`: `generate_handover` command generating onboarding documentation in Bahasa Indonesia with per-claim citation links to line numbers.
  - `@ruas/ui`: Polished, lightweight graph explorer web application built with Vite and Sigma.js/d3-force, featuring glassmorphism, responsive canvas, and dark mode.
  - Optional local Ollama semantic enhancement layer.
- **Acceptance Criteria:**
  - Handover doc contains zero uncited claims.
  - Graph explorer runs smoothly on 60 FPS for graphs with up to 10,000 nodes.

---

## 6. Risk Register

| Risk ID | Category | Description | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Technical | `web-tree-sitter` WASM memory leaks or Emscripten allocator bloat during large repository batch parsing. | Medium | High | Recycle tree-sitter parser instances per batch; invoke explicit `.delete()` on AST tree handles; run memory stress tests in CI. |
| **R-02** | Technical | High false positive rate or poor calibration in PHP dynamic dispatch calls. | High | Medium | Assign conservative Beta priors ($\alpha=2, \beta=8$) for dynamic invocations; clearly mark them as low-confidence in blast radius outputs. |
| **R-03** | Legal / Clean-Room | Accidental contamination from reading inspiration repositories or copying heuristics. | Low | Critical | Strict clean-room protocol: Zero access to inspiration repos; algorithms derived exclusively from open literature (BM25, PageRank, Leiden); maintain signed `docs/CLEANROOM.md`. |
| **R-04** | Performance | Personalized PageRank power iteration fails to converge within 300ms on dense circular graphs. | Medium | Medium | Set maximum iteration cap ($N=20$) and convergence threshold $\epsilon = 10^{-5}$; prune low-confidence edges before building transition matrix. |
| **R-05** | Legal / License | Tree-sitter WASM grammar grammars or stemmer wordlists carry incompatible copyleft licenses (GPL). | Low | High | Enforce strict license checking: Only MIT, Apache-2.0, or BSD allowed. Document every dependency in `THIRD_PARTY.md`. |
| **R-06** | Scope | Over-engineering the UI/Ollama layer before the retrieval and evaluation engine is rock solid. | Medium | Medium | Strict gating: Milestone 5 is explicitly quarantined as a stretch goal; M1–M4 must meet all acceptance criteria before any M5 code is touched. |

---

## 7. Comprehensive Evaluation Plan (§8)

The evaluation suite (`packages/eval`) is a core deliverable, not a post-hoc demo script.

### 7.1 Dataset Construction & Schema
We build an evaluation dataset containing $\ge 150$ queries across $\ge 8$ real-world open-source repositories (mix of TypeScript, JavaScript, and PHP).

**JSONL Schema:**
```json
{
  "id": "eval-q042",
  "repo": "open-source/tokopedia-clone",
  "commit": "a1b2c3d4",
  "lang_query": "id",
  "query": "fungsi hitung diskon pelanggan",
  "relevant_symbols": [
    "src/services/discount.ts:DiscountService.calculateCustomerDiscount",
    "src/utils/promo.ts:applyDiskon"
  ],
  "difficulty": "medium",
  "category": "e-commerce",
  "notes": "Tests cross-lingual retrieval with Indonesian query against English/mixed codebase"
}
```

**Query Mix Requirements:**
- $\ge 40\%$ queries in formal/colloquial Bahasa Indonesia (e.g. *"validasi format nomor hp dan wa"*).
- $\ge 20\%$ queries in mixed Indonesian-English code-switching (e.g. *"handle callback pembayaran qris"*).
- $\ge 40\%$ queries in English (baseline equivalence).

### 7.2 Retrieval Metrics
1. **Recall@k ($k \in \{5, 10, 20\}$):** Proportion of relevant ground-truth symbols appearing in the top $k$ retrieved results.
2. **Mean Reciprocal Rank (MRR):** $\frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$, measuring how quickly the first relevant symbol is retrieved.
3. **Normalized Discounted Cumulative Gain (nDCG@10):** Measures ranking quality with position discount.

### 7.3 System Performance Metrics
- **Cold Index Throughput:** Files/second and total duration for a 5,000-file repository (Target: $\le 60$s).
- **Incremental Update Latency:** $p50, p95, p99$ latency from single file modification to queryable state (Target: $\le 500$ms).
- **Query Latency (`ask_code`):** $p95 \le 300$ms on a 5,000-file index.
- **Peak Memory RSS:** Measured during cold index of 20,000 files (Target: $\le 1.5$GB).

### 7.4 Statistical Hypothesis Testing
- **Non-Parametric Bootstrap:** Compute 95% Confidence Intervals for all metrics using 10,000 bootstrap resamples.
- **Paired Wilcoxon Signed-Rank Test:** Compare our full pipeline against baselines on paired query scores.
- **Ablation Matrix:**
  1. Baseline A: Exact ripgrep regex search.
  2. Baseline B: SQLite FTS5 BM25 alone.
  3. Ablation C: BM25 + Glossary expansion.
  4. Ablation D: BM25 + Glossary + Nazief–Adriani stemming.
  5. Ablation E: BM25 + Glossary + Stemming + Trigram fuzzy.
  6. Ablation F: Full Pipeline (BM25 + Glossary + Stemming + Trigram + PPR + RRF).
- **Multiple Comparisons Correction:** Apply Holm-Bonferroni correction to ensure controlled Family-Wise Error Rate ($\alpha = 0.05$).

### 7.5 Statistical Calibration of Edge Confidence
- Sample 200 resolved edges per language (TypeScript, PHP).
- Manually annotate ground-truth connection validity (true dependency vs spurious string match).
- Partition predictions into 10 confidence bins $[0, 0.1), \dots, [0.9, 1.0]$.
- Compute **Expected Calibration Error (ECE)**:
  $$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)|$$
- Plot reliability diagrams in `docs/METHODOLOGY.md`. If $\text{ECE} > 0.15$, re-tune Beta priors before release.

---

## 8. Open Questions for Ghani

Here are 5 focused questions where a design choice affects project ergonomics, along with our engineering recommendations:

1. **Project Name Preference:**
   - *Options:* `ruas` (recommended), `suluh`, or `sandi`.
   - *Default Assumption:* We will use **`ruas`** (scoped as `@ruas/cli` with binary `ruas`).
2. **Node Runtime Target:**
   - *Options:* Strictly Node $\ge 22.11$ (LTS) to rely on built-in `node:sqlite`, vs Node $\ge 20$ with `better-sqlite3` bundled by default.
   - *Default Assumption:* Target Node $\ge 22.0.0$, using `node:sqlite` when detected, with graceful runtime detection and clear error if run on older engines.
3. **Stemmer Scope:**
   - *Options:* Nazief–Adriani standard rules + basic root dictionary vs full formal CS stemmer (Confix Stripping).
   - *Default Assumption:* Implement clean-room Nazief–Adriani with a compact, curated 3,500-word root dictionary vendored as JSON to maintain $<5$MB bundle size and $<1$ms execution.
4. **Target ASEAN Languages Sequencing:**
   - *Options:* Bahasa Indonesia first (M1–M4), followed by Thai via `Intl.Segmenter` in M4/M5, vs concurrent ID + TH from Day 1.
   - *Default Assumption:* Focus 100% on Bahasa Indonesia for M1–M3; add Thai word segmentation via `Intl.Segmenter` in M4 once the evaluation pipeline is verified.
5. **UI Technology Stack (Milestone 5):**
   - *Options:* Vite + Vanilla TS/Canvas + Sigma.js vs Next.js + React Flow.
   - *Default Assumption:* Lightweight Vite + Vanilla TS/Canvas + Sigma.js to avoid heavy React dependencies and maintain 60 FPS rendering on 8GB laptops.

---

## 9. Next Steps

Upon your approval:
1. Initialize pnpm monorepo structure with strict TypeScript configurations.
2. Draft `docs/CLEANROOM.md` and initial `THIRD_PARTY.md`.
3. Implement `@ruas/core` domain models and `Result<T, E>`.
4. Implement SQLite storage schema in `@ruas/store` with automated migrations.
5. Provide Milestone 1 progress report.
