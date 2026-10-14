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

export class PhpExtractor {
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

      case "method_declaration": {
        const extracted = this.extractMethod(node, enclosingScopeName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextScopeName = extracted.name;
        }
        break;
      }

      case "function_definition": {
        const extracted = this.extractFunction(node, enclosingScopeName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextScopeName = extracted.name;
        }
        break;
      }

      case "namespace_use_declaration": {
        this.extractUseDeclaration(node);
        break;
      }

      case "function_call_expression":
      case "member_call_expression":
      case "scoped_call_expression": {
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

  private extractClass(node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}\\${name}` : name;
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

  private extractInterface(node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}\\${name}` : name;
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

  private extractMethod(node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}::${name}` : name;
    const params = node.childForFieldName("parameters");
    const signature = params ? `function ${name}${params.text}` : `function ${name}()`;
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

  private extractFunction(node: Parser.SyntaxNode, scopeName: string | null): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) {
      return null;
    }
    const name = nameNode.text;
    const qualifiedName = scopeName ? `${scopeName}\\${name}` : name;
    const params = node.childForFieldName("parameters");
    const signature = params ? `function ${name}${params.text}` : `function ${name}()`;
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

  private extractUseDeclaration(node: Parser.SyntaxNode): void {
    const text = node.text.replace(/^use\s+/, "").replace(/;$/, "").trim();
    const parts = text.split("\\");
    const importedSymbol = parts[parts.length - 1] ?? text;

    this.unresolvedRefs.push({
      id: `ref_${this.fileId}_use_${importedSymbol}_${node.startPosition.row}`,
      srcId: createNodeId(this.filePath, this.filePath, "file"),
      name: importedSymbol,
      kind: "imports",
      fileId: this.fileId,
      line: node.startPosition.row + 1,
    });
  }

  private extractCallExpression(node: Parser.SyntaxNode, callerNodeId: string): void {
    let calleeName: string | null = null;

    if (node.type === "function_call_expression") {
      const funcNode = node.childForFieldName("function");
      if (funcNode) {
        calleeName = funcNode.text;
      }
    } else if (node.type === "member_call_expression" || node.type === "scoped_call_expression") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        calleeName = nameNode.text;
      }
    }

    if (calleeName && !calleeName.startsWith("$")) {
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

  private findLeadingDocComment(node: Parser.SyntaxNode): string | null {
    let prev = node.previousNamedSibling;
    while (prev) {
      if (prev.type === "comment") {
        return prev.text;
      }
      prev = prev.previousNamedSibling;
    }
    return null;
  }
}
