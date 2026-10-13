import { z } from "zod";
import { EDGE_KINDS, NODE_KINDS } from "./types.js";

export const SupportedLanguageSchema = z.enum([
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "php",
]);

export const NodeKindSchema = z.enum(NODE_KINDS);
export const EdgeKindSchema = z.enum(EDGE_KINDS);

export const FileRecordSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  lang: SupportedLanguageSchema,
  contentHash: z.string().min(1),
  size: z.number().nonnegative(),
  mtime: z.number().nonnegative(),
  indexedAt: z.number().nonnegative(),
});

export const NodeRecordSchema = z.object({
  id: z.string().min(1),
  fileId: z.string().min(1),
  kind: NodeKindSchema,
  name: z.string(),
  qualifiedName: z.string(),
  startLine: z.number().int().nonnegative(),
  endLine: z.number().int().nonnegative(),
  signature: z.string().nullable(),
  docComment: z.string().nullable(),
  tokens: z.string(),
});

export const EdgeRecordSchema = z.object({
  id: z.string().min(1),
  srcId: z.string().min(1),
  dstId: z.string().min(1),
  kind: EdgeKindSchema,
  alpha: z.number().positive(),
  beta: z.number().positive(),
  evidenceJson: z.string().nullable(),
});

export const UnresolvedRefRecordSchema = z.object({
  id: z.string().min(1),
  srcId: z.string().min(1),
  name: z.string().min(1),
  kind: EdgeKindSchema,
  fileId: z.string().min(1),
  line: z.number().int().nonnegative(),
});

export const ProjectConfigSchema = z.object({
  rootDir: z.string().min(1),
  dbPath: z.string().min(1),
  languages: z.array(SupportedLanguageSchema).default([
    "typescript",
    "javascript",
    "tsx",
    "jsx",
    "php",
  ]),
  excludePatterns: z.array(z.string()).default([
    "**/node_modules/**",
    "**/vendor/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/.ruas/**",
  ]),
  maxFileSize: z.number().int().positive().default(1024 * 1024), // 1MB
  debounceMs: z.number().int().positive().default(800),
});
