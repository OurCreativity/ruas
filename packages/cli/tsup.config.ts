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
  async onSuccess() {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const f = path.resolve("dist/index.js");
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, "utf8");
      fs.writeFileSync(f, content.replace(/from "sqlite"/g, 'from "node:sqlite"'));
      if (process.platform !== "win32") {
        try {
          fs.chmodSync(f, 0o755);
        } catch {
          // ignore chmod errors on unsupported filesystems
        }
      }
    }
  },
});
