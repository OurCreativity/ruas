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

# Ask code intelligence with emotional damage roast
ruas ask "fungsi bayar qris" --roast
ruas ask "calculate customer discount" --roast

# Start background live file watcher
ruas watch .

# Generate onboarding handover documentation with zero uncited claims
ruas docgen . --out docs/HANDOVER.md

# Launch interactive, glassmorphic visual graph explorer in your browser (60 FPS canvas)
ruas ui . --port 4200

# Export standalone offline HTML graph visualization
ruas export . --html docs/graph.html

# Launch Model Context Protocol (MCP) server for Claude Desktop / Cursor / Antigravity
ruas mcp .
```

---

## 🤖 AI Agent Integration (MCP Protocol)

Ruas provides a native `@modelcontextprotocol/sdk` stdio server exposing 3 tools designed specifically for autonomous AI agents:

### 1. `ask_code`
Searches code symbols using calibrated multilingual graph retrieval with bounded context payloads.
- **Inputs:** `query` (string), `limit` (number), `tokenBudget` (default 4000), `roast` (boolean).
- **Outputs:** Ranked symbols, exact line spans, signatures, doc comments, and technical debt assessment.

### 2. `trace_impact`
Traces the full blast radius and call chain of any function, method, or class.
- **Inputs:** `symbol` (string), `direction` ("inbound" | "outbound" | "both"), `depth` (number).
- **Outputs:** Dependent callers, callees, Bayesian edge probabilities with 95% Credible Intervals, and breaking change risk score (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`).

### 3. `project_overview`
High-level architectural summary of the codebase.
- **Outputs:** File counts, language breakdown, AST node counts, and top 10 central hubs (symbols with highest in-degree / dependents).

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
