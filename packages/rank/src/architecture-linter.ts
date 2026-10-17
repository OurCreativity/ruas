import type {
  ArchitecturalViolation,
  ArchitectureConfig,
  ArchitectureLinterReport,
  ArchitectureRule,
  EdgeRecord,
  FuzzyEvaluationResult,
  NodeRecord,
} from "@ruas/core";
import { FuzzyInferenceEngine } from "./fuzzy-inference.js";

export class ArchitectureLinter {
  /**
   * Converts a glob pattern (e.g., "** /domain/**", "src/services/*") into a RegExp.
   */
  public static globToRegex(pattern: string): RegExp {
    // Normalize slashes
    const normalized = pattern.replace(/\\/g, "/").trim();
    let regexStr = "^";

    let i = 0;
    while (i < normalized.length) {
      const c = normalized[i];
      if (c === "*" && normalized[i + 1] === "*") {
        // Double star **
        if (normalized[i + 2] === "/") {
          regexStr += "(?:.*\\/)?";
          i += 3;
        } else {
          regexStr += ".*";
          i += 2;
        }
      } else if (c === "*") {
        // Single star * (does not cross path separator)
        regexStr += "[^\\/]*";
        i++;
      } else if (c === "?") {
        regexStr += "[^\\/]";
        i++;
      } else if (["/", ".", "(", ")", "+", "|", "^", "$", "@", "%"].includes(c!)) {
        regexStr += "\\" + c;
        i++;
      } else {
        regexStr += c;
        i++;
      }
    }

    regexStr += "$";
    return new RegExp(regexStr);
  }

  /**
   * Matches a normalized file path against an array of glob or substring patterns.
   */
  public static matchPattern(filePath: string, patterns: readonly string[]): boolean {
    const normalized = filePath.replace(/\\/g, "/");
    for (const pattern of patterns) {
      const trimmed = pattern.trim();
      if (!trimmed) continue;

      // Direct exact or includes check if no glob wildcard
      if (!trimmed.includes("*") && !trimmed.includes("?")) {
        const pNorm = trimmed.replace(/\\/g, "/");
        if (normalized === pNorm || normalized.includes(pNorm)) {
          return true;
        }
      }

      // Glob regex match
      try {
        const regex = this.globToRegex(trimmed);
        if (regex.test(normalized)) {
          return true;
        }
      } catch {
        // Fallback substring check
        if (normalized.includes(trimmed)) return true;
      }
    }
    return false;
  }

  /**
   * Resolves the architectural layer of a node based on its file path or qualifiedName.
   */
  public static resolveLayer(
    node: NodeRecord,
    config: ArchitectureConfig,
    fileIdToPath?: Map<string, string>,
  ): string | null {
    let path = fileIdToPath?.get(node.fileId);
    if (!path) {
      path = node.qualifiedName.includes(":")
        ? node.qualifiedName.split(":")[0]!
        : node.qualifiedName;
    }

    for (const [layerName, patterns] of Object.entries(config.layers)) {
      if (this.matchPattern(path, patterns)) {
        return layerName;
      }
    }

    return null;
  }

  /**
   * Runs the architectural boundary linter over all nodes and edges using Mamdani fuzzy inference.
   */
  public static lint(
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    config: ArchitectureConfig,
    fileIdToPath?: Map<string, string>,
  ): ArchitectureLinterReport {
    const nodeMap = new Map<string, NodeRecord>(nodes.map((n) => [n.id, n]));
    const nodeLayers = new Map<string, string | null>();

    for (const node of nodes) {
      nodeLayers.set(node.id, this.resolveLayer(node, config, fileIdToPath));
    }

    // Compute in-degree for afferent impact calculation
    const inDegrees = new Map<string, number>();
    for (const edge of edges) {
      inDegrees.set(edge.dstId, (inDegrees.get(edge.dstId) ?? 0) + 1);
    }
    const maxInDegree = Math.max(1, ...Array.from(inDegrees.values()));

    // Collect layer statistics
    const layerSymbolCount = new Map<string, number>();
    const layerOutboundCalls = new Map<string, number>();
    const layerViolationCount = new Map<string, number>();

    for (const layer of Object.keys(config.layers)) {
      layerSymbolCount.set(layer, 0);
      layerOutboundCalls.set(layer, 0);
      layerViolationCount.set(layer, 0);
    }

    for (const [, layer] of nodeLayers) {
      if (layer && layerSymbolCount.has(layer)) {
        layerSymbolCount.set(layer, layerSymbolCount.get(layer)! + 1);
      }
    }

    // Build quick lookup for disallowed layer rules
    // Map<srcLayer, Map<disallowedDstLayer, ArchitectureRule>>
    const ruleIndex = new Map<string, Map<string, ArchitectureRule>>();
    for (const rule of config.rules) {
      let srcMap = ruleIndex.get(rule.from);
      if (!srcMap) {
        srcMap = new Map<string, ArchitectureRule>();
        ruleIndex.set(rule.from, srcMap);
      }
      for (const disallowed of rule.disallow) {
        srcMap.set(disallowed, rule);
      }
    }

    const violations: ArchitecturalViolation[] = [];
    const dependencyKinds = new Set(["calls", "imports", "extends", "implements", "references"]);

    for (const edge of edges) {
      if (!dependencyKinds.has(edge.kind)) continue;

      const srcLayer = nodeLayers.get(edge.srcId);
      const dstLayer = nodeLayers.get(edge.dstId);
      if (!srcLayer || !dstLayer) continue;

      if (layerOutboundCalls.has(srcLayer)) {
        layerOutboundCalls.set(srcLayer, layerOutboundCalls.get(srcLayer)! + 1);
      }

      // Check violation if srcLayer != dstLayer
      if (srcLayer !== dstLayer) {
        const rule = ruleIndex.get(srcLayer)?.get(dstLayer);
        if (rule) {
          const srcNode = nodeMap.get(edge.srcId)!;
          const dstNode = nodeMap.get(edge.dstId)!;

          // 1. Edge kind coupling intensity
          let couplingIntensity = 0.5;
          switch (edge.kind) {
            case "calls":
              couplingIntensity = 0.95;
              break;
            case "extends":
            case "implements":
              couplingIntensity = 0.9;
              break;
            case "imports":
              couplingIntensity = 0.7;
              break;
            case "references":
              couplingIntensity = 0.5;
              break;
            default:
              couplingIntensity = 0.4;
              break;
          }

          // 2. Bayesian edge confidence p = alpha / (alpha + beta)
          const edgeConfidence =
            edge.alpha + edge.beta > 0 ? edge.alpha / (edge.alpha + edge.beta) : 0.75;

          // 3. Afferent destination hub factor
          const dstInDeg = inDegrees.get(edge.dstId) ?? 0;
          const hubFactor = Math.min(1.0, dstInDeg / maxInDegree);

          // 4. Fuzzy violation degree computation:
          // Weighted blend: 0.35 coupling + 0.35 confidence + 0.30 destination blast radius
          const fuzzyDegree = Math.min(
            1.0,
            Math.max(0.0, 0.35 * couplingIntensity + 0.35 * edgeConfidence + 0.3 * hubFactor),
          );

          // 5. Categorize severity
          let severity: "Critical" | "Warning" | "Info";
          if (fuzzyDegree >= 0.75) {
            severity = "Critical";
          } else if (fuzzyDegree >= 0.45) {
            severity = "Warning";
          } else {
            severity = "Info";
          }

          const baseMsg =
            rule.message ??
            `Forbidden layer dependency: "${srcLayer}" must not depend on "${dstLayer}".`;
          const violationMsg = `${baseMsg} (${srcNode.name} -> ${dstNode.name} via ${edge.kind})`;

          violations.push({
            rule,
            srcNode,
            srcLayer,
            dstNode,
            dstLayer,
            edge,
            severity,
            fuzzyViolationDegree: Number(fuzzyDegree.toFixed(3)),
            message: violationMsg,
          });

          if (layerViolationCount.has(srcLayer)) {
            layerViolationCount.set(srcLayer, layerViolationCount.get(srcLayer)! + 1);
          }
        }
      }
    }

    // Sort violations: Critical first, then by fuzzy degree descending
    const severityRank: Record<string, number> = { Critical: 3, Warning: 2, Info: 1 };
    violations.sort((a, b) => {
      const diff = (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
      if (diff !== 0) return diff;
      return b.fuzzyViolationDegree - a.fuzzyViolationDegree;
    });

    // Calculate purity score:
    // Base 100, deducted by severity-weighted fuzzy penalties
    let totalPenalty = 0;
    for (const v of violations) {
      const weight = v.severity === "Critical" ? 15 : v.severity === "Warning" ? 6 : 2;
      totalPenalty += weight * v.fuzzyViolationDegree;
    }

    const purityScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

    // Assign letter grade
    let grade: "A" | "B" | "C" | "D" | "F";
    if (purityScore >= 90) {
      grade = "A";
    } else if (purityScore >= 80) {
      grade = "B";
    } else if (purityScore >= 65) {
      grade = "C";
    } else if (purityScore >= 50) {
      grade = "D";
    } else {
      grade = "F";
    }

    // Fuzzy linguistic evaluation of architectural boundary health
    const wClean = FuzzyInferenceEngine.trapmf(purityScore, 80, 90, 100, 100);
    const wFair = FuzzyInferenceEngine.trimf(purityScore, 60, 75, 85);
    const wFragile = FuzzyInferenceEngine.trimf(purityScore, 40, 55, 65);
    const wCritical = FuzzyInferenceEngine.trapmf(purityScore, 0, 0, 35, 45);

    let crispGrade: "Minimal" | "Low" | "Moderate" | "High" | "Critical";
    if (purityScore >= 85) crispGrade = "Minimal";
    else if (purityScore >= 70) crispGrade = "Low";
    else if (purityScore >= 50) crispGrade = "Moderate";
    else if (purityScore >= 30) crispGrade = "High";
    else crispGrade = "Critical";

    const fuzzyEvaluation: FuzzyEvaluationResult = {
      rawScore: purityScore,
      crispGrade,
      linguisticDistribution: {
        Clean: Math.round(wClean * 100) / 100,
        Fair: Math.round(wFair * 100) / 100,
        Fragile: Math.round(wFragile * 100) / 100,
        Critical: Math.round(wCritical * 100) / 100,
      },
      rationale:
        violations.length === 0
          ? `Clean architectural boundaries across all ${Object.keys(config.layers).length} layers.`
          : `Detected ${violations.length} boundary violations (${violations.filter((v) => v.severity === "Critical").length} critical breaches).`,
    };

    const layerStats = Object.keys(config.layers).map((layer) => ({
      layer,
      symbolCount: layerSymbolCount.get(layer) ?? 0,
      outboundCalls: layerOutboundCalls.get(layer) ?? 0,
      violationCount: layerViolationCount.get(layer) ?? 0,
    }));

    const summary =
      `Architectural Purity Score: ${purityScore}/100 [Grade ${grade} - Risk: ${crispGrade}]. ` +
      `Detected ${violations.length} boundary violations (${violations.filter((v) => v.severity === "Critical").length} Critical, ` +
      `${violations.filter((v) => v.severity === "Warning").length} Warning, ${violations.filter((v) => v.severity === "Info").length} Info) ` +
      `across ${Object.keys(config.layers).length} declared layers.`;

    return {
      purityScore,
      grade,
      totalViolations: violations.length,
      violations,
      layerStats,
      fuzzyEvaluation,
      summary,
    };
  }

  /**
   * Retrieves a built-in community architecture preset by name.
   */
  public static getPreset(name: string): ArchitectureConfig | undefined {
    const key = name.toLowerCase().replace(/_/g, "-") as ArchitecturePresetName;
    return ARCHITECTURE_PRESETS[key];
  }

  /**
   * Automatically inspects nodes and file paths to suggest a default Clean Architecture config,
   * or returns a specific named preset if provided.
   */
  public static generateDefaultConfig(
    nodes: readonly NodeRecord[],
    filePaths?: readonly string[],
    presetName?: string,
  ): ArchitectureConfig {
    if (presetName) {
      const preset = ArchitectureLinter.getPreset(presetName);
      if (preset) return preset;
    }

    const paths = new Set<string>();
    if (filePaths) {
      for (const p of filePaths) paths.add(p);
    }
    for (const n of nodes) {
      const p = n.qualifiedName.includes(":") ? n.qualifiedName.split(":")[0]! : n.qualifiedName;
      paths.add(p);
    }

    const allPaths = Array.from(paths);

    const hasCore = allPaths.some((p) => /core|domain|model|entity/i.test(p));
    const hasApp = allPaths.some((p) => /app|service|use-case|handler/i.test(p));
    const hasInfra = allPaths.some((p) => /infra|storage|store|db|database|repo/i.test(p));
    const hasPresentation = allPaths.some((p) => /cli|ui|view|controller|api|route|mcp/i.test(p));

    if (hasCore || hasApp || hasInfra || hasPresentation) {
      return ARCHITECTURE_PRESETS["clean-architecture"];
    }

    // Default 3-tier fallback template
    return {
      layers: {
        core: ["**/core/**", "src/types/**", "src/models/**"],
        services: ["src/services/**", "src/lib/**"],
        adapters: ["src/api/**", "src/cli/**", "src/db/**"],
      },
      rules: [
        {
          from: "core",
          disallow: ["services", "adapters"],
          message: "Core types and models must not depend on higher-level services or adapters.",
        },
        {
          from: "services",
          disallow: ["adapters"],
          message: "Services must not depend directly on adapters.",
        },
      ],
    };
  }
}

export type ArchitecturePresetName =
  | "clean-architecture"
  | "hexagonal"
  | "onion"
  | "feature-sliced-design"
  | "modular-monolith";

export const ARCHITECTURE_PRESETS: Record<ArchitecturePresetName, ArchitectureConfig> = {
  "clean-architecture": {
    layers: {
      domain: ["**/domain/**", "**/core/**", "**/models/**", "**/entities/**"],
      application: ["**/services/**", "**/use-cases/**", "**/handlers/**", "**/app/**"],
      infrastructure: [
        "**/infra/**",
        "**/infrastructure/**",
        "**/db/**",
        "**/store/**",
        "**/storage/**",
        "**/repositories/**",
      ],
      presentation: [
        "**/cli/**",
        "**/ui/**",
        "**/api/**",
        "**/routes/**",
        "**/controllers/**",
        "**/mcp/**",
      ],
    },
    rules: [
      {
        from: "domain",
        disallow: ["application", "infrastructure", "presentation"],
        message: "Domain entities must remain pure and free from outer layer dependencies.",
      },
      {
        from: "application",
        disallow: ["presentation"],
        message: "Application business services must not depend on presentation or UI layers.",
      },
      {
        from: "infrastructure",
        disallow: ["presentation"],
        message: "Infrastructure adapters must not depend on presentation layer.",
      },
    ],
  },
  hexagonal: {
    layers: {
      domain: ["**/domain/**", "**/entities/**", "**/model/**"],
      ports: ["**/ports/**", "**/interfaces/**", "**/contracts/**"],
      application: ["**/application/**", "**/usecases/**", "**/services/**"],
      adapters: [
        "**/adapters/**",
        "**/infra/**",
        "**/infrastructure/**",
        "**/primary/**",
        "**/secondary/**",
      ],
    },
    rules: [
      {
        from: "domain",
        disallow: ["ports", "application", "adapters"],
        message: "Hexagonal core domain must not depend on ports, application services, or external adapters.",
      },
      {
        from: "ports",
        disallow: ["adapters"],
        message: "Hexagonal ports must define contracts without depending on concrete infrastructure adapters.",
      },
      {
        from: "application",
        disallow: ["adapters"],
        message: "Hexagonal application use cases must invert dependencies and not import outer adapters directly.",
      },
    ],
  },
  onion: {
    layers: {
      domain_model: ["**/domain/models/**", "**/domain/entities/**", "**/domain/model/**"],
      domain_services: ["**/domain/services/**", "**/domain/rules/**"],
      application_services: ["**/application/**", "**/usecases/**", "**/use-cases/**"],
      infrastructure: ["**/infrastructure/**", "**/adapters/**", "**/persistence/**"],
      ui: ["**/ui/**", "**/controllers/**", "**/views/**", "**/api/**"],
    },
    rules: [
      {
        from: "domain_model",
        disallow: ["domain_services", "application_services", "infrastructure", "ui"],
        message: "Onion Domain Model (innermost core) cannot depend on any outer rings.",
      },
      {
        from: "domain_services",
        disallow: ["application_services", "infrastructure", "ui"],
        message: "Onion Domain Services cannot depend on application services or infrastructure.",
      },
      {
        from: "application_services",
        disallow: ["infrastructure", "ui"],
        message: "Onion Application Services cannot depend on external infrastructure or UI rings.",
      },
    ],
  },
  "feature-sliced-design": {
    layers: {
      shared: ["**/shared/**", "src/shared/**"],
      entities: ["**/entities/**", "src/entities/**"],
      features: ["**/features/**", "src/features/**"],
      widgets: ["**/widgets/**", "src/widgets/**"],
      pages: ["**/pages/**", "src/pages/**"],
      app: ["**/app/**", "src/app/**"],
    },
    rules: [
      {
        from: "shared",
        disallow: ["entities", "features", "widgets", "pages", "app"],
        message: "FSD: 'shared' slice is foundational and cannot import higher slices.",
      },
      {
        from: "entities",
        disallow: ["features", "widgets", "pages", "app"],
        message: "FSD: 'entities' slice can only import from 'shared', not higher slices.",
      },
      {
        from: "features",
        disallow: ["widgets", "pages", "app"],
        message: "FSD: 'features' slice cannot import widgets, pages, or app.",
      },
      {
        from: "widgets",
        disallow: ["pages", "app"],
        message: "FSD: 'widgets' slice cannot import pages or app.",
      },
      {
        from: "pages",
        disallow: ["app"],
        message: "FSD: 'pages' slice cannot import root app slice.",
      },
    ],
  },
  "modular-monolith": {
    layers: {
      shared_kernel: ["**/shared/**", "**/common/**", "**/kernel/**"],
      modules: ["**/modules/**", "**/packages/**"],
      entrypoints: ["**/api/**", "**/cli/**", "**/server/**", "**/main.*"],
    },
    rules: [
      {
        from: "shared_kernel",
        disallow: ["modules", "entrypoints"],
        message: "Shared kernel must have zero outbound dependencies to specific domain modules or entrypoints.",
      },
      {
        from: "modules",
        disallow: ["entrypoints"],
        message: "Domain modules must not import top-level server or CLI entrypoints.",
      },
    ],
  },
};

