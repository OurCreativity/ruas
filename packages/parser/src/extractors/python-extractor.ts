import type Parser from "web-tree-sitter";
import {
  type EdgeRecord,
  type NodeRecord,
  type UnresolvedRefRecord,
  createEdgeId,
  createFileId,
  createNodeId,
  normalizePath,
} from "@ruas/core";
import { splitIdentifierTokens } from "../utils/tokenizer.js";
import type { ExtractorResult } from "./ts-extractor.js";

export class PythonExtractor {
  private readonly filePath: string;
  private readonly fileId: string;
  private readonly nodes: NodeRecord[] = [];
  private readonly edges: EdgeRecord[] = [];
  private readonly unresolvedRefs: UnresolvedRefRecord[] = [];

  constructor(filePath: string) {
    this.filePath = normalizePath(filePath);
    this.fileId = createFileId(this.filePath);
  }

  public extract(tree: Parser.Tree, sourceContent: string): ExtractorResult {
    const lines = sourceContent.split("\n");
    const totalLines = lines.length;

    // 1. Root File Node
    const fileTokens = splitIdentifierTokens(this.filePath).join(" ");
    const fileNodeId = createNodeId(this.filePath, this.filePath, "file");
    const fileNode: NodeRecord = {
      id: fileNodeId,
      fileId: this.fileId,
      kind: "file",
      name: this.filePath.split("/").pop() ?? this.filePath,
      qualifiedName: this.filePath,
      startLine: 1,
      endLine: Math.max(1, totalLines),
      signature: null,
      docComment: null,
      tokens: fileTokens,
    };
    this.nodes.push(fileNode);

    // 2. Walk Tree
    this.visitNode(tree.rootNode, fileNodeId, null, null);

    return {
      nodes: this.nodes,
      edges: this.edges,
      unresolvedRefs: this.unresolvedRefs,
    };
  }

  private visitNode(
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingClassName: string | null,
    decorators: string[] | null,
  ): void {
    let nextParentId = currentParentId;
    let nextClassName = enclosingClassName;

    switch (node.type) {
      case "decorated_definition": {
        // Collect decorators (e.g., @app.get("/api/v1/payment"))
        const collectedDecorators: string[] = [];
        let definitionNode: Parser.SyntaxNode | null = null;

        for (let i = 0; i < node.namedChildCount; i++) {
          const child = node.namedChild(i);
          if (!child) continue;
          if (child.type === "decorator") {
            collectedDecorators.push(child.text.trim());
          } else {
            definitionNode = child;
          }
        }

        if (definitionNode) {
          this.visitNode(definitionNode, currentParentId, enclosingClassName, collectedDecorators);
        }
        return;
      }

      case "function_definition": {
        const extracted = this.extractFunction(node, enclosingClassName, decorators);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
        }
        break;
      }

      case "class_definition": {
        const extracted = this.extractClass(node, enclosingClassName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextClassName = extracted.name;
        }
        break;
      }

      case "import_statement":
      case "import_from_statement": {
        this.extractImport(node, currentParentId);
        break;
      }

      case "call": {
        this.extractCall(node, currentParentId);
        break;
      }
    }

    // Recurse into children
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        this.visitNode(child, nextParentId, nextClassName, null);
      }
    }
  }

  private extractFunction(
    node: Parser.SyntaxNode,
    enclosingClassName: string | null,
    decorators: string[] | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const funcName = nameNode.text;
    const isMethod = enclosingClassName !== null;
    const qualifiedName = isMethod
      ? `${this.filePath}:${enclosingClassName}.${funcName}`
      : `${this.filePath}:${funcName}`;

    // Detect if this is an API route (e.g. FastAPI / Flask decorator)
    const isRoute = decorators?.some((d) =>
      /@(app|router|bp|blueprint|api)\.(get|post|put|delete|patch|route)/i.test(d),
    );
    const kind = isRoute ? "route" : isMethod ? "method" : "function";

    // Extract signature
    const paramsNode = node.childForFieldName("parameters");
    const returnTypeNode = node.childForFieldName("return_type");
    let signature = `def ${funcName}${paramsNode ? paramsNode.text : "()"}`;
    if (returnTypeNode) {
      signature += ` -> ${returnTypeNode.text}`;
    }

    // Extract docstring from function body
    const docComment = this.extractDocstring(node.childForFieldName("body"));

    const tokens = [
      ...splitIdentifierTokens(funcName),
      ...(enclosingClassName ? splitIdentifierTokens(enclosingClassName) : []),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
      ...(decorators ?? []).flatMap((d) => splitIdentifierTokens(d)),
    ].join(" ");

    return {
      id: createNodeId(this.filePath, qualifiedName, kind),
      fileId: this.fileId,
      kind,
      name: funcName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature,
      docComment,
      tokens,
    };
  }

  private extractClass(
    node: Parser.SyntaxNode,
    enclosingClassName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const className = nameNode.text;
    const qualifiedName = enclosingClassName
      ? `${this.filePath}:${enclosingClassName}.${className}`
      : `${this.filePath}:${className}`;

    const docComment = this.extractDocstring(node.childForFieldName("body"));

    // Extract superclasses (inheritance)
    const superclassesNode = node.childForFieldName("superclasses");
    let signature = `class ${className}`;
    if (superclassesNode) {
      signature += superclassesNode.text;
      this.extractSuperclasses(superclassesNode, className);
    }

    const tokens = [
      ...splitIdentifierTokens(className),
      ...(enclosingClassName ? splitIdentifierTokens(enclosingClassName) : []),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    return {
      id: createNodeId(this.filePath, qualifiedName, "class"),
      fileId: this.fileId,
      kind: "class",
      name: className,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature,
      docComment,
      tokens,
    };
  }

  private extractSuperclasses(superclassesNode: Parser.SyntaxNode, className: string): void {
    const classId = createNodeId(this.filePath, `${this.filePath}:${className}`, "class");

    for (let i = 0; i < superclassesNode.namedChildCount; i++) {
      const arg = superclassesNode.namedChild(i);
      if (!arg) continue;
      const superName = arg.text.trim();
      if (superName && superName !== "object") {
        this.unresolvedRefs.push({
          id: `${classId}_extends_${superName}_${arg.startPosition.row + 1}`,
          srcId: classId,
          name: superName,
          kind: "extends",
          fileId: this.fileId,
          line: arg.startPosition.row + 1,
        });
      }
    }
  }

  private extractImport(node: Parser.SyntaxNode, currentParentId: string): void {
    const line = node.startPosition.row + 1;

    if (node.type === "import_statement") {
      // import foo, bar as b
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (!child) continue;
        const name = child.type === "aliased_import"
          ? child.childForFieldName("name")?.text ?? child.text
          : child.text;

        this.unresolvedRefs.push({
          id: `${currentParentId}_import_${name}_${line}`,
          srcId: currentParentId,
          name: name.trim(),
          kind: "imports",
          fileId: this.fileId,
          line,
        });
      }
    } else if (node.type === "import_from_statement") {
      // from module import symbol1, symbol2
      const moduleNode = node.childForFieldName("module_name");
      const modulePrefix = moduleNode ? moduleNode.text.trim() : "";

      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (!child || child === moduleNode) continue;

        // Skip the 'import' keyword node or punctuation
        if (child.type === "dotted_name" || child.type === "aliased_import") {
          const importedSymbol = child.type === "aliased_import"
            ? child.childForFieldName("name")?.text ?? child.text
            : child.text;

          const fullName = modulePrefix ? `${modulePrefix}.${importedSymbol}` : importedSymbol;

          this.unresolvedRefs.push({
            id: `${currentParentId}_import_${importedSymbol}_${line}`,
            srcId: currentParentId,
            name: fullName.trim(),
            kind: "imports",
            fileId: this.fileId,
            line,
          });
        }
      }
    }
  }

  private extractCall(node: Parser.SyntaxNode, currentParentId: string): void {
    const funcNode = node.childForFieldName("function");
    if (!funcNode) return;

    let calleeName = funcNode.text.trim();
    if (funcNode.type === "attribute") {
      const attr = funcNode.childForFieldName("attribute");
      if (attr) {
        calleeName = attr.text.trim();
      }
    }

    // Skip Python builtins / keywords like print, len, range, str, int, dict, list
    const pyBuiltins = new Set([
      "print", "len", "range", "str", "int", "float", "bool", "dict", "list", "set",
      "tuple", "type", "isinstance", "enumerate", "zip", "map", "filter", "any", "all",
      "min", "max", "sum", "abs", "round", "repr", "open", "super",
    ]);

    if (!pyBuiltins.has(calleeName) && calleeName.length > 0) {
      this.unresolvedRefs.push({
        id: `${currentParentId}_call_${calleeName}_${node.startPosition.row + 1}`,
        srcId: currentParentId,
        name: calleeName,
        kind: "calls",
        fileId: this.fileId,
        line: node.startPosition.row + 1,
      });
    }
  }

  private extractDocstring(bodyNode: Parser.SyntaxNode | null): string | null {
    if (!bodyNode) return null;

    // In Tree-Sitter Python, the first statement in a body can be an expression_statement containing a string
    for (let i = 0; i < bodyNode.namedChildCount; i++) {
      const child = bodyNode.namedChild(i);
      if (!child) continue;

      if (child.type === "expression_statement") {
        const expr = child.namedChild(0);
        if (expr && expr.type === "string") {
          // Strip triple quotes or single quotes
          let text = expr.text.trim();
          if (text.startsWith('"""') && text.endsWith('"""')) {
            text = text.slice(3, -3);
          } else if (text.startsWith("'''") && text.endsWith("'''")) {
            text = text.slice(3, -3);
          } else if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
            text = text.slice(1, -1);
          }
          return text.trim();
        }
      }
      // If the first statement wasn't an expression_statement, stop checking
      break;
    }
    return null;
  }

  private createContainsEdge(parentId: string, childId: string): void {
    const edgeId = createEdgeId(parentId, childId, "contains");
    this.edges.push({
      id: edgeId,
      srcId: parentId,
      dstId: childId,
      kind: "contains",
      alpha: 10,
      beta: 0.1,
      evidenceJson: JSON.stringify({ rule: "syntactic_contains" }),
    });
  }
}
