import { describe, expect, it } from "vitest";
import {
  GlossaryExpander,
  IndonesianStemmer,
  detectLanguage,
} from "../index.js";

describe("@ruas/nlp IndonesianStemmer", () => {
  const stemmer = new IndonesianStemmer();

  it("stems common prefix and suffix derivations", () => {
    expect(stemmer.stem("menghitung")).toBe("hitung");
    expect(stemmer.stem("perhitungan")).toBe("hitung");
    expect(stemmer.stem("pembayaran")).toBe("bayar");
    expect(stemmer.stem("pengiriman")).toBe("kirim");
    expect(stemmer.stem("menyimpan")).toBe("simpan");
    expect(stemmer.stem("memotong")).toBe("potong");
    expect(stemmer.stem("diskonan")).toBe("diskon");
  });

  it("preserves already root words", () => {
    expect(stemmer.stem("diskon")).toBe("diskon");
    expect(stemmer.stem("ongkir")).toBe("ongkir");
    expect(stemmer.stem("pajak")).toBe("pajak");
  });
});

describe("@ruas/nlp LanguageDetector", () => {
  it("detects Indonesian queries", () => {
    const lang = detectLanguage("fungsi hitung diskon pelanggan");
    expect(lang).toBe("id");
  });

  it("detects English queries", () => {
    const lang = detectLanguage("calculate customer discount function");
    expect(lang).toBe("en");
  });

  it("detects mixed queries", () => {
    const lang = detectLanguage("handle callback pembayaran qris");
    expect(lang).toBe("mixed");
  });
});

describe("@ruas/nlp GlossaryExpander", () => {
  it("expands Indonesian query with English concepts", () => {
    const expander = new GlossaryExpander();
    const expanded = expander.expandQuery("hitung diskon pelanggan");

    expect(expanded.lang).toBe("id");
    expect(expanded.tokens).toContain("hitung");
    expect(expanded.tokens).toContain("diskon");
    expect(expanded.tokens).toContain("pelanggan");

    const expansionTerms = expanded.expansions.map((e) => e.term);
    expect(expansionTerms).toContain("calculate");
    expect(expansionTerms).toContain("discount");
    expect(expansionTerms).toContain("customer");

    expect(expanded.ftsQuery).toContain("discount");
    expect(expanded.ftsQuery).toContain("calculate");
  });

  it("loads and validates custom YAML glossary", () => {
    const expander = new GlossaryExpander();
    const customYaml = `
- term: faktur
  lang: id
  concepts: [tax_invoice, billing]
  weight: 0.95
`;
    expander.loadYaml(customYaml);
    const expanded = expander.expandQuery("buat faktur");
    const terms = expanded.expansions.map((e) => e.term);
    expect(terms).toContain("tax_invoice");
  });
});
