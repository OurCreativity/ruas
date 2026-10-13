import type Parser from "web-tree-sitter";
import {
  type EdgeRecord,
  type NodeKind,
  type NodeRecord,
  type UnresolvedRefRecord,
  createEdgeId,
  createFileId,
  createNodeId,
  normalizePath,
} from "@ruas/core";
import { splitIdentifierTokens } from "../utils/tokenizer.js";

export interface ExtractorResult {
  readonly nodes: readonly NodeRecord[];
  readonly edges: readonly EdgeRecord[];
  readonly unresolvedRefs: readonly UnresolvedRefRecord[];
}

export class TypeScriptExtractor {
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
    this.visitNode(tree.rootNode, fileNodeId, null);

    return {
      nodes: this.nodes,
      edges: this.edges,
      unresolvedRefs: this.unresolvedRefs,
    };
  }

  private visitNode(
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingScopeName: string | null,
  ): void {
    let nextParentId = currentParentId;
    let nextScopeName = enclosingScopeName;

    switch (node.type) {
      case "function_declaration": {
        const extracted = this.extractFunction(node, enclosingScopeName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextScopeName = extracted.name;
        }
        break;
      }

      case "class_declaration": {
        const extracted = this.extractClass(node, enclosingScopeName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextScopeName = extracted.name;
        }
        break;
      }

      case "interface_declaration": {
        const extracted = this.extractInterface(node, enclosingScopeName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextScopeName = extracted.name;
        }
        break;
      }

      case "method_definition": {
        const extracted = this.extractMethod(node, enclosingScopeName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextScopeName = extracted.name;
        }
        break;
      }

      case "lexical_declaration":
      case "variable_declaration": {
        const arrowFuncs = this.extractArrowFunctions(node, enclosingScopeName);
        for (const func of arrowFuncs) {
          this.nodes.push(func);
          this.createContainsEdge(currentParentId, func.id);
        }
        break;
      }

      case "import_statement": {
        this.extractImports(node);
        break;
      }

      case "call_expression": {
        this.extractCallExpression(node, currentParentId);
        break;
      }
    }

    // Traverse children
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.visitNode(child, nextParentId, nextScopeName);
      }
    }
  }

  private extractFunction(
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}.${name}` : name;
    const signature = this.getFunctionSignature(node);
    const docComment = this.findLeadingDocComment(node);
    const tokens = splitIdentifierTokens(name).join(" ");
    const id = createNodeId(this.filePath, qualifiedName, "function");

    return {
      id,
      fileId: this.fileId,
      kind: "function",
      name,
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
    scopeName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}.${name}` : name;
    const docComment = this.findLeadingDocComment(node);
    const tokens = splitIdentifierTokens(name).join(" ");
    const id = createNodeId(this.filePath, qualifiedName, "class");

    return {
      id,
      fileId: this.fileId,
      kind: "class",
      name,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `class ${name}`,
      docComment,
      tokens,
    };
  }

  private extractInterface(
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}.${name}` : name;
    const docComment = this.findLeadingDocComment(node);
    const tokens = splitIdentifierTokens(name).join(" ");
    const id = createNodeId(this.filePath, qualifiedName, "interface");

    return {
      id,
      fileId: this.fileId,
      kind: "interface",
      name,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `interface ${name}`,
      docComment,
      tokens,
    };
  }

  private extractMethod(
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}.${name}` : name;
    const signature = this.getFunctionSignature(node);
    const docComment = this.findLeadingDocComment(node);
    const tokens = splitIdentifierTokens(name).join(" ");
    const id = createNodeId(this.filePath, qualifiedName, "method");

    return {
      id,
      fileId: this.fileId,
      kind: "method",
      name,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature,
      docComment,
      tokens,
    };
  }

  private extractArrowFunctions(
    node: Parser.SyntaxNode,
    scopeName: string | null,
  ): readonly NodeRecord[] {
    const results: NodeRecord[] = [];
    for (let i = 0; i < node.childCount; i++) {
      const declarator = node.child(i);
      if (declarator && declarator.type === "variable_declarator") {
        const nameNode = declarator.childForFieldName("name");
        const valueNode = declarator.childForFieldName("value");

        if (
          nameNode &&
          valueNode &&
          (valueNode.type === "arrow_function" ||
            valueNode.type === "function_expression")
        ) {
          const name = nameNode.text;
          const qualifiedName = scopeName ? `${scopeName}.${name}` : name;
          const signature = this.getFunctionSignature(valueNode);
          const docComment = this.findLeadingDocComment(node);
          const tokens = splitIdentifierTokens(name).join(" ");
          const id = createNodeId(this.filePath, qualifiedName, "function");

          results.push({
            id,
            fileId: this.fileId,
            kind: "function",
            name,
            qualifiedName,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            signature,
            docComment,
            tokens,
          });
        }
      }
    }
    return results;
  }

  private extractImports(node: Parser.SyntaxNode): void {
    const sourceNode = node.childForFieldName("source");
    const sourcePath = sourceNode
      ? sourceNode.text.replace(/['"]/g, "")
      : "";

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === "import_clause") {
        for (let j = 0; j < child.childCount; j++) {
          const sub = child.child(j);
          if (sub && sub.type === "named_imports") {
            for (let k = 0; k < sub.childCount; k++) {
              const specifier = sub.child(k);
              if (specifier && specifier.type === "import_specifier") {
                const nameNode = specifier.childForFieldName("name");
                if (nameNode) {
                  this.unresolvedRefs.push({
                    id: `ref_${this.fileId}_${nameNode.text}_${nameNode.startPosition.row}`,
                    srcId: createNodeId(this.filePath, this.filePath, "file"),
                    name: nameNode.text,
                    kind: "imports",
                    fileId: this.fileId,
                    line: nameNode.startPosition.row + 1,
                  });
                }
              }
            }
          } else if (sub && sub.type === "identifier") {
            // Default import
            this.unresolvedRefs.push({
              id: `ref_${this.fileId}_${sub.text}_${sub.startPosition.row}`,
              srcId: createNodeId(this.filePath, this.filePath, "file"),
              name: sub.text,
              kind: "imports",
              fileId: this.fileId,
              line: sub.startPosition.row + 1,
            });
          }
        }
      }
    }
  }

  private extractCallExpression(
    node: Parser.SyntaxNode,
    callerNodeId: string,
  ): void {
    const funcNode = node.childForFieldName("function");
    if (!funcNode) {
      return;
    }

    let calleeName: string | null = null;
    if (funcNode.type === "identifier") {
      calleeName = funcNode.text;
    } else if (funcNode.type === "member_expression") {
      const propertyNode = funcNode.childForFieldName("property");
      if (propertyNode) {
        calleeName = propertyNode.text;
      }
    }

    if (calleeName) {
      this.unresolvedRefs.push({
        id: `ref_call_${callerNodeId}_${calleeName}_${node.startPosition.row}_${node.startPosition.column}`,
        srcId: callerNodeId,
        name: calleeName,
        kind: "calls",
        fileId: this.fileId,
        line: node.startPosition.row + 1,
      });
    }
  }

  private createContainsEdge(srcId: string, dstId: string): void {
    if (srcId === dstId) {
      return;
    }
    const edgeId = createEdgeId(srcId, dstId, "contains");
    this.edges.push({
      id: edgeId,
      srcId,
      dstId,
      kind: "contains",
      alpha: 10,
      beta: 0.1,
      evidenceJson: JSON.stringify({ rule: "ast_containment" }),
    });
  }

  private getFunctionSignature(node: Parser.SyntaxNode): string | null {
    const params = node.childForFieldName("parameters");
    const returnType = node.childForFieldName("return_type");
    if (!params) {
      return null;
    }
    const paramStr = params.text;
    let retStr = "";
    if (returnType) {
      retStr = returnType.text.startsWith(":") ? returnType.text : `: ${returnType.text}`;
    }
    return `${paramStr}${retStr}`;
  }

  private findLeadingDocComment(node: Parser.SyntaxNode): string | null {
    let prev = node.previousNamedSibling;
    while (prev) {
      if (prev.type === "comment") {
        const text = prev.text;
        if (text.startsWith("/**") || text.startsWith("//")) {
          return text;
        }
      }
      prev = prev.previousNamedSibling;
    }
    return null;
  }
}
