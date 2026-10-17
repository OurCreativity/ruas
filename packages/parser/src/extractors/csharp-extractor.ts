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

export class CSharpExtractor {
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
    enclosingClassName: string | null,
  ): void {
    let nextParentId = currentParentId;
    let nextClassName = enclosingClassName;

    switch (node.type) {
      case "namespace_declaration":
      case "file_scoped_namespace_declaration": {
        const nsNode = this.extractNamespace(node, currentParentId);
        if (nsNode) {
          this.nodes.push(nsNode);
          this.createContainsEdge(currentParentId, nsNode.id);
          nextParentId = nsNode.id;
        }
        break;
      }

      case "using_directive": {
        this.extractUsing(node, currentParentId);
        break;
      }

      case "class_declaration":
      case "interface_declaration":
      case "struct_declaration":
      case "record_declaration":
      case "enum_declaration": {
        const extracted = this.extractType(node, currentParentId, enclosingClassName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextClassName = extracted.name;
        }
        break;
      }

      case "method_declaration":
      case "constructor_declaration": {
        const extracted = this.extractMethod(node, enclosingClassName);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
        }
        break;
      }

      case "invocation_expression": {
        this.extractCall(node, currentParentId);
        break;
      }
    }

    // Recurse into children
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        this.visitNode(child, nextParentId, nextClassName);
      }
    }
  }

  private extractNamespace(node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const nsName = nameNode.text.trim();
    const qualifiedName = `${this.filePath}:namespace ${nsName}`;
    const docComment = this.extractPrecedingDocComment(node);

    return {
      id: createNodeId(this.filePath, qualifiedName, "module"),
      fileId: this.fileId,
      kind: "module",
      name: nsName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `namespace ${nsName}`,
      docComment,
      tokens: [...splitIdentifierTokens(nsName), ...(docComment ? splitIdentifierTokens(docComment) : [])].join(" "),
    };
  }

  private extractType(
    node: Parser.SyntaxNode,
    currentParentId: string,
    enclosingClassName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const typeName = nameNode.text.trim();
    const isInterface = node.type === "interface_declaration";
    const kind = isInterface ? "interface" : "class";
    const qualifiedName = enclosingClassName
      ? `${this.filePath}:${enclosingClassName}.${typeName}`
      : `${this.filePath}:${typeName}`;

    const docComment = this.extractPrecedingDocComment(node);

    // Extract base types (extends / implements)
    let baseList: Parser.SyntaxNode | null = null;
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child && child.type === "base_list") {
        baseList = child;
        break;
      }
    }
    if (baseList) {
      for (let i = 0; i < baseList.namedChildCount; i++) {
        const child = baseList.namedChild(i);
        if (!child) continue;
        const baseName = child.text.trim();
        const line = child.startPosition.row + 1;
        const typeId = createNodeId(this.filePath, qualifiedName, kind);
        // In C# interfaces usually start with 'I' followed by uppercase
        const isInterfaceName = /^I[A-Z]/.test(baseName);
        const refKind = isInterfaceName ? "implements" : "extends";

        this.unresolvedRefs.push({
          id: `${typeId}_${refKind}_${baseName}_${line}`,
          srcId: typeId,
          name: baseName,
          kind: refKind,
          fileId: this.fileId,
          line,
        });
      }
    }

    let keyword = "class";
    if (node.type === "interface_declaration") keyword = "interface";
    else if (node.type === "struct_declaration") keyword = "struct";
    else if (node.type === "enum_declaration") keyword = "enum";
    else if (node.type === "record_declaration") keyword = "record";

    const tokens = [
      ...splitIdentifierTokens(typeName),
      ...(enclosingClassName ? splitIdentifierTokens(enclosingClassName) : []),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    return {
      id: createNodeId(this.filePath, qualifiedName, kind),
      fileId: this.fileId,
      kind,
      name: typeName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `public ${keyword} ${typeName}`,
      docComment,
      tokens,
    };
  }

  private extractMethod(
    node: Parser.SyntaxNode,
    enclosingClassName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const methodName = nameNode.text.trim();
    const qualifiedName = enclosingClassName
      ? `${this.filePath}:${enclosingClassName}.${methodName}`
      : `${this.filePath}:${methodName}`;

    const docComment = this.extractPrecedingDocComment(node);
    const paramsNode = node.childForFieldName("parameters");
    const returnTypeNode = node.childForFieldName("type");

    let signature = `${returnTypeNode ? returnTypeNode.text + " " : ""}${methodName}${paramsNode ? paramsNode.text : "()"}`;

    const tokens = [
      ...splitIdentifierTokens(methodName),
      ...(enclosingClassName ? splitIdentifierTokens(enclosingClassName) : []),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    return {
      id: createNodeId(this.filePath, qualifiedName, "method"),
      fileId: this.fileId,
      kind: "method",
      name: methodName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature,
      docComment,
      tokens,
    };
  }

  private extractUsing(node: Parser.SyntaxNode, currentParentId: string): void {
    const line = node.startPosition.row + 1;
    // using System.Collections.Generic;
    const nameNode = node.namedChild(0);
    if (!nameNode) return;

    const usingPath = nameNode.text.replace(/;$/, "").replace(/^using\s+/, "").trim();
    const symbol = usingPath.split(".").pop() ?? usingPath;

    this.unresolvedRefs.push({
      id: `${currentParentId}_import_${symbol}_${line}`,
      srcId: currentParentId,
      name: usingPath,
      kind: "imports",
      fileId: this.fileId,
      line,
    });
  }

  private extractCall(node: Parser.SyntaxNode, currentParentId: string): void {
    const exprNode = node.childForFieldName("expression") ?? node.namedChild(0);
    if (!exprNode) return;

    let calleeName = exprNode.text.trim();
    if (exprNode.type === "member_access_expression") {
      const name = exprNode.childForFieldName("name") ?? exprNode.namedChild(exprNode.namedChildCount - 1);
      if (name) {
        calleeName = name.text.trim();
      }
    }

    const csharpBuiltins = new Set([
      "ToString", "Equals", "GetHashCode", "GetType", "WriteLine", "Write",
    ]);

    if (!csharpBuiltins.has(calleeName) && calleeName.length > 0) {
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

  private extractPrecedingDocComment(node: Parser.SyntaxNode): string | null {
    const comments: string[] = [];
    let current = node.previousNamedSibling;
    while (current && current.type === "comment") {
      comments.unshift(current.text);
      current = current.previousNamedSibling;
    }
    if (comments.length === 0) return null;
    const combined = comments
      .join("\n")
      .replace(/^\/\/\/?\s*|<\/?[a-zA-Z0-9_-]+.*?>/gm, "")
      .trim();
    return combined.length > 0 ? combined : null;
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
