import Parser from "web-tree-sitter";
import type { SupportedLanguage } from "@ruas/core";
import { GrammarLoader } from "./grammar-loader.js";
import {
  type ExtractorResult,
  TypeScriptExtractor,
} from "./extractors/ts-extractor.js";

export class CodeParser {
  private parser: Parser | null = null;

  public async init(): Promise<void> {
    if (!this.parser) {
      await GrammarLoader.init();
      this.parser = new Parser();
    }
  }

  public async parseFile(
    filePath: string,
    content: string,
    lang: SupportedLanguage,
  ): Promise<ExtractorResult> {
    await this.init();
    if (!this.parser) {
      throw new Error("Parser initialization failed.");
    }

    const language = await GrammarLoader.getLanguage(lang);
    this.parser.setLanguage(language);

    const tree = this.parser.parse(content);
    try {
      switch (lang) {
        case "typescript":
        case "tsx":
        case "javascript":
        case "jsx": {
          const extractor = new TypeScriptExtractor(filePath);
          return extractor.extract(tree, content);
        }
        case "php": {
          // In Milestone 1, placeholder for PHP structure fallback:
          // Returns the root file node; full PHP extractor is Milestone 2 deliverable
          const extractor = new TypeScriptExtractor(filePath);
          return extractor.extract(tree, content);
        }
      }
    } finally {
      // Explicitly delete tree to prevent Emscripten WASM heap leaks
      tree.delete();
    }
  }
}
