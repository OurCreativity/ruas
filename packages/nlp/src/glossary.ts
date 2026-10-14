import { parse } from "yaml";
import { z } from "zod";
import type { GlossaryTerm } from "@ruas/core";
import { detectLanguage, type DetectedLanguage } from "./language-detector.js";
import { IndonesianStemmer } from "./stemmer/indonesian-stemmer.js";

export const GlossaryTermSchema = z.object({
  term: z.string().min(1),
  lang: z.string().min(2),
  concepts: z.array(z.string().min(1)).min(1),
  weight: z.number().positive().max(1).default(0.9),
});

export const GlossaryFileSchema = z.array(GlossaryTermSchema);

export const DEFAULT_GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  // E-Commerce & Retail
  { term: "diskon", lang: "id", concepts: ["discount", "rebate", "promo"], weight: 0.9 },
  { term: "ongkir", lang: "id", concepts: ["shipping_cost", "delivery_fee", "freight"], weight: 0.9 },
  { term: "pelanggan", lang: "id", concepts: ["customer", "client", "buyer"], weight: 0.9 },
  { term: "keranjang", lang: "id", concepts: ["cart", "basket"], weight: 0.9 },
  { term: "pesanan", lang: "id", concepts: ["order", "purchase"], weight: 0.9 },
  { term: "produk", lang: "id", concepts: ["product", "item", "merchandise"], weight: 0.9 },
  { term: "katalog", lang: "id", concepts: ["catalog", "inventory"], weight: 0.9 },
  { term: "retur", lang: "id", concepts: ["refund", "return"], weight: 0.9 },
  { term: "kupon", lang: "id", concepts: ["coupon", "voucher"], weight: 0.9 },
  { term: "ulasan", lang: "id", concepts: ["review", "rating"], weight: 0.9 },
  { term: "penjual", lang: "id", concepts: ["merchant", "seller", "vendor"], weight: 0.9 },
  { term: "pembeli", lang: "id", concepts: ["buyer", "purchaser"], weight: 0.9 },
  { term: "stok", lang: "id", concepts: ["stock", "quantity", "inventory"], weight: 0.9 },
  { term: "toko", lang: "id", concepts: ["shop", "store"], weight: 0.9 },

  // Payments & Banking
  { term: "pembayaran", lang: "id", concepts: ["payment", "checkout", "transaction"], weight: 0.9 },
  { term: "qris", lang: "id", concepts: ["qris", "qr_payment", "barcode_pay"], weight: 0.95 },
  { term: "rekening", lang: "id", concepts: ["account", "bank_account"], weight: 0.9 },
  { term: "saldo", lang: "id", concepts: ["balance", "funds"], weight: 0.9 },
  { term: "tagihan", lang: "id", concepts: ["invoice", "bill"], weight: 0.9 },
  { term: "transfer", lang: "id", concepts: ["transfer", "disbursement"], weight: 0.9 },
  { term: "dompet", lang: "id", concepts: ["wallet", "ewallet"], weight: 0.9 },
  { term: "topup", lang: "id", concepts: ["deposit", "topup", "recharge"], weight: 0.9 },
  { term: "biaya", lang: "id", concepts: ["fee", "cost", "charge"], weight: 0.9 },
  { term: "bunga", lang: "id", concepts: ["interest", "rate"], weight: 0.9 },
  { term: "denda", lang: "id", concepts: ["penalty", "fine"], weight: 0.9 },
  { term: "cicilan", lang: "id", concepts: ["installment", "plan"], weight: 0.9 },
  { term: "mutasi", lang: "id", concepts: ["statement", "history"], weight: 0.9 },
  { term: "lunas", lang: "id", concepts: ["settled", "paid"], weight: 0.9 },

  // Taxes & Accounting
  { term: "pajak", lang: "id", concepts: ["tax", "levy"], weight: 0.9 },
  { term: "npwp", lang: "id", concepts: ["tax_id", "tin"], weight: 0.95 },
  { term: "ppn", lang: "id", concepts: ["vat", "value_added_tax"], weight: 0.95 },
  { term: "faktur", lang: "id", concepts: ["invoice", "tax_invoice"], weight: 0.9 },
  { term: "spt", lang: "id", concepts: ["annual_tax_return"], weight: 0.9 },
  { term: "pph", lang: "id", concepts: ["income_tax"], weight: 0.95 },
  { term: "tarif", lang: "id", concepts: ["rate", "tariff"], weight: 0.9 },

  // Logistics & Warehouse
  { term: "resi", lang: "id", concepts: ["tracking_number", "waybill", "awb"], weight: 0.95 },
  { term: "gudang", lang: "id", concepts: ["warehouse", "storage", "fulfillment"], weight: 0.9 },
  { term: "ekspedisi", lang: "id", concepts: ["courier", "carrier", "logistics"], weight: 0.9 },
  { term: "pengiriman", lang: "id", concepts: ["shipment", "dispatch", "delivery"], weight: 0.9 },
  { term: "kurir", lang: "id", concepts: ["courier", "driver"], weight: 0.9 },
  { term: "lacak", lang: "id", concepts: ["track", "trace"], weight: 0.9 },
  { term: "tujuan", lang: "id", concepts: ["destination", "address"], weight: 0.9 },
  { term: "berat", lang: "id", concepts: ["weight", "mass"], weight: 0.9 },

  // HR & Payroll
  { term: "gaji", lang: "id", concepts: ["salary", "payroll", "wage"], weight: 0.9 },
  { term: "bpjs", lang: "id", concepts: ["health_insurance", "social_security"], weight: 0.95 },
  { term: "thr", lang: "id", concepts: ["holiday_allowance", "bonus"], weight: 0.95 },
  { term: "lembur", lang: "id", concepts: ["overtime"], weight: 0.9 },
  { term: "absensi", lang: "id", concepts: ["attendance", "clock_in"], weight: 0.9 },
  { term: "karyawan", lang: "id", concepts: ["employee", "staff"], weight: 0.9 },
  { term: "tunjangan", lang: "id", concepts: ["allowance", "benefit"], weight: 0.9 },
  { term: "potongan", lang: "id", concepts: ["deduction", "withholding"], weight: 0.9 },
  { term: "cuti", lang: "id", concepts: ["leave", "time_off"], weight: 0.9 },

  { term: "hitung", lang: "id", concepts: ["calculate", "compute", "count"], weight: 0.9 },
  { term: "ambil", lang: "id", concepts: ["get", "fetch", "retrieve"], weight: 0.9 },
  { term: "buat", lang: "id", concepts: ["create", "generate", "make"], weight: 0.9 },
  { term: "ubah", lang: "id", concepts: ["update", "modify", "edit"], weight: 0.9 },
  { term: "hapus", lang: "id", concepts: ["delete", "remove", "destroy"], weight: 0.9 },
  { term: "simpan", lang: "id", concepts: ["save", "store", "persist"], weight: 0.9 },
  { term: "cari", lang: "id", concepts: ["find", "search", "lookup"], weight: 0.9 },
  { term: "kirim", lang: "id", concepts: ["send", "dispatch", "emit"], weight: 0.9 },
  { term: "proses", lang: "id", concepts: ["process", "handle", "execute"], weight: 0.9 },
  { term: "validasi", lang: "id", concepts: ["validate", "verify", "check"], weight: 0.9 },
  { term: "lapor", lang: "id", concepts: ["report", "log"], weight: 0.9 },
  { term: "atur", lang: "id", concepts: ["configure", "setup", "manage"], weight: 0.9 },
  { term: "batal", lang: "id", concepts: ["cancel", "revoke", "abort", "void"], weight: 0.9 },
  { term: "cek", lang: "id", concepts: ["check", "inspect", "verify"], weight: 0.9 },
  { term: "tarik", lang: "id", concepts: ["withdraw", "pull", "fetch"], weight: 0.9 },
  { term: "bayar", lang: "id", concepts: ["pay", "payment", "settle", "checkout"], weight: 0.95 },
];

export interface ExpandedQuery {
  readonly raw: string;
  readonly lang: DetectedLanguage;
  readonly tokens: readonly string[];
  readonly stemmedTokens: readonly string[];
  readonly expansions: readonly { readonly term: string; readonly weight: number }[];
  readonly ftsQuery: string;
}

export class GlossaryExpander {
  private readonly termMap = new Map<string, GlossaryTerm>();
  private readonly stemmer: IndonesianStemmer;

  constructor(customTerms?: readonly GlossaryTerm[]) {
    this.stemmer = new IndonesianStemmer();
    const terms = customTerms ?? DEFAULT_GLOSSARY_TERMS;
    for (const item of terms) {
      this.termMap.set(item.term.toLowerCase(), item);
    }
  }

  public loadYaml(yamlText: string): void {
    const raw = parse(yamlText);
    const parsed = GlossaryFileSchema.parse(raw);
    for (const item of parsed) {
      this.termMap.set(item.term.toLowerCase(), item);
    }
  }

  public expandQuery(rawQuery: string): ExpandedQuery {
    const lang = detectLanguage(rawQuery);
    const tokens = rawQuery
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const stemmedTokens: string[] = [];
    const expansions: { term: string; weight: number }[] = [];
    const seenExpansions = new Set<string>();

    for (const tok of tokens) {
      const stem = this.stemmer.stem(tok);
      stemmedTokens.push(stem);

      // Check glossary on original and stemmed
      const match = this.termMap.get(tok) ?? this.termMap.get(stem);
      if (match) {
        for (const concept of match.concepts) {
          const normConcept = concept.toLowerCase();
          if (!seenExpansions.has(normConcept) && normConcept !== tok && normConcept !== stem) {
            seenExpansions.add(normConcept);
            expansions.push({ term: normConcept, weight: match.weight });
          }
        }
      }
    }

    // Build FTS5 match query with OR expansion
    // E.g. "hitung OR calculate OR diskon OR discount"
    const queryParts = new Set<string>();
    for (const t of tokens) {
      queryParts.add(t);
    }
    for (const s of stemmedTokens) {
      queryParts.add(s);
    }
    for (const exp of expansions) {
      queryParts.add(exp.term);
    }

    const ftsQuery = Array.from(queryParts).join(" OR ");

    return {
      raw: rawQuery,
      lang,
      tokens,
      stemmedTokens,
      expansions,
      ftsQuery,
    };
  }
}
