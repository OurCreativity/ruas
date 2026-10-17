# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [1.4.0] - 2026-10-17
### Added
- **4 New Languages**: Full AST extraction for Go, Rust, Java, and C# via Tree-sitter WASM (`packages/parser/src/extractors/`).
- **Expanded Multilingual Benchmark**: 90 hand-labeled queries across TS, PHP, Python, Go, Rust, Java; verified Full Graph Pipeline superiority (Recall@1 0.843, Recall@5 0.956, MRR 0.917, Wilcoxon $p = 3.51 \times 10^{-3} < 0.05$).
- **5 Extended Architecture Presets**: Clean Architecture, Hexagonal (Ports & Adapters), Onion, Feature-Sliced Design (FSD), and Modular Monolith via `--preset <name>` in `ruas lint` and `ruas check`.
- **Node.js >= 22 Preflight Wrapper**: `packages/cli/bin/ruas.js` with clear diagnostics for native `node:sqlite`.
- **Real Stdio MCP Integration Suite**: Comprehensive end-to-end testing of all 8 MCP tools over live JSON-RPC stdio subprocess transport.
- **Client Configuration Snippets**: Ready-to-use MCP configs in `examples/mcp-configs/` for Cursor, Claude Code, Claude Desktop, Cline, and Windsurf.
- **V8 Coverage & Blocking CI Gates**: 86.9% line coverage with strict blocking thresholds and 100/100 architecture purity gate in CI.
- **Visuals & VHS Demo**: Official 4:1 banner (`assets/banner.png`), UI screenshot (`assets/ui-screenshot.png`), and terminal recording script (`docs/demo.tape`).
- **Repo Hygiene & .ruasignore**: Relocated sample playgrounds and graph exports to `examples/`; `.ruasignore` support for clean dogfooding.

## [1.3.0]
- Fuzzy Architectural Boundary Linter (`ruas lint` / `ruas check`), MCP `lint_architecture`.

## [1.2.0]
- Systematic fuzzy engine: Mamdani FIS, fuzzy matcher, fuzzy Dijkstra, smell detection, visual fuzzy search.

## [1.0.0]
- Dijkstra / Yen top-K over Bayesian-calibrated call graph.
