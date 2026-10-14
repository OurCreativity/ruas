import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  dts: true,
  sourcemap: true,
  // Only bundle internal @ruas workspace packages into the standalone distribution
  noExternal: [/^@ruas\//],
  external: [
    "node:sqlite",
    "commander",
    "picocolors",
    "web-tree-sitter",
    "tree-sitter-wasms",
    "@modelcontextprotocol/sdk",
    "zod",
    "fast-glob",
    "ignore",
    "yaml",
  ],
  onSuccess: "chmod +x dist/index.js && node -e 'const fs=require(\"fs\"); const f=\"dist/index.js\"; fs.writeFileSync(f, fs.readFileSync(f, \"utf8\").replace(/from \"sqlite\"/g, \"from \\\"node:sqlite\\\"\"));'",
});
