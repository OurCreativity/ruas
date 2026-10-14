import { INDONESIAN_ROOT_WORDS } from "./stemmer/root-words.js";
import { IndonesianStemmer } from "./stemmer/indonesian-stemmer.js";

export type DetectedLanguage = "id" | "en" | "mixed";

const COMMON_ID_MARKERS = new Set([
  "yang", "di", "dan", "ini", "untuk", "dari", "dengan", "ke", "akan",
  "pada", "bisa", "ada", "tidak", "jika", "atau", "adalah", "fungsi",
  "hitung", "diskon", "pelanggan", "ongkir", "bayar", "pajak", "ambil",
  "data", "buat", "ubah", "hapus", "cari", "kirim", "lapor", "transaksi",
  "tagihan", "saldo", "rekening", "nomor", "sukses", "gagal", "qris",
  "pembayaran", "pengiriman", "pesanan", "kupon", "faktur",
]);

const COMMON_EN_MARKERS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "function", "calculate", "discount", "customer", "shipping", "pay",
  "tax", "get", "create", "update", "delete", "find", "send", "report",
  "transaction", "bill", "balance", "account", "number", "success", "failed",
  "handle", "handler", "callback", "service", "controller", "repository", "route",
]);

const stemmer = new IndonesianStemmer();

export function detectLanguage(text: string): DetectedLanguage {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) {
    return "en";
  }

  let idScore = 0;
  let enScore = 0;

  for (const word of words) {
    const stemmed = stemmer.stem(word);
    const isId =
      COMMON_ID_MARKERS.has(word) ||
      COMMON_ID_MARKERS.has(stemmed) ||
      INDONESIAN_ROOT_WORDS.has(word) ||
      INDONESIAN_ROOT_WORDS.has(stemmed);

    const isEn = COMMON_EN_MARKERS.has(word);

    if (isId && isEn) {
      idScore += 0.5;
      enScore += 0.5;
    } else if (isId) {
      idScore += 1;
    } else if (isEn) {
      enScore += 1;
    }
  }

  if (idScore > 0 && enScore > 0) {
    return "mixed";
  }

  if (idScore > enScore) {
    return "id";
  }

  return "en";
}

