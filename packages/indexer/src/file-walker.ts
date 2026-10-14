import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import fg from "fast-glob";
import ignore from "ignore";
import { type SupportedLanguage, normalizePath } from "@ruas/core";

export interface WalkedFile {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly lang: SupportedLanguage;
  readonly size: number;
  readonly mtime: number;
}

export interface FileWalkerOptions {
  readonly rootDir: string;
  readonly maxFileSize?: number | undefined; // default 1MB
  readonly customIgnores?: readonly string[] | undefined;
}

export class FileWalker {
  private readonly rootDir: string;
  private readonly maxFileSize: number;
  private readonly ig: ReturnType<typeof ignore>;

  constructor(options: FileWalkerOptions) {
    this.rootDir = resolve(options.rootDir);
    this.maxFileSize = options.maxFileSize ?? 1024 * 1024;
    this.ig = ignore();

    // Default system ignores
    this.ig.add([
      "node_modules",
      "node_modules/**",
      "**/node_modules/**",
      ".git",
      ".git/**",
      "**/.git/**",
      "dist",
      "dist/**",
      "**/dist/**",
      "build",
      "build/**",
      "**/build/**",
      "vendor",
      "vendor/**",
      "**/vendor/**",
      ".ruas",
      ".ruas/**",
      "**/.ruas/**",
      "coverage",
      "coverage/**",
      "**/coverage/**",
      "**/*.min.js",
      "**/*.bundle.js",
    ]);

    // Load .gitignore if present in rootDir
    const gitignorePath = join(this.rootDir, ".gitignore");
    if (existsSync(gitignorePath)) {
      try {
        const content = readFileSync(gitignorePath, "utf-8");
        this.ig.add(content);
      } catch {
        // Fall back gracefully if unreadable
      }
    }

    // Custom user ignores
    if (options.customIgnores && options.customIgnores.length > 0) {
      this.ig.add(options.customIgnores as string[]);
    }
  }

  public async walk(): Promise<readonly WalkedFile[]> {
    const patterns = [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.mjs",
      "**/*.cjs",
      "**/*.php",
    ];

    const defaultGlobIgnores = [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/vendor/**",
      "**/.ruas/**",
      "**/coverage/**",
      "**/*.min.js",
      "**/*.bundle.js",
    ];

    const entries = await fg(patterns, {
      cwd: this.rootDir,
      absolute: true,
      dot: false,
      followSymbolicLinks: false,
      onlyFiles: true,
      ignore: defaultGlobIgnores,
    });

    const results: WalkedFile[] = [];

    for (const absPath of entries) {
      const relPath = normalizePath(relative(this.rootDir, absPath));

      // Check ignore rules
      if (this.ig.ignores(relPath)) {
        continue;
      }

      try {
        const stat = statSync(absPath);
        if (stat.size > this.maxFileSize) {
          continue;
        }

        const lang = this.detectLanguage(relPath);
        if (!lang) {
          continue;
        }

        results.push({
          absolutePath: absPath,
          relativePath: relPath,
          lang,
          size: stat.size,
          mtime: Math.floor(stat.mtimeMs),
        });
      } catch {
        // Skip unreadable files
        continue;
      }
    }

    return results;
  }

  public detectLanguage(filePath: string): SupportedLanguage | null {
    const ext = filePath.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
        return "typescript";
      case "tsx":
        return "tsx";
      case "js":
      case "mjs":
      case "cjs":
        return "javascript";
      case "jsx":
        return "jsx";
      case "php":
        return "php";
      default:
        return null;
    }
  }
}
