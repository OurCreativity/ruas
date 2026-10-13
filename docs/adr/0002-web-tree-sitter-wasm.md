# ADR-0002: AST Parsing Engine via WebAssembly (web-tree-sitter)

## Status
Accepted

## Context
Code intelligence requires exact, error-tolerant AST parsing across diverse languages (TypeScript, JavaScript, TSX, JSX, and PHP). End-user machines range from macOS ARM64 to Linux x64 and Windows, frequently lacking C++ compilers, `node-gyp`, or Python environments.

## Alternatives
1. **Native Node bindings (`node-tree-sitter`):** Requires native compilation (`node-gyp`). Fails frequently on fresh user machines without Xcode CLI tools or build-essential.
2. **TypeScript Compiler API (`ts.createSourceFile`):** Highly capable for TypeScript/JavaScript, but completely incapable of parsing PHP.
3. **`web-tree-sitter` (WASM):** Tree-sitter compiled to WebAssembly via Emscripten, accompanied by pre-compiled language `.wasm` grammars.

## Decision
We adopt **`web-tree-sitter` with vendored WebAssembly grammars**.

## Consequences
- Guaranteed zero-install compilation on any machine running Node $\ge 22$.
- Parse throughput is slightly slower than native C bindings (~1.5x) but easily satisfies our target of 5,000 files in $\le 60$ seconds.
- Memory handles must be manually released when parsing thousands of files in batch to prevent Emscripten heap fragmentation.
