import { describe, expect, it } from "vitest";
import type { EdgeRecord, NodeRecord } from "@ruas/core";
import { LeidenCommunityDetector, SubsystemLabeler } from "../index.js";

describe("@ruas/rank Leiden Community Detection", () => {
  // Construct two distinct interconnected clusters:
  // Cluster 1 (Payments): pay_1, pay_2, pay_3
  // Cluster 2 (Logistics): ship_1, ship_2, ship_3
  // Weak cross-cluster bridge: pay_1 -> ship_1
  const paymentNodes = ["pay_1", "pay_2", "pay_3"];
  const logisticsNodes = ["ship_1", "ship_2", "ship_3"];
  const allNodes = [...paymentNodes, ...logisticsNodes];

  const edges: EdgeRecord[] = [
    // Internal payment edges (dense, high confidence)
    { id: "e1", srcId: "pay_1", dstId: "pay_2", kind: "calls", alpha: 10, beta: 1, evidenceJson: null },
    { id: "e2", srcId: "pay_2", dstId: "pay_3", kind: "calls", alpha: 10, beta: 1, evidenceJson: null },
    { id: "e3", srcId: "pay_3", dstId: "pay_1", kind: "calls", alpha: 10, beta: 1, evidenceJson: null },

    // Internal shipping edges (dense, high confidence)
    { id: "e4", srcId: "ship_1", dstId: "ship_2", kind: "calls", alpha: 10, beta: 1, evidenceJson: null },
    { id: "e5", srcId: "ship_2", dstId: "ship_3", kind: "calls", alpha: 10, beta: 1, evidenceJson: null },
    { id: "e6", srcId: "ship_3", dstId: "ship_1", kind: "calls", alpha: 10, beta: 1, evidenceJson: null },

    // Weak cross-cluster bridge
    { id: "e7", srcId: "pay_1", dstId: "ship_1", kind: "calls", alpha: 2, beta: 5, evidenceJson: null },
  ];

  it("detects distinct well-connected communities with positive modularity", () => {
    const detector = new LeidenCommunityDetector({ resolution: 1.0 });
    const result = detector.detect(allNodes, edges);

    expect(result.communities.length).toBe(2);
    expect(result.modularity).toBeGreaterThan(0.2);

    const comm1 = result.nodeToCommunity.get("pay_1");
    const comm2 = result.nodeToCommunity.get("pay_2");
    const commShip = result.nodeToCommunity.get("ship_1");

    expect(comm1).toBe(comm2); // payment nodes in same community
    expect(comm1).not.toBe(commShip); // payment and shipping in distinct communities
  });

  it("satisfies ARI stability threshold >= 0.75 across 10 random seeds", () => {
    const partitions: Array<Map<string, number>> = [];

    // Run Leiden with 10 different random seeds
    for (let seed = 1; seed <= 10; seed++) {
      const detector = new LeidenCommunityDetector({ randomSeed: seed * 100 });
      const result = detector.detect(allNodes, edges);
      partitions.push(new Map(result.nodeToCommunity));
    }

    // Compare pairwise ARI across all 10 seed runs
    let pairwiseCount = 0;
    let sumAri = 0;

    for (let i = 0; i < partitions.length; i++) {
      for (let j = i + 1; j < partitions.length; j++) {
        const ari = LeidenCommunityDetector.adjustedRandIndex(partitions[i]!, partitions[j]!);
        sumAri += ari;
        pairwiseCount++;
        expect(ari).toBeGreaterThanOrEqual(0.75);
      }
    }

    const meanAri = sumAri / pairwiseCount;
    expect(meanAri).toBeGreaterThanOrEqual(0.85); // Stable clustering across seeds
  });
});

describe("@ruas/rank SubsystemLabeler", () => {
  it("generates TF-IDF architectural labels for communities without external LLMs", () => {
    const communities = [
      { communityId: 0, nodeIds: ["n_qris", "n_va"] },
      { communityId: 1, nodeIds: ["n_ship", "n_resi"] },
    ];

    const nodes: NodeRecord[] = [
      {
        id: "n_qris",
        fileId: "f1",
        kind: "function",
        name: "processQrisPayment",
        qualifiedName: "processQrisPayment",
        startLine: 1,
        endLine: 10,
        signature: null,
        docComment: "Memproses verifikasi dan settlement pembayaran QRIS transaksi",
        tokens: "process qris payment verifikasi settlement pembayaran transaksi",
      },
      {
        id: "n_va",
        fileId: "f1",
        kind: "function",
        name: "createVirtualAccount",
        qualifiedName: "createVirtualAccount",
        startLine: 12,
        endLine: 20,
        signature: null,
        docComment: "Membuat nomor pembayaran virtual account bank transfer",
        tokens: "create virtual account pembayaran virtual account bank transfer",
      },
      {
        id: "n_ship",
        fileId: "f2",
        kind: "function",
        name: "calculateShippingFee",
        qualifiedName: "calculateShippingFee",
        startLine: 1,
        endLine: 10,
        signature: null,
        docComment: "Kalkulasi tarif ongkos kirim pengiriman ekspedisi logistik",
        tokens: "calculate shipping fee tarif ongkos kirim pengiriman ekspedisi logistik",
      },
      {
        id: "n_resi",
        fileId: "f2",
        kind: "function",
        name: "trackCourierResi",
        qualifiedName: "trackCourierResi",
        startLine: 12,
        endLine: 20,
        signature: null,
        docComment: "Lacak nomor resi airway bill kurir ekspedisi pengiriman",
        tokens: "track courier resi nomor resi airway bill kurir ekspedisi pengiriman",
      },
    ];

    const labeled = SubsystemLabeler.labelCommunities(communities, nodes, 3);
    expect(labeled.length).toBe(2);

    const comm0 = labeled.find((c) => c.communityId === 0);
    const comm1 = labeled.find((c) => c.communityId === 1);

    expect(comm0?.label).toBeDefined();
    expect(comm1?.label).toBeDefined();

    // Check payment keywords in comm 0
    expect(comm0!.label!).toMatch(/payment|qris|virtual|account/);
    // Check logistics keywords in comm 1
    expect(comm1!.label!).toMatch(/shipping|ekspedisi|kurir|resi/);
  });
});
