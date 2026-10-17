# Model Context Protocol (MCP) Client Configurations

Ruas exposes a standard Model Context Protocol (MCP) server over `stdio` allowing AI coding assistants to query the code property graph, calculate blast radius, find shortest call paths, and recall vibe memory in real-time.

> **Prerequisite:** Make sure Node.js >= 22 is installed (`node -v`).

---

## 1. Cursor (`.cursor/mcp.json`)

Create or update `.cursor/mcp.json` in your project root or globally in `~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp.json`:

```json
{
  "mcpServers": {
    "ruas": {
      "command": "npx",
      "args": ["-y", "@fk0u/ruas", "mcp", "${workspaceFolder}"]
    }
  }
}
```

---

## 2. Claude Desktop (`claude_desktop_config.json`)

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`  
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ruas": {
      "command": "npx",
      "args": ["-y", "@fk0u/ruas", "mcp", "/ABSOLUTE/PATH/TO/YOUR/PROJECT"]
    }
  }
}
```

---

## 3. Claude Code CLI

You can register Ruas directly using Claude Code's MCP command:

```bash
claude mcp add ruas -- npx -y @fk0u/ruas mcp /ABSOLUTE/PATH/TO/YOUR/PROJECT
```

---

## 4. Cline (VS Code Extension)

Add to `cline_mcp_settings.json` (accessible via Cline Settings -> MCP Servers):

```json
{
  "mcpServers": {
    "ruas": {
      "command": "npx",
      "args": ["-y", "@fk0u/ruas", "mcp", "/ABSOLUTE/PATH/TO/YOUR/PROJECT"],
      "disabled": false,
      "autoApprove": [
        "ask_code",
        "trace_impact",
        "find_path",
        "project_overview",
        "analyze_architecture",
        "lint_architecture",
        "recall_context"
      ]
    }
  }
}
```

---

## 5. Windsurf (`mcp_config.json`)

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "ruas": {
      "command": "npx",
      "args": ["-y", "@fk0u/ruas", "mcp", "${workspaceFolder}"]
    }
  }
}
```

---

## Available MCP Tools in Ruas

| Tool | Description |
| :--- | :--- |
| `ask_code` | Semantic natural-language retrieval with reciprocal rank fusion (BM25 + Fuzzy + PPR). |
| `trace_impact` | Bayesian blast radius calculation and transitive caller analysis. |
| `find_path` | Exact shortest path traversal between two symbols via Dijkstra. |
| `project_overview` | High-level summary of languages, central hub symbols, and node/edge totals. |
| `analyze_architecture` | Layer violation detection, circular dependency cycles, and god-node audit. |
| `lint_architecture` | Rule-based architecture verification against user or preset rules. |
| `save_context` | Checkpoints active vibe memory and regenerates `RUAS_CONTEXT.md`. |
| `recall_context` | Restores the latest vibe coding memory checkpoint for agent continuity. |
