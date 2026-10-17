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

export class JavaExtractor {
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
      case "package_declaration": {
        const pkgNode = this.extractPackage(node, currentParentId);
        if (pkgNode) {
          this.nodes.push(pkgNode);
          this.createContainsEdge(currentParentId, pkgNode.id);
          nextParentId = pkgNode.id;
        }
        break;
      }

      case "import_declaration": {
        this.extractImport(node, currentParentId);
        break;
      }

      case "class_declaration":
      case "interface_declaration":
      case "enum_declaration":
      case "record_declaration": {
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

      case "method_invocation": {
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

  private extractPackage(node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null {
    const pkgName = node.namedChild(0)?.text.trim();
    if (!pkgName) return null;

    const qualifiedName = `${this.filePath}:package ${pkgName}`;
    const docComment = this.extractPrecedingDocComment(node);

    return {
      id: createNodeId(this.filePath, qualifiedName, "module"),
      fileId: this.fileId,
      kind: "module",
      name: pkgName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `package ${pkgName}`,
      docComment,
      tokens: [...splitIdentifierTokens(pkgName), ...(docComment ? splitIdentifierTokens(docComment) : [])].join(" "),
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

    // Extract superclass (extends) & interfaces (implements)
    const superclassNode = node.childForFieldName("superclass");
    if (superclassNode) {
      const superName = superclassNode.text.replace(/^extends\s+/, "").trim();
      const line = superclassNode.startPosition.row + 1;
      const typeId = createNodeId(this.filePath, qualifiedName, kind);
      this.unresolvedRefs.push({
        id: `${typeId}_extends_${superName}_${line}`,
        srcId: typeId,
        name: superName,
        kind: "extends",
        fileId: this.fileId,
        line,
      });
    }

    const interfacesNode = node.childForFieldName("interfaces");
    if (interfacesNode) {
      for (let i = 0; i < interfacesNode.namedChildCount; i++) {
        const child = interfacesNode.namedChild(i);
        if (!child) continue;
        const ifaceName = child.text.trim();
        const line = child.startPosition.row + 1;
        const typeId = createNodeId(this.filePath, qualifiedName, kind);
        this.unresolvedRefs.push({
          id: `${typeId}_implements_${ifaceName}_${line}`,
          srcId: typeId,
          name: ifaceName,
          kind: "implements",
          fileId: this.fileId,
          line,
        });
      }
    }

    let keyword = "class";
    if (node.type === "interface_declaration") keyword = "interface";
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

  private extractImport(node: Parser.SyntaxNode, currentParentId: string): void {
    const line = node.startPosition.row + 1;
    // import java.util.List; or import static ...;
    const nameNode = node.namedChild(0);
    if (!nameNode) return;

    const importPath = nameNode.text.replace(/;$/, "").trim();
    const importedSymbol = importPath.split(".").pop() ?? importPath;

    this.unresolvedRefs.push({
      id: `${currentParentId}_import_${importedSymbol}_${line}`,
      srcId: currentParentId,
      name: importPath,
      kind: "imports",
      fileId: this.fileId,
      line,
    });
  }

  private extractCall(node: Parser.SyntaxNode, currentParentId: string): void {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return;

    const calleeName = nameNode.text.trim();
    const javaBuiltins = new Set([
      "equals", "hashCode", "toString", "getClass", "notify", "notifyAll", "wait",
      "println", "print", "printf", "format", "builder", "build",
    ]);

    if (!javaBuiltins.has(calleeName) && calleeName.length > 0) {
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
    const prev = node.previousNamedSibling;
    if (prev && (prev.type === "block_comment" || prev.type === "line_comment")) {
      return prev.text.replace(/^\/\*\*?|\*\/$|^\s*\*\s?/gm, "").trim();
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
