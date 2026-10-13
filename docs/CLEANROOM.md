# Clean-Room Engineering Declaration

This document certifies that **Ruas** (`@ruas/cli` and associated workspace packages) has been developed in strict adherence to clean-room reverse engineering and independent development standards.

---

## 1. Zero Direct Access Commitment
- **No Source Code Access:** No source code, pull requests, commits, branch diffs, internal tests, or documentation from any external closed or reference implementation was opened, viewed, cloned, parsed, copied, translated, or decompiled during the development of this repository.
- **No Prompt or Instruction Leakage:** No agent system instructions, prompt templates, or MCP server prompt texts from external proprietary tools were inspected or utilized.
- **Independent Derivation:** All algorithms (including Beta-Bernoulli conjugate updating, Personalized PageRank, Nazief–Adriani morphological affix stripping, Reciprocal Rank Fusion, Merkle directory hashing, and AST visitor extractors) are derived from published academic literature, standard mathematical definitions, or first principles.

---

## 2. Permitted Reference Literature
1. **Nazief, B., & Adriani, M. (1996).** *Confix-stripping approach to stemming for a morphological rich language (Indonesian).*
2. **Page, L., Brin, S., Motwani, R., & Winograd, T. (1999).** *The PageRank Citation Ranking: Bringing Order to the Web.* Stanford InfoLab.
3. **Cormack, G. V., Clarke, C. L., & Buettcher, S. (2009).** *Reciprocal rank fusion outperforms condorcet and individual rank learning methods.* Proceedings of the 32nd international ACM SIGIR conference.
4. **Robertson, S., & Zaragoza, H. (2009).** *The Probabilistic Relevance Framework: BM25 and Beyond.* Foundations and Trends in Information Retrieval.
5. **Merkle, R. C. (1987).** *A digital signature based on a conventional encryption function.* CRYPTO '87.
6. **Model Context Protocol (MCP) Specification.** *Open protocol specification published by Anthropic PBC.*

---

## 3. Clean-Room Checklist Sign-Off
- [x] Independent package naming (no usage of restricted terms "graphify" or "codegraph").
- [x] Clean-room AST extraction based solely on standard tree-sitter grammar node types.
- [x] Zero network telemetry or phone-home code.
- [x] Clean-room third-party licensing verification (MIT / Apache-2.0 / BSD / ISC / Unlicense only).
