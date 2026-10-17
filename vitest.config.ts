import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "**/__tests__/**",
        "**/dist/**",
        "**/bin/**",
        "**/*.d.ts",
        "packages/eval/**",
        "packages/cli/src/index.ts", // CLI entrypoint covered by e2e child process test suite
      ],
      thresholds: {
        lines: 75,
        functions: 80,
        branches: 60,
        statements: 75,
      },
    },
  },
});
