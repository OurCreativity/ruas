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

export class GoExtractor {
  private readonly filePath: string;
  private readonly fileId: string;
  private readonly nodes: NodeRecord[] = [];
  private readonly edges: EdgeRecord[] = [];
  private readonly unresolvedRefs: UnresolvedRefRecord[] = [];
  private readonly typeNodeMap = new Map<string, string>(); // typeName -> nodeId

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
    this.visitNode(tree.rootNode, fileNodeId);

    return {
      nodes: this.nodes,
      edges: this.edges,
      unresolvedRefs: this.unresolvedRefs,
    };
  }

  private visitNode(node: Parser.SyntaxNode, currentParentId: string): void {
    let nextParentId = currentParentId;

    switch (node.type) {
      case "package_clause": {
        this.extractPackage(node, currentParentId);
        break;
      }

      case "import_declaration": {
        this.extractImport(node, currentParentId);
        break;
      }

      case "type_declaration": {
        this.extractTypeDeclaration(node, currentParentId);
        break;
      }

      case "function_declaration": {
        const extracted = this.extractFunction(node);
        if (extracted) {
          this.nodes.push(extracted);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
        }
        break;
      }

      case "method_declaration": {
        const extracted = this.extractMethod(node);
        if (extracted) {
          this.nodes.push(extracted.node);
          // If receiver type is known in this file, attach to type; else attach to currentParentId
          const parentId = (extracted.receiverType && this.typeNodeMap.get(extracted.receiverType)) || currentParentId;
          this.createContainsEdge(parentId, extracted.node.id);
          nextParentId = extracted.node.id;
        }
        break;
      }

      case "call_expression": {
        this.extractCall(node, currentParentId);
        break;
      }
    }

    // Recurse into children
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        this.visitNode(child, nextParentId);
      }
    }
  }

  private extractPackage(node: Parser.SyntaxNode, currentParentId: string): void {
    const pkgIdNode = node.childForFieldName("name") ?? node.namedChild(0);
    if (!pkgIdNode) return;
    const pkgName = pkgIdNode.text.trim();
    const docComment = this.extractPrecedingDocComment(node);

    const qualifiedName = `${this.filePath}:package ${pkgName}`;
    const tokens = [
      ...splitIdentifierTokens(pkgName),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    const pkgNode: NodeRecord = {
      id: createNodeId(this.filePath, qualifiedName, "module"),
      fileId: this.fileId,
      kind: "module",
      name: pkgName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `package ${pkgName}`,
      docComment,
      tokens,
    };
    this.nodes.push(pkgNode);
    this.createContainsEdge(currentParentId, pkgNode.id);
  }

  private extractTypeDeclaration(node: Parser.SyntaxNode, currentParentId: string): void {
    const docComment = this.extractPrecedingDocComment(node);

    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!child || child.type !== "type_spec") continue;

      const nameNode = child.childForFieldName("name");
      if (!nameNode) continue;
      const typeName = nameNode.text.trim();
      const typeDefNode = child.childForFieldName("type");

      const isInterface = typeDefNode?.type === "interface_type";
      const kind = isInterface ? "interface" : "class";
      const qualifiedName = `${this.filePath}:${typeName}`;

      const tokens = [
        ...splitIdentifierTokens(typeName),
        ...(docComment ? splitIdentifierTokens(docComment) : []),
      ].join(" ");

      const typeNode: NodeRecord = {
        id: createNodeId(this.filePath, qualifiedName, kind),
        fileId: this.fileId,
        kind,
        name: typeName,
        qualifiedName,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: `type ${typeName} ${typeDefNode ? typeDefNode.type.replace("_type", "") : ""}`.trim(),
        docComment,
        tokens,
      };

      this.nodes.push(typeNode);
      this.typeNodeMap.set(typeName, typeNode.id);
      this.createContainsEdge(currentParentId, typeNode.id);

      // If interface, extract interface methods
      if (isInterface && typeDefNode) {
        this.extractInterfaceMethods(typeDefNode, typeNode.id, typeName);
      }
    }
  }

  private extractInterfaceMethods(interfaceNode: Parser.SyntaxNode, interfaceNodeId: string, interfaceName: string): void {
    for (let i = 0; i < interfaceNode.namedChildCount; i++) {
      const child = interfaceNode.namedChild(i);
      if (!child || child.type !== "method_spec") continue;

      const nameNode = child.childForFieldName("name");
      if (!nameNode) continue;
      const methodName = nameNode.text.trim();
      const qualifiedName = `${this.filePath}:${interfaceName}.${methodName}`;
      const paramsNode = child.childForFieldName("parameters");
      const resultNode = child.childForFieldName("result");

      let signature = `${methodName}${paramsNode ? paramsNode.text : "()"}`;
      if (resultNode) {
        signature += ` ${resultNode.text}`;
      }

      const methodNode: NodeRecord = {
        id: createNodeId(this.filePath, qualifiedName, "method"),
        fileId: this.fileId,
        kind: "method",
        name: methodName,
        qualifiedName,
        startLine: child.startPosition.row + 1,
        endLine: child.endPosition.row + 1,
        signature,
        docComment: null,
        tokens: [...splitIdentifierTokens(interfaceName), ...splitIdentifierTokens(methodName)].join(" "),
      };

      this.nodes.push(methodNode);
      this.createContainsEdge(interfaceNodeId, methodNode.id);
    }
  }

  private extractFunction(node: Parser.SyntaxNode): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const funcName = nameNode.text.trim();
    const qualifiedName = `${this.filePath}:${funcName}`;
    const docComment = this.extractPrecedingDocComment(node);

    const paramsNode = node.childForFieldName("parameters");
    const resultNode = node.childForFieldName("result");
    let signature = `func ${funcName}${paramsNode ? paramsNode.text : "()"}`;
    if (resultNode) {
      signature += ` ${resultNode.text}`;
    }

    const tokens = [
      ...splitIdentifierTokens(funcName),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    return {
      id: createNodeId(this.filePath, qualifiedName, "function"),
      fileId: this.fileId,
      kind: "function",
      name: funcName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature,
      docComment,
      tokens,
    };
  }

  private extractMethod(node: Parser.SyntaxNode): { node: NodeRecord; receiverType: string | null } | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const methodName = nameNode.text.trim();
    const receiverNode = node.childForFieldName("receiver");

    let receiverType: string | null = null;
    if (receiverNode) {
      // e.g. (s *PaymentService) or (PaymentService)
      const text = receiverNode.text.replace(/[\(\)\*]/g, "").trim();
      const parts = text.split(/\s+/);
      receiverType = parts[parts.length - 1] ?? null;
    }

    const qualifiedName = receiverType
      ? `${this.filePath}:${receiverType}.${methodName}`
      : `${this.filePath}:${methodName}`;

    const docComment = this.extractPrecedingDocComment(node);

    const paramsNode = node.childForFieldName("parameters");
    const resultNode = node.childForFieldName("result");
    let signature = `func ${receiverNode ? receiverNode.text + " " : ""}${methodName}${paramsNode ? paramsNode.text : "()"}`;
    if (resultNode) {
      signature += ` ${resultNode.text}`;
    }

    const tokens = [
      ...splitIdentifierTokens(methodName),
      ...(receiverType ? splitIdentifierTokens(receiverType) : []),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    const nodeRecord: NodeRecord = {
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

    return { node: nodeRecord, receiverType };
  }

  private extractImport(node: Parser.SyntaxNode, currentParentId: string): void {
    const line = node.startPosition.row + 1;

    // Can be single import: `import "fmt"` or grouped: `import ( "fmt" "os" )`
    const walkImports = (n: Parser.SyntaxNode) => {
      if (n.type === "import_spec") {
        const pathNode = n.childForFieldName("path");
        const aliasNode = n.childForFieldName("name");
        if (pathNode) {
          const rawPath = pathNode.text.replace(/["']/g, "").trim();
          const importName = aliasNode ? aliasNode.text.trim() : rawPath.split("/").pop() ?? rawPath;

          this.unresolvedRefs.push({
            id: `${currentParentId}_import_${importName}_${n.startPosition.row + 1}`,
            srcId: currentParentId,
            name: rawPath,
            kind: "imports",
            fileId: this.fileId,
            line: n.startPosition.row + 1,
          });
        }
      }
      for (let i = 0; i < n.namedChildCount; i++) {
        const child = n.namedChild(i);
        if (child) walkImports(child);
      }
    };

    walkImports(node);
  }

  private extractCall(node: Parser.SyntaxNode, currentParentId: string): void {
    const funcNode = node.childForFieldName("function");
    if (!funcNode) return;

    let calleeName = funcNode.text.trim();
    if (funcNode.type === "selector_expression") {
      const field = funcNode.childForFieldName("field");
      if (field) {
        calleeName = field.text.trim();
      }
    }

    const goBuiltins = new Set([
      "append", "cap", "close", "complex", "copy", "delete", "imag", "len",
      "make", "new", "panic", "print", "println", "real", "recover",
    ]);

    if (!goBuiltins.has(calleeName) && calleeName.length > 0) {
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
      .replace(/^\/\/\s*/gm, "")
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
