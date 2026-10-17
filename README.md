<div align="center">

<!-- Banner: generate with docs/BANNER_PROMPT.md, save as assets/banner.png -->
<img src="assets/banner.png" alt="Ruas — Code intelligence that tells the truth" width="100%">

# 🌿 Ruas

**Offline-first code intelligence for AI agents and humans.**
Multilingual graph retrieval · Bayesian-calibrated blast radius · Fuzzy architecture linting · MCP-native.

[![npm](https://img.shields.io/npm/v/@fk0u/ruas?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/@fk0u/ruas)
[![GitHub Release](https://img.shields.io/github/v/release/OurCreativity/ruas?style=for-the-badge&logo=github&color=2563EB&label=Release)](https://github.com/OurCreativity/ruas/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/OurCreativity/ruas/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI)](https://github.com/OurCreativity/ruas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL%20%2B%20FTS5-003B57?logo=sqlite&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-8%20tools-7C3AED)
![Tests](https://img.shields.io/badge/tests-121%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-86.9%25%20V8-success)
![Offline](https://img.shields.io/badge/cloud%20APIs-zero-orange)
![Languages](https://img.shields.io/badge/languages-TS%20%C2%B7%20JS%20%C2%B7%20PHP%20%C2%B7%20Python%20%C2%B7%20Go%20%C2%B7%20Rust%20%C2%B7%20Java%20%C2%B7%20C%23-informational)
![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)

[Installation](#-installation--quick-start) · [Latest Release](https://github.com/OurCreativity/ruas/releases/latest) · [How it works](#-how-it-works) · [CLI](#-cli-cheat-sheet) · [MCP](#-mcp-for-ai-agents) · [Benchmarks](#-benchmarks) · [Contributing](CONTRIBUTING.md)

</div>

---

## 📢 Latest Release: [v1.4.0](https://github.com/OurCreativity/ruas/releases/tag/v1.4.0)

> **Universal Code Intelligence across 8 Languages with Extended Presets & Stdio MCP**
> - **4 New Language Extractors**: Full AST extraction for Go, Rust, Java, and C# via Tree-sitter WASM.
> - **90-Query Multilingual Benchmark**: Evaluated over TS, PHP, Python, Go, Rust, Java; verified statistical superiority ($p < 0.05$).
> - **5 Extended Architecture Presets**: Clean Architecture, Hexagonal, Onion, Feature-Sliced Design (FSD), and Modular Monolith via `--preset <name>`.
> - **Cross-Platform Stdio MCP**: Tested end-to-end over live subprocess JSON-RPC across Linux, macOS, and Windows.
> - **Interactive 60 FPS Visualizer**: Leiden community clustering and blast radius inspection in `ruas ui`.

---

## ✨ Why Ruas?

Real codebases are messy: mixed Indonesian/English identifiers, acronyms (`pQRIS`, `invGen`), hidden coupling. Generic tools hand your AI agent raw files and let it guess. Ruas gives it a **calibrated graph** instead.

| | Typical tools | **Ruas** |
|---|---|---|
| Search | English-only, embeddings via cloud API | Multilingual BM25 + trigram + glossary + Indonesian stemmer, **fully local** |
| Call paths | "Probably calls…" | Beta-Bernoulli edge confidence with **95% credible intervals** |
| Impact | Hop count | **Blast radius** with confidence decay (Dijkstra / Yen top-K) |
| Architecture | Binary pass/fail rules | **Mamdani fuzzy** violation degrees + purity grade A–F |
| AI memory | Re-scan every session | Persistent `RUAS_CONTEXT.md` "vibe memory" |
| Footprint | Vector DB + API keys | One SQLite file, runs on an 8 GB laptop |

---

## 📦 Installation & Quick Start

### ⚙️ Prerequisites
Ruas uses native high-performance SQLite (`node:sqlite`) with WAL mode and FTS5.
* **Node.js $\ge 22.0.0$** (check via `node -v`)

### ⚡ Method 1: Instant via `npx` (No installation needed)
Run Ruas directly in any repository without installing:
```bash
# Index your repository
npx @fk0u/ruas index .

# Ask anything in natural language (supports English, Indonesian, or mixed slang)
npx @fk0u/ruas ask "fungsi validasi pembayaran qris" --roast

# Inspect blast radius before changing code
npx @fk0u/ruas trace PaymentService . --depth 3
```

### 🌍 Method 2: Global CLI Installation
Install globally to get the permanent `ruas` command:

```bash
# via npm
npm install -g @fk0u/ruas

# via pnpm
pnpm add -g @fk0u/ruas

# via bun
bun add -g @fk0u/ruas
```

Verify your installation:
```bash
ruas --version
# => 1.4.0
```

### 💻 Method 3: From Source (Contributors)
```bash
git clone https://github.com/OurCreativity/ruas.git
cd ruas
pnpm install
pnpm build
pnpm test
```

### 🤖 Method 4: AI Agent / IDE Setup (Model Context Protocol)
Connect Ruas directly to **Cursor**, **Claude Code**, **Claude Desktop**, **Cline**, or **Windsurf**:

Add to your MCP configuration (e.g. `~/.cursor/mcp.json` or `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "ruas": {
      "command": "npx",
      "args": ["-y", "@fk0u/ruas", "mcp", "/absolute/path/to/your/project"]
    }
  }
}
```
*(Pre-configured JSON snippets for every editor are in [`examples/mcp-configs/`](examples/mcp-configs/README.md)).*

---

## 🧩 How it works

```mermaid
flowchart LR
    A[Source files<br/>TS · PHP · Python] -->|tree-sitter WASM| B[Parser]
    B --> C[Resolver<br/>2-pass evidence +<br/>Beta-Bernoulli CI]
    C --> D[(Store<br/>SQLite WAL + FTS5)]
    E[Merkle dirty-set<br/>file watcher] -->|incremental| B
    D --> F[Rank<br/>BM25 + Trigram + PPR + RRF]
    N[NLP<br/>glossary + Nazief-Adriani] --> F
    F --> G[CLI]
    F --> H[MCP server]
    F --> I[Visual UI]
    F --> J[Docgen / Eval]
    style D fill:#003B57,color:#fff
    style H fill:#7C3AED,color:#fff
```

### Query pipeline

```mermaid
sequenceDiagram
    participant U as You / AI agent
    participant N as NLP
    participant R as Rank
    participant S as Store
    U->>N: "fungsi bayar qris"
    N->>N: stem + expand (bayar→payment, qris→QRIS)
    N->>R: expanded terms
    par parallel retrieval
        R->>S: FTS5 BM25
        R->>S: Trigram match
    end
    R->>R: Personalized PageRank over call graph
    R->>R: Reciprocal Rank Fusion
    R-->>U: ranked symbols + spans + confidence (token-budgeted)
```

### Package map

```mermaid
graph TD
    cli["@ruas/cli"] --> mcp["@ruas/mcp"]
    cli --> docgen["@ruas/docgen"]
    cli --> ui["@ruas/ui"]
    cli --> eval["@ruas/eval"]
    mcp --> rank["@ruas/rank"]
    docgen --> rank
    ui --> rank
    eval --> rank
    rank --> resolver["@ruas/resolver"]
    rank --> nlp["@ruas/nlp"]
    rank --> indexer["@ruas/indexer"]
    indexer --> parser["@ruas/parser"]
    resolver --> store["@ruas/store"]
    indexer --> store
    store --> core["@ruas/core"]
    parser --> core
```

---

## 🧮 The math (short version)

Edge confidence `p(e) = α / (α+β)` becomes a non-negative cost so Dijkstra finds the **most probable** path, not merely the shortest:

$$w(e) = -\ln p(e) \quad\Rightarrow\quad \min \sum w(e_i) \iff \max \prod p(e_i)$$

Fuzzy mode multiplies in a Mamdani friction factor `f(e) ∈ [1, 3.5]` so routes avoid fragile hubs.

```mermaid
flowchart LR
    CA[Afferent coupling Ca] --> FIS{{Mamdani FIS<br/>trimf / trapmf}}
    CE[Efferent coupling Ce] --> FIS
    CF[Bayesian confidence] --> FIS
    BR[Blast radius] --> FIS
    FIS --> FFI[Fuzzy Fragility Index 0–100%]
    FFI --> L["Clean · Fair · Fragile · Critical"]
```

---

## 🛠 CLI cheat sheet

| Goal | Command |
|---|---|
| Index (cold or incremental) | `ruas index .` |
| Health & stats | `ruas status .` · `ruas audit . [--fuzzy] [--json]` |
| Ask in any mix of languages | `ruas ask "calculate customer discount" --roast [--fuzzy]` |
| Blast radius | `ruas trace prosesQRIS . --depth 3 [--dijkstra]` |
| Best path A → B | `ruas path checkoutOrder calculateDiscount . [-k 3] [--fuzzy]` |
| Acronym / typo search | `ruas fuzzy pQRIS .` |
| Code smells | `ruas smell . [--json]` |
| Architecture boundaries | `ruas lint --init` → `ruas lint .` → `ruas check . --strict --json` |
| Live watcher | `ruas watch .` |
| Visual explorer (60 FPS) | `ruas ui . --port 4200` |
| Export | `ruas export . --html\|--mermaid\|--dot\|--json <file>` |
| Handover docs (cited) | `ruas docgen . --out docs/HANDOVER.md` |
| AI memory | `ruas vibe save "<intent>" -f <file> -n "<note>"` · `recall` · `sync` |
| MCP server | `ruas mcp .` |

---

## 🎨 Interactive Graph Visualizer (`ruas ui`)

Explore software architecture visually with local 60 FPS Cytoscape.js rendering, Leiden community detection, and real-time blast radius inspection:

```bash
ruas ui . --port 4200
```

<div align="center">
  <img src="assets/ui-screenshot.png" alt="Ruas Interactive Code Intelligence Visualizer" width="100%">
</div>

---

## 🏗 Architecture linter

```mermaid
flowchart TB
    subgraph Allowed["✅ Allowed flow"]
        direction TB
        P[Presentation] --> A[Application] --> D[Domain]
        I[Infrastructure] --> A
    end
    D -.->|❌ violation μ=0.92| I
    style D fill:#16a34a,color:#fff
    style I fill:#dc2626,color:#fff
```

Violations carry a **continuous degree μ ∈ [0,1]**, rolled into a purity score and grade. Use `ruas check . --strict` as a CI gate (fails at purity < 80 or any critical violation).

---

## 🤖 MCP for AI agents

Ready-to-use client configurations for **Cursor**, **Claude Code / Desktop**, **Cline**, and **Windsurf** are available in [`examples/mcp-configs/`](examples/mcp-configs/README.md).

```json
{
  "mcpServers": {
    "ruas": {
      "command": "npx",
      "args": ["-y", "@fk0u/ruas", "mcp", "/path/to/your/project"]
    }
  }
}
```

| Tool | What the agent gets |
|---|---|
| `ask_code` | Ranked symbols, spans, signatures within a **token budget** |
| `trace_impact` | Callers/callees, edge probabilities + 95% CI, risk `LOW→CRITICAL` |
| `analyze_architecture` | Health score, cycles, dead code, instability per subsystem |
| `find_path` | Highest-confidence call path between two symbols |
| `project_overview` | Language mix, node counts, top-10 hubs |
| `lint_architecture` | Purity score + fuzzy-ranked boundary violations |
| `save_context` / `recall_context` | Persistent working memory → `RUAS_CONTEXT.md` |

```mermaid
sequenceDiagram
    participant Agent
    participant Ruas as Ruas MCP
    Agent->>Ruas: recall_context
    Ruas-->>Agent: intent, invariants, signatures
    Agent->>Ruas: trace_impact(processPayment)
    Ruas-->>Agent: risk HIGH, 7 callers, p=0.91 [0.84–0.96]
    Agent->>Ruas: lint_architecture
    Ruas-->>Agent: purity 86 (B), 1 violation
    Agent->>Ruas: save_context
```

---

## 🔬 Benchmarks

Evaluated over **90 hand-labeled multilingual queries** (Indonesian, English, colloquial mixed slang) across 6 languages (TypeScript, PHP, Python, Go, Rust, Java), reproducible via `@ruas/eval`:

```mermaid
xychart-beta
    title "Recall@5 / MRR across 90 Multilingual Queries"
    x-axis ["BM25", "+Glossary", "+Stemming", "Full (PPR+RRF)"]
    y-axis "score" 0.70 --> 1.0
    bar [0.8722, 0.9389, 0.9389, 0.9556]
    line [0.8287, 0.8979, 0.8997, 0.9167]
```

| Variant | R@1 | R@5 | MRR | nDCG@10 | p95 Latency |
|---|:-:|:-:|:-:|:-:|:-:|
| Baseline: FTS5 BM25 Only | 0.761 | 0.872 | 0.829 | 0.840 | 0.60 ms |
| Variant B: + Domain Glossary | 0.828 | 0.939 | 0.898 | 0.910 | 0.61 ms |
| Variant C: + Nazief-Adriani Stemming | 0.828 | 0.939 | 0.900 | 0.911 | 0.72 ms |
| **Full Pipeline (BM25 + Fuzzy + PPR + RRF)** | **0.843** | **0.956** | **0.917** | **0.924** | **10.26 ms** |

**+9.6% Recall@5 over BM25 baseline** · paired Wilcoxon signed-rank test *p* = 3.51e-3 (*p* < 0.05 confirmed) · incremental graph ≡ cold rebuild (verified).  
*Honest trade-off note:* Full graph retrieval introduces a 17.2x p95 latency overhead (10.3ms vs 0.60ms) in exchange for statistically superior cross-language disambiguation.

---

## 🧠 Vibe memory (`RUAS_CONTEXT.md`)

```mermaid
stateDiagram-v2
    [*] --> Coding
    Coding --> Checkpoint: ruas vibe save / save_context
    Checkpoint --> Context: writes RUAS_CONTEXT.md
    Context --> NewSession: agent restarts
    NewSession --> Coding: recall_context (no re-scan)
```

Token-dense format: AST signatures, line spans, invariants and Bayesian edges only — no boilerplate bodies.

---

## 📚 Docs

[Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md) · [Plan](docs/PLAN.md) · [Methodology](docs/METHODOLOGY.md) · [Handover](docs/HANDOVER.md) · [Clean-room](docs/CLEANROOM.md) · [ADRs](docs/adr) · [Third-party](THIRD_PARTY.md)

## 🤝 Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Clean-room rule: derive from papers, never copy GPL/proprietary code.

## 📄 License

MIT © 2026 Al-Ghani Desta Setyawan & Ruas Contributors.
