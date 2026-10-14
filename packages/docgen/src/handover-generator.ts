import type { EdgeRecord, FileRecord, NodeRecord } from "@ruas/core";
import {
  LeidenCommunityDetector,
  PersonalizedPageRank,
  SubsystemLabeler,
  type CommunityPartition,
} from "@ruas/rank";
import type { Storage } from "@ruas/store";

export interface HandoverOptions {
  readonly projectName?: string;
  readonly repoRoot?: string;
  readonly topHubsPerSubsystem?: number;
  readonly maxBottlenecks?: number;
}

export interface HandoverDocument {
  readonly title: string;
  readonly generatedAt: string;
  readonly markdown: string;
  readonly subsystemCount: number;
  readonly totalNodesCited: number;
  readonly communities: readonly CommunityPartition[];
}

export class HandoverGenerator {
  private readonly projectName: string;
  private readonly topHubsPerSubsystem: number;
  private readonly maxBottlenecks: number;

  constructor(options?: HandoverOptions) {
    this.projectName = options?.projectName ?? "Ruas Project";
    this.topHubsPerSubsystem = options?.topHubsPerSubsystem ?? 5;
    this.maxBottlenecks = options?.maxBottlenecks ?? 5;
  }

  public async generate(storage: Storage): Promise<HandoverDocument> {
    const files = await storage.getAllFiles();
    const fileMap = new Map<string, FileRecord>();
    for (const f of files) {
      fileMap.set(f.id, f);
    }

    const allNodes: NodeRecord[] = [];
    const nonFileNodes: NodeRecord[] = [];
    const nodeMap = new Map<string, NodeRecord>();

    for (const f of files) {
      const fileNodes = await storage.getNodesByFileId(f.id);
      for (const n of fileNodes) {
        allNodes.push(n);
        nodeMap.set(n.id, n);
        if (n.kind !== "file") {
          nonFileNodes.push(n);
        }
      }
    }

    const allEdges = await storage.getAllEdges();

    // In-degree & Out-degree calculation for bottleneck analysis
    const inDegrees = new Map<string, number>();
    const outDegrees = new Map<string, number>();
    const edgeWeights = new Map<string, number[]>();

    for (const edge of allEdges) {
      inDegrees.set(edge.dstId, (inDegrees.get(edge.dstId) ?? 0) + 1);
      outDegrees.set(edge.srcId, (outDegrees.get(edge.srcId) ?? 0) + 1);

      const confidence = edge.alpha / (edge.alpha + edge.beta);
      const weights = edgeWeights.get(edge.dstId) ?? [];
      weights.push(confidence);
      edgeWeights.set(edge.dstId, weights);
    }

    // Community detection with Leiden
    const nonFileNodeIds = nonFileNodes.map((n) => n.id);
    const detector = new LeidenCommunityDetector({ resolution: 1.0, maxIterations: 15 });
    const rawCommunities = detector.detect(nonFileNodeIds, allEdges);

    // Label communities using TF-IDF
    const labeledCommunities = SubsystemLabeler.labelCommunities(
      rawCommunities.communities,
      nonFileNodes,
      3,
    );

    // Calculate PageRank to find primary hubs
    const ppr = new PersonalizedPageRank({ damping: 0.85, maxIterations: 20 });
    const seeds = new Map<string, number>();
    const uniformSeed = 1.0 / (nonFileNodeIds.length || 1);
    for (const id of nonFileNodeIds) {
      seeds.set(id, uniformSeed);
    }
    const pprList = ppr.compute(nonFileNodeIds, allEdges, seeds);
    const pprScores = new Map<string, number>();
    for (const item of pprList) {
      pprScores.set(item.nodeId, item.score);
    }

    // Track all cited nodes for the zero-uncited-claims verification matrix
    const citedNodes = new Map<string, NodeRecord>();

    const formatCitation = (node: NodeRecord): string => {
      citedNodes.set(node.id, node);
      const file = fileMap.get(node.fileId);
      const relPath = file ? file.path : "unknown";
      return `[\`${node.name}\`](file://${relPath}#L${node.startLine}-L${node.endLine}) (\`${relPath}:${node.startLine}-${node.endLine}\`)`;
    };

    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    lines.push(`# Dokumen Handover & Panduan Onboarding Arsitektur Sistem`);
    lines.push(``);
    lines.push(`> **Proyek:** ${this.projectName}  `);
    lines.push(`> **Waktu Pembuatan:** \`${timestamp}\`  `);
    lines.push(`> **Total File:** ${files.length} | **Total Simbol AST:** ${nonFileNodes.length} | **Total Relasi:** ${allEdges.length} | **Sub-sistem Terdeteksi:** ${labeledCommunities.length}  `);
    lines.push(`> **Prinsip Dokumentasi:** *Zero Uncited Claims* — Setiap klaim fungsional dan arsitektural wajib menyertakan tautan langsung ke nomor baris kode sumber asli.`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    // SECTION 1
    lines.push(`## 1. Ringkasan Topologi & Sub-sistem Terdeteksi (Leiden Partitioning)`);
    lines.push(``);
    lines.push(`Melalui algoritma partisi graf modularitas terarah (Leiden) dan penamaan TF-IDF bebas LLM eksternal, basis kode ini secara otomatis terkelompokkan ke dalam beberapa sub-sistem fungsional berikut:`);
    lines.push(``);

    if (labeledCommunities.length === 0) {
      lines.push(`*Tidak ada sub-sistem signifikan yang terdeteksi (basis kode kosong atau belum diindeks).*`);
    } else {
      for (const comm of labeledCommunities) {
        const commNodes = comm.nodeIds
          .map((id) => nodeMap.get(id))
          .filter((n): n is NodeRecord => n !== undefined);

        // Sort by PageRank within community
        commNodes.sort((a, b) => (pprScores.get(b.id) ?? 0) - (pprScores.get(a.id) ?? 0));
        const topHubs = commNodes.slice(0, this.topHubsPerSubsystem);

        lines.push(`### Sub-sistem: \`${comm.label}\` (Klaster #${comm.communityId})`);
        lines.push(`- **Kepadatan Simbol:** ${comm.nodeIds.length} simbol.`);
        lines.push(`- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**`);

        for (const hub of topHubs) {
          lines.push(`  - ${formatCitation(hub)} [Tipe: \`${hub.kind}\`]`);
          if (hub.signature) {
            lines.push(`    - *Signature:* \`${hub.signature}\``);
          }
          if (hub.docComment) {
            lines.push(`    - *Deskripsi:* ${hub.docComment.trim()}`);
          }
        }
        lines.push(``);
      }
    }

    lines.push(`---`);
    lines.push(``);

    // SECTION 2
    lines.push(`## 2. Titik Masuk Utama & Titik Interaksi Eksternal (Entry Points)`);
    lines.push(``);
    lines.push(`Berikut adalah simbol-simbol yang berfungsi sebagai pintu masuk (entry points, routes, atau pengendali utama) yang menerima pemicu dari luar atau CLI/HTTP:`);
    lines.push(``);

    const entryPoints = nonFileNodes.filter(
      (n) => n.kind === "route" || (inDegrees.get(n.id) ?? 0) === 0 && (outDegrees.get(n.id) ?? 0) > 0,
    );

    if (entryPoints.length === 0) {
      lines.push(`*Tidak terdeteksi entry point publik spesifik; sistem kemungkinan berupa modul perpustakaan (library).*`);
    } else {
      lines.push(`| Simbol Entry Point | Tipe | Lokasi Berkas & Baris | Jumlah Panggilan Keluar |`);
      lines.push(`| :--- | :--- | :--- | :--- |`);
      for (const ep of entryPoints.slice(0, 15)) {
        const file = fileMap.get(ep.fileId);
        const relPath = file ? file.path : "unknown";
        citedNodes.set(ep.id, ep);
        lines.push(`| [\`${ep.name}\`](file://${relPath}#L${ep.startLine}-L${ep.endLine}) | \`${ep.kind}\` | \`${relPath}:${ep.startLine}-${ep.endLine}\` | ${outDegrees.get(ep.id) ?? 0} |`);
      }
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    // SECTION 3: EMOTIONAL DAMAGE AUDIT
    lines.push(`## 3. Audit Titik Rawan Bencana ("Emotional Damage" Technical Debt Audit)`);
    lines.push(``);
    lines.push(`> [!WARNING]`);
    lines.push(`> Analisis tanpa kompromi terhadap simpul-simpul berisiko tinggi. Jika salah satu komponen di bawah ini diubah tanpa mitigasi uji komprehensif, efek domino (*blast radius*) dapat melumpuhkan sistem.`);
    lines.push(``);

    // Sort by in-degree descending (bottlenecks)
    const sortedByInDegree = [...nonFileNodes].sort(
      (a, b) => (inDegrees.get(b.id) ?? 0) - (inDegrees.get(a.id) ?? 0),
    );

    const bottlenecks = sortedByInDegree.filter((n) => (inDegrees.get(n.id) ?? 0) >= 2).slice(0, this.maxBottlenecks);

    if (bottlenecks.length === 0) {
      lines.push(`*Kabar baik: Tidak ditemukan simpul sentral dengan beban ketergantungan ekstrem (in-degree $\ge 2$). Kopling sistem relatif longgar.*`);
    } else {
      lines.push(`### Titik Kemacetan Sentral (Single Points of Failure)`);
      lines.push(`Komponen-komponen berikut dipanggil oleh banyak modul lain secara bersamaan:`);
      lines.push(``);

      for (const bn of bottlenecks) {
        const callers = inDegrees.get(bn.id) ?? 0;
        const weights = edgeWeights.get(bn.id) ?? [1.0];
        const avgConfidence = weights.reduce((acc, w) => acc + w, 0) / weights.length;
        const confPct = (avgConfidence * 100).toFixed(1);

        lines.push(`- **Simbol Kritis:** ${formatCitation(bn)}`);
        lines.push(`  - **Beban Pemanggil (Blast Radius Inbound):** Dipanggil langsung oleh **${callers}** modul/fungsi lain.`);
        lines.push(`  - **Tingkat Keyakinan Relasi Bayesian:** \`${confPct}%\``);
        lines.push(`  - **Peringatan Dampak:** Setiap perubahan *signature* atau perilaku kembalian (*return type*) pada ${formatCitation(bn)} berpotensi memicu galat runtime pada setidaknya ${callers} titik downstream.`);
        lines.push(``);
      }
    }

    // Ambiguous edges warning
    const ambiguousEdges = allEdges.filter((e) => e.alpha / (e.alpha + e.beta) < 0.60);
    if (ambiguousEdges.length > 0) {
      lines.push(`### Relasi Ambigius / Panggilan Dinamis`);
      lines.push(`Ditemukan **${ambiguousEdges.length}** relasi pemanggilan dengan derajat keyakinan Bayesian $< 60\%$ (misalnya pemanggilan dinamis via *magic method* atau polimorfisme PHP/TS). Perlu pengujian manual ekstra pada lintasan ini.`);
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);

    // SECTION 4: TRACEABILITY MATRIX
    lines.push(`## 4. Matriks Ketertelusuran Sitasi Kode (Zero Uncited Claims Audit)`);
    lines.push(``);
    lines.push(`Daftar lengkap seluruh simbol yang dikutip dalam dokumen ini beserta koordinat presisi berkas dan baris kodenya:`);
    lines.push(``);
    lines.push(`| Simbol | Tipe Simbol | Berkas Sumber | Baris Mulai | Baris Selesai |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);

    for (const node of citedNodes.values()) {
      const file = fileMap.get(node.fileId);
      const relPath = file ? file.path : "unknown";
      lines.push(`| \`${node.name}\` | \`${node.kind}\` | [${relPath}](file://${relPath}#L${node.startLine}-L${node.endLine}) | \`${node.startLine}\` | \`${node.endLine}\` |`);
    }

    lines.push(``);

    const markdown = lines.join("\n");

    return {
      title: "Dokumen Handover & Panduan Onboarding Arsitektur Sistem",
      generatedAt: timestamp,
      markdown,
      subsystemCount: labeledCommunities.length,
      totalNodesCited: citedNodes.size,
      communities: labeledCommunities,
    };
  }
}
