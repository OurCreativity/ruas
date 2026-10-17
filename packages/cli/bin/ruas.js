#!/usr/bin/env node

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(
    `\x1b[31m✖ Error: Ruas requires Node.js >= 22.0.0 (detected ${process.versions.node}).\x1b[0m\n\n` +
      `  Ruas leverages Node's high-performance native SQLite engine (node:sqlite) for\n` +
      `  zero-compilation, zero-native-addon graph storage.\n\n` +
      `  Please upgrade to Node.js >= 22:\n` +
      `    nvm install 22 && nvm use 22\n` +
      `    # or: fnm install 22 && fnm use 22\n`,
  );
  process.exit(1);
}

import("../dist/index.js");
