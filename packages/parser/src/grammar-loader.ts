import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import Parser from "web-tree-sitter";
import type { SupportedLanguage } from "@ruas/core";

export class GrammarLoader {
  private static isInitialized = false;
  private static languageCache = new Map<SupportedLanguage, Parser.Language>();
  private static wasmOutDir: string | null = null;

  public static async init(): Promise<void> {
    if (!GrammarLoader.isInitialized) {
      await Parser.init();
      GrammarLoader.isInitialized = true;
    }
  }

  private static getWasmDir(): string {
    if (GrammarLoader.wasmOutDir) {
      return GrammarLoader.wasmOutDir;
    }
    const req = createRequire(import.meta.url);
    const wasmsPkgPath = req.resolve("tree-sitter-wasms/package.json");
    GrammarLoader.wasmOutDir = join(dirname(wasmsPkgPath), "out");
    return GrammarLoader.wasmOutDir;
  }

  public static async getLanguage(lang: SupportedLanguage): Promise<Parser.Language> {
    await GrammarLoader.init();

    const cached = GrammarLoader.languageCache.get(lang);
    if (cached) {
      return cached;
    }

    const wasmDir = GrammarLoader.getWasmDir();
    let wasmFileName: string;

    switch (lang) {
      case "typescript":
        wasmFileName = "tree-sitter-typescript.wasm";
        break;
      case "tsx":
        wasmFileName = "tree-sitter-tsx.wasm";
        break;
      case "javascript":
      case "jsx":
        wasmFileName = "tree-sitter-javascript.wasm";
        break;
      case "php":
        wasmFileName = "tree-sitter-php.wasm";
        break;
      default: {
        const exhaustiveCheck: never = lang;
        throw new Error(`Unsupported language for tree-sitter: ${String(exhaustiveCheck)}`);
      }
    }

    const wasmFilePath = join(wasmDir, wasmFileName);
    const language = await Parser.Language.load(wasmFilePath);
    GrammarLoader.languageCache.set(lang, language);
    return language;
  }
}
