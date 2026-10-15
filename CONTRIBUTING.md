# Contributing to Ruas

Thank you for your interest in contributing to **Ruas** — the universal, offline-first, statistically calibrated code intelligence engine!

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all contributors. Please be respectful and constructive in all discussions, issues, and code reviews.

---

## Development Workflow

### Prerequisites
- **Node.js**: $\ge 22.0.0$ (Ruas relies on native `node:sqlite`)
- **pnpm**: $\ge 10.0.0$

### Setup
```bash
git clone https://github.com/fk0u/ruas.git
cd ruas
pnpm install
pnpm build
pnpm test
```

---

## Monorepo Architecture

Ruas is organized as a pnpm workspace with strict module boundaries:

| Package | Purpose |
| :--- | :--- |
| [`@ruas/core`](packages/core) | Core domain types, Result<T, E>, Bayesian calibration & ID generators |
| [`@ruas/store`](packages/store) | SQLite + FTS5 full-text storage engine with migrations |
| [`@ruas/nlp`](packages/nlp) | Subword tokenizer, Nazief-Adriani Indonesian stemmer & glossary expander |
| [`@ruas/parser`](packages/parser) | Tree-sitter WASM AST extraction (TypeScript, JavaScript, PHP) |
| [`@ruas/resolver`](packages/resolver) | Cross-file symbol linker with Beta-Bernoulli credible intervals |
| [`@ruas/rank`](packages/rank) | Personalized PageRank, Trigram fuzzy matching, Weighted RRF, Leiden community detection |
| [`@ruas/indexer`](packages/indexer) | Merkle tree repo walker, dirty-set diffing & live recursive file watcher |
| [`@ruas/mcp`](packages/mcp) | Model Context Protocol stdio server (`ask_code`, `trace_impact`, `project_overview`) |
| [`@ruas/docgen`](packages/docgen) | Deterministic onboarding handover docgen with zero uncited claims |
| [`@ruas/ui`](packages/ui) | Interactive 60 FPS glassmorphic canvas visual graph explorer |
| [`@ruas/eval`](packages/eval) | 45-query bilingual ablation benchmark & paired Wilcoxon hypothesis testing |
| [`ruas`](packages/cli) | CLI binary (`ruas index`, `ruas ask`, `ruas mcp`, `ruas watch`, `ruas docgen`, `ruas ui`) |

---

## Git Commit Convention

We adhere to the Conventional Commits specification:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `refactor`: A code change that neither fixes a bug nor adds a feature

---

## Clean-Room Independence

Ruas maintains a strict clean-room implementation policy:
- Strictly no GPL or copyleft licensed code.
- All ranking and partition algorithms are derived from open academic literature (BM25, PageRank, Leiden).
- For details, see [docs/CLEANROOM.md](docs/CLEANROOM.md).
