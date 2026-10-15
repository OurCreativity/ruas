# 🌿 Ruas

> **Universal Code Intelligence Engine with Merciless Calibration & Multilingual Graph Retrieval**  
> Offline-first, zero-external-API, statistically calibrated code property graph for AI agents (via MCP) and human developers.

---

## ⚡ Product Philosophy

Most code intelligence tools sugarcoat code quality and assume monolithic, textbook English architectures. In reality, global production codebases are messy, multilingual, full of domain slang, and fraught with hidden traps.

**Ruas** is an **offline-first, zero-external-API, statistically calibrated universal code intelligence engine** inspired by ASEAN developer culture:
1. **Universal Multilingual & Mixed-Identifier Intelligence:** Flawlessly navigates mixed languages, local jargon, and acronyms (Indonesian, English, colloquial abbreviations) without needing heavy vector databases or cloud embedding APIs.
2. **Brutally Honest Blast Radius ("Emotional Damage"):** Instead of generic summaries, Ruas calculates exact, calibrated dependency risk and call-chain vulnerabilities—telling developers and AI agents mercilessly what will break in production.
3. **Probabilistic Edge Confidence:** Bayesian Beta-Bernoulli conjugate models ($\alpha, \beta$) with 95% credible intervals, preventing AI agents from hallucinating fictitious call paths.
4. **Lightweight & Blazing Fast:** Sub-millisecond FTS5 + Trigram + Personalized PageRank + RRF, running entirely local on an 8GB laptop.

---

## 🏛 Architecture Topology

Ruas is structured as a high-performance pnpm workspace with strict boundary decoupling:

```text
                           ┌────────────────────────┐
                           │      CLI (@ruas/cli)   │
                           │ index | ask | watch | … │
                           └───────────┬────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │  MCP (@ruas/mcp) │       │ Docgen (@/docgen)│       │ Eval (@ruas/eval)│
  │  stdio protocol  │       │ (Planned M5)     │       │ CI benchmark &   │
  │ budgeted packets │       │                  │       │ Wilcoxon testing │
  └─────────┬────────┘       └─────────┬────────┘       └─────────┬────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                             ┌──────────────────┐
                             │ Rank (@ruas/rank)│
                             │ FTS5 + Trigram + │
                             │   PPR + RRF      │
                             └─────────┬────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │Resolv (@/resolver│       │ NLP (@ruas/nlp)  │       │Index (@ruas/index│
  │Beta-Bernoulli CI │       │Nazief-Adriani    │       │ Merkle dirty-set │
  │2-pass evidence   │       │glossary expander │       │  watcher engine  │
  └─────────┬────────┘       └─────────┬────────┘       └─────────┬────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                             ┌──────────────────┐
                             │Store (@ruas/store│
                             │SQLite WAL + FTS5 │
                             │  (node:sqlite)   │
                             └─────────┬────────┘
                                       ▼
                             ┌──────────────────┐
                             │Core (@ruas/core) │
                             │Zod schemas & IDs │
                             └──────────────────┘
```

---

## 🚀 Quick Start

### Installation

#### Option 1: Run instantly with `npx` (No Install Required)
```bash
npx @fk0u/ruas ask "fungsi bayar qris" --roast
```

#### Option 2: Install globally via `npm` or `pnpm`
```bash
# Global install via npm (provides 'ruas' command)
npm install -g @fk0u/ruas

# Or via pnpm
pnpm add -g @fk0u/ruas
```

#### Option 3: Local Development (from source)
```bash
git clone https://github.com/fk0u/ruas.git
cd ruas
pnpm install
pnpm build
pnpm test
```

### CLI Commands

```bash
# Index current codebase (cold or incremental)
ruas index .

# Check repository graph statistics & health
ruas status .

# Perform deep architectural audit (cycles, dead code, coupling, health score)
ruas audit .
ruas audit . --json

# Trace blast radius and dependency call chain with Bayesian confidence
ruas trace prosesQRIS .
ruas trace calculateDiscount --depth 3

# Find shortest dependency/call path between two symbols (Dijkstra algorithm)
ruas path checkoutOrder calculateDiscount .

# Discover top 3 alternative execution routes using Yen's K-Shortest Path algorithm
ruas path checkoutOrder calculateDiscount . -k 3

# Compute Single-Source Shortest Path (SSSP) Dijkstra Horizon with Bayesian probability decay
ruas trace prosesQRIS . --dijkstra --depth 3

# Ask code intelligence with emotional damage roast
ruas ask "fungsi bayar qris" --roast
ruas ask "calculate customer discount" --roast

# Start background live file watcher
ruas watch .

# Generate onboarding handover documentation with zero uncited claims
ruas docgen . --out docs/HANDOVER.md

# Launch interactive, glassmorphic visual graph explorer in your browser (60 FPS canvas)
ruas ui . --port 4200

# Export codebase graph in multiple formats: Standalone HTML, Mermaid, Graphviz DOT, or JSON
ruas export . --html docs/graph.html
ruas export . --mermaid docs/graph.mmd
ruas export . --dot docs/graph.dot
ruas export . --json docs/graph.json

# Checkpoint working memory and vibe coding state into AI Mother Tongue (RUAS_CONTEXT.md)
ruas vibe save "Refactor payment flow ke QRIS & fix circular dependency" -f src/checkout.ts -n "Jaga transaksi QRIS tetap atomic"

# Recall previous vibe memory & working context to prevent AI amnesia
ruas vibe recall

# Synchronize and regenerate RUAS_CONTEXT.md for Cursor / Claude / Antigravity
ruas vibe sync

# Launch Model Context Protocol (MCP) server for Claude Desktop / Cursor / Antigravity
ruas mcp .
```

---

## 🧭 Systematic Dijkstra Algorithmic Architecture

Ruas v1.0.0 implements a mathematically rigorous graph traversal engine powered by **Dijkstra's Algorithm** and **Yen's K-Shortest Paths**, transforming how developers and AI agents navigate code:

### 1. Bayesian Negative Log-Likelihood Cost Transformation
Standard Dijkstra requires non-negative edge costs ($w(e) \ge 0$). In code graphs, edges are calibrated with Bayesian Beta-Bernoulli confidence $p(e) = \frac{\alpha}{\alpha + \beta} \in (0, 1]$.

Ruas bridges Bayesian probability and graph theory via the negative log-likelihood mapping:
$$w(e) = -\ln(p(e)) \ge 0$$

Minimizing cumulative Dijkstra resistance:
$$\min \sum_{i=1}^n w(e_i) = \min \sum_{i=1}^n -\ln(p(e_i)) \iff \max \prod_{i=1}^n p(e_i)$$

This **proves mathematically** that Dijkstra's shortest path finds the trajectory with the **highest joint Bayesian confidence**, rather than merely the fewest raw hops.

### 2. Binary Min-Priority Queue
Ruas implements an allocation-free binary min-heap with $O(\log V)$ insertions and extractions, operating at sub-millisecond latencies across hundreds of thousands of code nodes.

### 3. Yen's Top-K Shortest Paths
Beyond the primary path, Ruas uses Yen's algorithm to discover alternative architectural call flows (e.g., fallback payment gateways or alternative error handling branches).
```bash
ruas path handlePayment chargeGateway -k 3
```

### 4. Single-Source Shortest Path (SSSP) Dijkstra Horizon
By computing Dijkstra distances to all reachable downstream nodes, Ruas establishes an exact **confidence decay horizon**, showing developers the true blast radius before cumulative confidence decays to near-zero.
```bash
ruas trace prosesQRIS --dijkstra --depth 3
```

---

## 🧠 Vibe Coding Memory & AI Mother Tongue Dialect (`RUAS_CONTEXT.md`)

When developers "vibe code" with AI coding partners (Cursor, Claude Desktop, Antigravity, Cline, Aider), the biggest bottlenecks are **context window amnesia** and **token exhaustion**. Standard tools feed AI raw files with tons of boilerplate implementation fluff, wasting thousands of tokens and causing models to hallucinate.

Ruas introduces a native **AI Mother Tongue Dialect**:
1. **High Shannon Entropy Format:** Strips verbose syntactic boilerplate, preserving only exact AST signatures, line spans, doc annotations, and Bayesian dependency edges.
2. **Persistent Vibe Memory:** AI and developers can checkpoint session intent, active files, and architectural invariants (`ruas vibe save` or MCP `save_context`).
3. **Single Ground Truth File (`RUAS_CONTEXT.md`):** Automatically written to the project root and `.ruas/memory/latest.md`. An incoming AI agent or new session reads this file first and instantly understands the whole codebase without rescanning.

```bash
# Checkpoint current task and rules
ruas vibe save "Refactor payment flow to dynamic QRIS" -f src/checkout.ts -n "Keep settlement atomic"

# Recall latest working memory
ruas vibe recall

# Sync and regenerate RUAS_CONTEXT.md
ruas vibe sync
```

---

## 🤖 AI Agent Integration (MCP Protocol)

Ruas provides a native `@modelcontextprotocol/sdk` stdio server exposing **7 state-of-the-art tools** designed specifically for autonomous AI agents:

### 1. `ask_code`
Searches code symbols using calibrated multilingual graph retrieval with bounded context payloads.
- **Inputs:** `query` (string), `limit` (number), `tokenBudget` (default 4000), `roast` (boolean).
- **Outputs:** Ranked symbols, exact line spans, signatures, doc comments, and technical debt assessment.

### 2. `trace_impact`
Traces the full blast radius and call chain of any function, method, or class.
- **Inputs:** `symbol` (string), `direction` ("inbound" | "outbound" | "both"), `depth` (number).
- **Outputs:** Dependent callers, callees, Bayesian edge probabilities with 95% Credible Intervals, and breaking change risk score (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`).

### 3. `analyze_architecture`
Performs whole-codebase architectural health analysis, detects circular dependency cycles, flags unreferenced dead code (orphans), and calculates Robert C. Martin package coupling metrics.
- **Inputs:** `includeCycles` (boolean), `includeOrphans` (boolean), `includeCoupling` (boolean).
- **Outputs:** Health score (0-100), letter grade, circular cycle chains, dead code list, and subsystem instability ($I$).

### 4. `find_path`
Finds the shortest directed call and dependency path between any two symbols with step-by-step Bayesian posterior confidence.
- **Inputs:** `fromSymbol` (string), `toSymbol` (string).
- **Outputs:** Origin, destination, hop count, path chain with edge kinds, and cumulative probability.

### 5. `project_overview`
High-level architectural summary of the codebase.
- **Outputs:** File counts, language breakdown, AST node counts, and top 10 central hubs (symbols with highest in-degree / dependents).

### 6. `save_context` (Vibe Memory Checkpoint)
Enables AI coding agents to persist their working memory, active files, architectural invariants, and pending tasks during vibe coding. Automatically writes `RUAS_CONTEXT.md` in the project root.
- **Inputs:** `intent` (string), `activeFiles` (string[]), `architecturalNotes` (string), `pendingDecisions` (string[]), `sessionTag` (string).
- **Outputs:** Checkpoint confirmation and synced file locations.

### 7. `recall_context` (LLM Amnesia Prevention)
Restores previously checkpointed vibe coding memory and working state in the AI-Native mother tongue format, preventing context window truncation and drift.
- **Inputs:** `includeFullManifest` (boolean), `sessionLimit` (number).
- **Outputs:** Active intent, open tasks, invariants, and token-dense AST signatures.

### Connecting to Claude Desktop / Cursor

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ruas": {
      "command": "node",
      "args": ["/path/to/ruas/packages/cli/dist/index.js", "mcp", "/path/to/your/project"]
    }
  }
}
```

---

## 🔬 Benchmark & Statistical Rigor

Ruas includes a reproducible evaluation harness in `@ruas/eval` benchmarked against hand-labeled bilingual queries across TypeScript and PHP:

| Variant / Configuration | Recall@1 | Recall@5 | MRR | nDCG@10 | p95 Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Baseline: FTS5 BM25 Only** | 0.6111 | 0.7556 | 0.6852 | 0.7024 | 1.29 ms |
| **Variant B: BM25 + Glossary** | 0.7444 | 0.8889 | 0.8222 | 0.8432 | 1.24 ms |
| **Variant C: BM25 + Glossary + Stemming** | **0.7667** | **0.8889** | **0.8370** | **0.8543** | 1.83 ms |
| **Full Pipeline: BM25 + Trigram + Glossary + Stemming + PPR + RRF** | 0.7000 | **0.8889** | 0.8037 | 0.8297 | 8.29 ms |

- **Recall@5 Lift over raw BM25:** **+17.6%**
- **Paired Wilcoxon Signed-Rank Test:** $p = 0.0383$ ($p < 0.05$ statistically significant).
- **Incremental Correctness Invariant:** $\text{Graph}(\text{Incremental}) \equiv \text{Graph}(\text{Cold Rebuild})$ verified across continuous edits, additions, and deletions.

---

## 📜 Clean Room Compliance & Licensing

- **Clean-room implementation:** All algorithms (Nazief-Adriani stemmer, BM25 ranking, Personalized PageRank, Beta credible interval, Merkle dirty-set) were derived directly from academic publications without inspecting proprietary or GPL source code.
- **Permissive licenses only:** Ruas and all transitive runtime dependencies are licensed under permissive licenses (MIT / Apache-2.0 / BSD-3-Clause / CC0).
- See [docs/CLEANROOM.md](docs/CLEANROOM.md) and [THIRD_PARTY.md](THIRD_PARTY.md).

---

## 📄 License

MIT © 2026 Ghani & Ruas Contributors.
