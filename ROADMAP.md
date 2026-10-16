# Ruas Roadmap & Tech-Lead Review Backlog

Status legend: ✅ done · 🔜 next · 💡 idea. Items 1–2 of the original review (CI + community docs) are done.

## ✅ Done
1. **CI hardening** — typecheck, OS matrix (Linux/macOS/Windows), coverage job, advisory self-lint (`ruas check --strict`).
2. **Community files** — SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md, PR template.

## 🔜 Backlog (priority order)
### 3. More languages
Go, Java, Rust, C#. Add extractors under `packages/parser/src/extractors/` + grammar in `grammar-loader.ts` (pattern: `python-extractor.ts`). Done when: extractor, fixture, parser test.

### 4. Bigger, fairer benchmark
Current set is ~90 hand-labeled queries over TS+PHP. Full pipeline (R@1 0.70) is *below* "BM25+Glossary+Stemming" (0.767), so PPR+RRF is unproven. Expand dataset (incl. Python, more repos), tune RRF/PPR weights, report per-language results, or document the latency/recall trade-off honestly.

### 5. Repo hygiene
Move `test-project/`, root `RUAS_CONTEXT.md`, and `docs/graph.*` into `examples/` or generate them in CI; stale generated artifacts mislead readers. `RUAS_CONTEXT.md` currently records a foreign `project_root`.

### 6. Distribution
Package scope `@fk0u/ruas` vs org `OurCreativity` — decide on one name. Node ≥ 22 (`node:sqlite`) limits users: add `better-sqlite3` fallback or state requirement prominently. Add release automation (changesets / release-please).

### 7. MCP polish
Config snippets for Cursor, Claude Code, Cline, Windsurf. End-to-end MCP integration test (spawn server, call every tool). Version the tool schemas.

### 8. Credibility & visuals
Replace hype wording ("Merciless", "state-of-the-art", "proves mathematically") with numbers and demos. Add terminal GIF (vhs/asciinema), `ruas ui` screenshot, and `assets/banner.png` (prompt in `docs/BANNER_PROMPT.md`).

### 9. CI follow-ups
Configure a coverage provider + threshold and make the coverage job blocking; make the self-lint gate blocking once a purity baseline is set.
