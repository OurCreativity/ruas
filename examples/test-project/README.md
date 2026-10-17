# Polyglot Playground Example (`test-project`)

This directory contains a sample polyglot codebase demonstrating Ruas's multilingual AST extraction, cross-file symbol resolution, and vibe coding context generation.

## Languages Included
- **TypeScript**: `src/auth.ts`, `src/order.ts`, `src/payment.ts`, `src/discount.ts`
- **PHP**: `legacy/billing.php`
- **Python**: `services/notifier.py`

## Quick Start with Ruas

Index this playground project:
```bash
# From repository root
npx @fk0u/ruas index examples/test-project

# Or using locally linked build
node packages/cli/dist/index.js index examples/test-project
```

Query the index using natural language:
```bash
npx @fk0u/ruas ask "bagaimana alur proses pembayaran QRIS?" examples/test-project
```

Analyze impact blast radius:
```bash
npx @fk0u/ruas trace prosesQRIS examples/test-project
```

Export visual graphs:
```bash
npx @fk0u/ruas export examples/test-project --html examples/graph-exports/graph.html
npx @fk0u/ruas export examples/test-project --mermaid examples/graph-exports/graph.mmd
```

Save vibe memory:
```bash
npx @fk0u/ruas vibe save "Testing polyglot flow" examples/test-project -f src/payment.ts -n "Keep QRIS atomic"
```
