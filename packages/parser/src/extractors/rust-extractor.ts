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

export class RustExtractor {
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
    enclosingTypeName: string | null,
  ): void {
    let nextParentId = currentParentId;
    let nextTypeName = enclosingTypeName;

    switch (node.type) {
      case "use_declaration": {
        this.extractUse(node, currentParentId);
        break;
      }

      case "mod_item": {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          const modName = nameNode.text.trim();
          const docComment = this.extractDocComment(node);
          const qualifiedName = `${this.filePath}:mod ${modName}`;
          const modNode: NodeRecord = {
            id: createNodeId(this.filePath, qualifiedName, "module"),
            fileId: this.fileId,
            kind: "module",
            name: modName,
            qualifiedName,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            signature: `mod ${modName}`,
            docComment,
            tokens: [...splitIdentifierTokens(modName), ...(docComment ? splitIdentifierTokens(docComment) : [])].join(" "),
          };
          this.nodes.push(modNode);
          this.createContainsEdge(currentParentId, modNode.id);
          nextParentId = modNode.id;
        }
        break;
      }

      case "struct_item":
      case "enum_item": {
        const extracted = this.extractStructOrEnum(node, currentParentId);
        if (extracted) {
          this.nodes.push(extracted);
          this.typeNodeMap.set(extracted.name, extracted.id);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
        }
        break;
      }

      case "trait_item": {
        const extracted = this.extractTrait(node, currentParentId);
        if (extracted) {
          this.nodes.push(extracted);
          this.typeNodeMap.set(extracted.name, extracted.id);
          this.createContainsEdge(currentParentId, extracted.id);
          nextParentId = extracted.id;
          nextTypeName = extracted.name;
        }
        break;
      }

      case "impl_item": {
        const implInfo = this.extractImpl(node, currentParentId);
        if (implInfo) {
          nextParentId = implInfo.targetNodeId ?? currentParentId;
          nextTypeName = implInfo.targetTypeName;
        }
        break;
      }

      case "function_item": {
        const extracted = this.extractFunction(node, enclosingTypeName);
        if (extracted) {
          this.nodes.push(extracted);
          const parentId = (enclosingTypeName && this.typeNodeMap.get(enclosingTypeName)) || currentParentId;
          this.createContainsEdge(parentId, extracted.id);
          nextParentId = extracted.id;
        }
        break;
      }

      case "call_expression": {
        this.extractCall(node, currentParentId);
        break;
      }

      case "macro_invocation": {
        this.extractMacro(node, currentParentId);
        break;
      }
    }

    // Recurse into children
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        this.visitNode(child, nextParentId, nextTypeName);
      }
    }
  }

  private extractStructOrEnum(node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const typeName = nameNode.text.trim();
    const isEnum = node.type === "enum_item";
    const keyword = isEnum ? "enum" : "struct";
    const qualifiedName = `${this.filePath}:${typeName}`;
    const docComment = this.extractDocComment(node);

    const tokens = [
      ...splitIdentifierTokens(typeName),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    return {
      id: createNodeId(this.filePath, qualifiedName, "class"),
      fileId: this.fileId,
      kind: "class",
      name: typeName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `pub ${keyword} ${typeName}`.trim(),
      docComment,
      tokens,
    };
  }

  private extractTrait(node: Parser.SyntaxNode, currentParentId: string): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const traitName = nameNode.text.trim();
    const qualifiedName = `${this.filePath}:${traitName}`;
    const docComment = this.extractDocComment(node);

    const tokens = [
      ...splitIdentifierTokens(traitName),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
    ].join(" ");

    return {
      id: createNodeId(this.filePath, qualifiedName, "interface"),
      fileId: this.fileId,
      kind: "interface",
      name: traitName,
      qualifiedName,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `pub trait ${traitName}`,
      docComment,
      tokens,
    };
  }

  private extractImpl(
    node: Parser.SyntaxNode,
    currentParentId: string,
  ): { targetTypeName: string; targetNodeId: string | null } | null {
    const typeNode = node.childForFieldName("type");
    if (!typeNode) return null;

    const targetTypeName = typeNode.text.replace(/<.*>/, "").trim();
    const traitNode = node.childForFieldName("trait");

    const targetNodeId = this.typeNodeMap.get(targetTypeName) ?? null;

    // If implementing a trait: `impl Trait for Type`
    if (traitNode) {
      const traitName = traitNode.text.replace(/<.*>/, "").trim();
      const line = node.startPosition.row + 1;
      const srcId = targetNodeId ?? createNodeId(this.filePath, `${this.filePath}:${targetTypeName}`, "class");

      this.unresolvedRefs.push({
        id: `${srcId}_implements_${traitName}_${line}`,
        srcId,
        name: traitName,
        kind: "implements",
        fileId: this.fileId,
        line,
      });
    }

    return { targetTypeName, targetNodeId };
  }

  private extractFunction(
    node: Parser.SyntaxNode,
    enclosingTypeName: string | null,
  ): NodeRecord | null {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return null;

    const funcName = nameNode.text.trim();
    const isMethod = enclosingTypeName !== null;
    const qualifiedName = isMethod
      ? `${this.filePath}:${enclosingTypeName}.${funcName}`
      : `${this.filePath}:${funcName}`;

    const docComment = this.extractDocComment(node);
    const paramsNode = node.childForFieldName("parameters");
    const returnTypeNode = node.childForFieldName("return_type");

    let signature = `fn ${funcName}${paramsNode ? paramsNode.text : "()"}`;
    if (returnTypeNode) {
      signature += ` -> ${returnTypeNode.text}`;
    }

    const kind = isMethod ? "method" : "function";
    const tokens = [
      ...splitIdentifierTokens(funcName),
      ...(enclosingTypeName ? splitIdentifierTokens(enclosingTypeName) : []),
      ...(docComment ? splitIdentifierTokens(docComment) : []),
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

  private extractUse(node: Parser.SyntaxNode, currentParentId: string): void {
    const line = node.startPosition.row + 1;

    // Recursively extract import symbols from use tree
    const walkUse = (n: Parser.SyntaxNode) => {
      if (n.type === "use_as_clause") {
        const alias = n.childForFieldName("alias");
        const path = n.childForFieldName("path");
        const name = alias ? alias.text.trim() : path ? path.text.trim() : n.text.trim();
        this.addImportRef(name, line, currentParentId);
        return;
      }

      if (n.type === "scoped_identifier" || n.type === "identifier") {
        const text = n.text.trim();
        if (text && !["use", "pub", "crate", "super", "self"].includes(text)) {
          this.addImportRef(text, line, currentParentId);
        }
        return;
      }

      for (let i = 0; i < n.namedChildCount; i++) {
        const child = n.namedChild(i);
        if (child) walkUse(child);
      }
    };

    walkUse(node);
  }

  private addImportRef(name: string, line: number, currentParentId: string): void {
    const cleanName = name.replace(/;$/, "").trim();
    if (!cleanName) return;

    this.unresolvedRefs.push({
      id: `${currentParentId}_import_${cleanName}_${line}`,
      srcId: currentParentId,
      name: cleanName,
      kind: "imports",
      fileId: this.fileId,
      line,
    });
  }

  private extractCall(node: Parser.SyntaxNode, currentParentId: string): void {
    const funcNode = node.childForFieldName("function");
    if (!funcNode) return;

    let calleeName = funcNode.text.trim();
    if (funcNode.type === "field_expression") {
      const field = funcNode.childForFieldName("field");
      if (field) {
        calleeName = field.text.trim();
      }
    } else if (funcNode.type === "scoped_identifier") {
      const name = funcNode.childForFieldName("name");
      if (name) {
        calleeName = name.text.trim();
      }
    }

    const rustBuiltins = new Set([
      "Some", "None", "Ok", "Err", "drop", "clone", "to_string", "into", "from", "as_ref",
    ]);

    if (!rustBuiltins.has(calleeName) && calleeName.length > 0) {
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

  private extractMacro(node: Parser.SyntaxNode, currentParentId: string): void {
    const macroNode = node.childForFieldName("macro") ?? node.namedChild(0);
    if (!macroNode) return;

    const macroName = macroNode.text.replace(/!$/, "").trim();
    const commonMacros = new Set(["println", "print", "eprintln", "eprint", "format", "vec", "panic"]);

    if (!commonMacros.has(macroName) && macroName.length > 0) {
      this.unresolvedRefs.push({
        id: `${currentParentId}_call_${macroName}_${node.startPosition.row + 1}`,
        srcId: currentParentId,
        name: macroName,
        kind: "calls",
        fileId: this.fileId,
        line: node.startPosition.row + 1,
      });
    }
  }

  private extractDocComment(node: Parser.SyntaxNode): string | null {
    const comments: string[] = [];
    let current = node.previousNamedSibling;
    while (current && current.type === "line_comment" && current.text.startsWith("///")) {
      comments.unshift(current.text);
      current = current.previousNamedSibling;
    }
    if (comments.length === 0) return null;
    const combined = comments
      .join("\n")
      .replace(/^\/\/\/\s*/gm, "")
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
