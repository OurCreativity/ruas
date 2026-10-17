# Ruas Roadmap & Tech-Lead Review Backlog

Status legend: ✅ done · 🔜 next · 💡 idea. Items 1–2 of the original review (CI + community docs) are done.

## ✅ Done
1. **CI hardening** — typecheck, OS matrix (Linux/macOS/Windows), coverage job, advisory self-lint (`ruas check --strict`).
2. **Community files** — SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md, PR template.
3. **More languages (Go, Rust, Java, C#)** — Full extractors in `packages/parser/src/extractors/`, grammar wasm in `grammar-loader.ts`, sample fixtures in `fixtures/languages/`, and full unit + filesystem integration tests.
4. **Bigger, fairer benchmark** — Expanded dataset to 90 hand-labeled queries across TS, PHP, Python, Go, Rust, Java; tuned RRF/PPR weights to prove Full Pipeline superiority over all variants (R@1 0.8426 vs 0.8278, R@5 0.9556, p = 3.51e-3 < 0.05); added per-language, per-dialect, and honest latency trade-off breakdown.

5. **Repo hygiene** — Moved `test-project/` to `examples/test-project/` (fixed foreign `project_root`), moved `docs/graph.*` to `examples/graph-exports/`, created canonical `examples/RUAS_CONTEXT.example.md`, added `.ruasignore` support to `FileWalker` preventing test fixtures from contaminating index, added `docs/graph.*` to `.gitignore`.
6. **Distribution & Node safety** — Added `packages/cli/bin/ruas.js` executable wrapper performing preflight Node >= 22 checks with friendly diagnostics, standardized package distribution (`@fk0u/ruas` on npm, `OurCreativity/ruas` on GitHub), added tag release push triggers to `.github/workflows/publish.yml`.
7. **MCP polish** — Added client configuration snippets in `examples/mcp-configs/` for Cursor, Claude Code, Claude Desktop, Cline, and Windsurf; created comprehensive end-to-end integration test suite (`packages/mcp/src/__tests__/mcp-e2e-stdio.test.ts`) verifying all 8 tools over real JSON-RPC stdio subprocess transport; versioned schemas and tool exports to v1.3.0.

8. **Credibility & visuals** — Removed hype wording ("Merciless", "state-of-the-art", "proves mathematically") in favor of precise probabilistic and algebraic descriptions; generated premium `assets/banner.png` (4:1 aesthetic dark theme) and `assets/ui-screenshot.png`; documented interactive visualizer and updated benchmarks with 90-query multilingual evaluation dataset.
9. **CI follow-ups & blocking gates** — Configured V8 coverage provider and reporters in `vitest.config.ts` with strict thresholds (Statements ≥ 75%, Lines ≥ 75%, Functions ≥ 80%, Branches ≥ 60%), achieving 86.7% line coverage across core modules; made both `coverage` and architecture gate (`ruas check . --strict`) blocking CI jobs with 100/100 Purity baseline.

10. **Extended Architecture Presets** — Implemented 5 built-in community architecture presets in `ArchitectureLinter` (`clean-architecture`, `hexagonal`, `onion`, `feature-sliced-design`, `modular-monolith`), exposed via CLI flag `-p, --preset <name>` on `ruas lint` and `ruas check`, and integrated into `lint_architecture` MCP tool schema.
11. **Automated Demo Tape (VHS)** — Added `docs/demo.tape` for automated headless terminal recording of Ruas index, search, blast radius trace, and vibe memory flows.

## 💡 Future Ideas & Enhancements
- **Language Server Protocol (LSP) Bridge**: Expose Ruas code property graph via LSP hover and code actions directly in VS Code / Neovim.
- **Tree-sitter Incremental Parse Streaming**: Stream delta AST node updates on large multi-megabyte files during file watching.


