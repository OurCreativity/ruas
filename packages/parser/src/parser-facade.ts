import Parser from "web-tree-sitter";
import type { SupportedLanguage } from "@ruas/core";
import { GrammarLoader } from "./grammar-loader.js";
import {
  type ExtractorResult,
  TypeScriptExtractor,
} from "./extractors/ts-extractor.js";
import { PhpExtractor } from "./extractors/php-extractor.js";
import { PythonExtractor } from "./extractors/python-extractor.js";
import { GoExtractor } from "./extractors/go-extractor.js";
import { RustExtractor } from "./extractors/rust-extractor.js";
import { JavaExtractor } from "./extractors/java-extractor.js";
import { CSharpExtractor } from "./extractors/csharp-extractor.js";

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
          const extractor = new PhpExtractor(filePath);
          return extractor.extract(tree, content);
        }
        case "python": {
          const extractor = new PythonExtractor(filePath);
          return extractor.extract(tree, content);
        }
        case "go": {
          const extractor = new GoExtractor(filePath);
          return extractor.extract(tree, content);
        }
        case "rust": {
          const extractor = new RustExtractor(filePath);
          return extractor.extract(tree, content);
        }
        case "java": {
          const extractor = new JavaExtractor(filePath);
          return extractor.extract(tree, content);
        }
        case "csharp": {
          const extractor = new CSharpExtractor(filePath);
          return extractor.extract(tree, content);
        }
      }
    } finally {
      // Explicitly delete tree to prevent Emscripten WASM heap leaks
      tree.delete();
    }
  }
}
