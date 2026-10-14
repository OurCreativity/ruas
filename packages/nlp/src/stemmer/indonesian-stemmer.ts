import { INDONESIAN_ROOT_WORDS } from "./root-words.js";

/**
 * Clean-room TypeScript implementation of the Nazief-Adriani morphological stemmer
 * for Bahasa Indonesia.
 */
export class IndonesianStemmer {
  private readonly dictionary: ReadonlySet<string>;

  constructor(customDictionary?: ReadonlySet<string>) {
    this.dictionary = customDictionary ?? INDONESIAN_ROOT_WORDS;
  }

  public stem(word: string): string {
    const original = word.toLowerCase().trim();
    if (original.length <= 3) {
      return original;
    }

    if (this.dictionary.has(original)) {
      return original;
    }

    let current = original;

    // Step 2: Remove inflectional particle (-lah, -kah, -pun)
    const particleStripped = this.removeParticle(current);
    if (this.dictionary.has(particleStripped)) {
      return particleStripped;
    }
    current = particleStripped;

    // Step 3: Remove inflectional possessive pronoun (-ku, -mu, -nya)
    const possessiveStripped = this.removePossessive(current);
    if (this.dictionary.has(possessiveStripped)) {
      return possessiveStripped;
    }
    current = possessiveStripped;

    // Step 4: Remove derivational suffix (-kan, -an, -i)
    const suffixStripped = this.removeSuffix(current);
    if (this.dictionary.has(suffixStripped)) {
      return suffixStripped;
    }

    // Step 5: Remove derivational prefix (di-, meng-, peng-, ber-, ter-, ke-, se-)
    // Try with suffix stripped first, then with current
    const fromSuffix = this.removePrefix(suffixStripped);
    if (this.dictionary.has(fromSuffix)) {
      return fromSuffix;
    }

    const fromCurrent = this.removePrefix(current);
    if (this.dictionary.has(fromCurrent)) {
      return fromCurrent;
    }

    // Return the shortest candidate stripped word if it's reasonable
    const candidates = [fromSuffix, suffixStripped, fromCurrent, current].filter(
      (c) => c.length >= 3 && this.dictionary.has(c),
    );

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.length - b.length);
      return candidates[0]!;
    }

    return fromSuffix.length >= 3 ? fromSuffix : original;
  }

  private removeParticle(word: string): string {
    if (word.endsWith("lah") || word.endsWith("kah") || word.endsWith("tah")) {
      return word.slice(0, -3);
    }
    if (word.endsWith("pun")) {
      return word.slice(0, -3);
    }
    return word;
  }

  private removePossessive(word: string): string {
    if (word.endsWith("nya")) {
      return word.slice(0, -3);
    }
    if (word.endsWith("ku") || word.endsWith("mu")) {
      return word.slice(0, -2);
    }
    return word;
  }

  private removeSuffix(word: string): string {
    if (word.endsWith("kan")) {
      return word.slice(0, -3);
    }
    if (word.endsWith("an")) {
      return word.slice(0, -2);
    }
    if (word.endsWith("i")) {
      return word.slice(0, -1);
    }
    return word;
  }

  private removePrefix(word: string): string {
    // di-, ke-, se-
    if (word.startsWith("di") || word.startsWith("ke") || word.startsWith("se")) {
      const rest = word.slice(2);
      if (this.dictionary.has(rest)) {
        return rest;
      }
    }

    // ber-, ter-, per-
    if (word.startsWith("ber") || word.startsWith("ter") || word.startsWith("per")) {
      const rest = word.slice(3);
      if (this.dictionary.has(rest)) {
        return rest;
      }
      if (rest.startsWith("r") && this.dictionary.has(rest.slice(1))) {
        return rest.slice(1);
      }
    }

    // meng- rules
    if (word.startsWith("meng")) {
      const rest = word.slice(4);
      if (this.dictionary.has(rest)) {
        return rest; // e.g. menghitung -> hitung
      }
      if (this.dictionary.has(`k${rest}`)) {
        return `k${rest}`; // e.g. mengait -> kait, mengira -> kira
      }
    }

    // meny- -> s-
    if (word.startsWith("meny")) {
      const rest = `s${word.slice(4)}`;
      if (this.dictionary.has(rest)) {
        return rest; // e.g. menyimpan -> simpan
      }
    }

    // mem- rules
    if (word.startsWith("mem")) {
      const rest = word.slice(3);
      if (this.dictionary.has(rest)) {
        return rest; // e.g. membayar -> bayar
      }
      if (this.dictionary.has(`p${rest}`)) {
        return `p${rest}`; // e.g. memotong -> potong
      }
    }

    // men- rules
    if (word.startsWith("men")) {
      const rest = word.slice(3);
      if (this.dictionary.has(rest)) {
        return rest; // e.g. mendata -> data
      }
      if (this.dictionary.has(`t${rest}`)) {
        return `t${rest}`; // e.g. menulis -> tulis
      }
    }

    // me- rules
    if (word.startsWith("me")) {
      const rest = word.slice(2);
      if (this.dictionary.has(rest)) {
        return rest; // e.g. melihat -> lihat
      }
    }

    // peng- rules
    if (word.startsWith("peng")) {
      const rest = word.slice(4);
      if (this.dictionary.has(rest)) {
        return rest; // e.g. penghitung -> hitung
      }
      if (this.dictionary.has(`k${rest}`)) {
        return `k${rest}`; // e.g. pengirim -> kirim
      }
    }

    // peny- -> s-
    if (word.startsWith("peny")) {
      const rest = `s${word.slice(4)}`;
      if (this.dictionary.has(rest)) {
        return rest; // e.g. penyimpan -> simpan
      }
    }

    // pem- rules
    if (word.startsWith("pem")) {
      const rest = word.slice(3);
      if (this.dictionary.has(rest)) {
        return rest; // e.g. pembayaran -> bayar
      }
      if (this.dictionary.has(`p${rest}`)) {
        return `p${rest}`; // e.g. pemotong -> potong
      }
    }

    // pen- rules
    if (word.startsWith("pen")) {
      const rest = word.slice(3);
      if (this.dictionary.has(rest)) {
        return rest;
      }
      if (this.dictionary.has(`t${rest}`)) {
        return `t${rest}`;
      }
    }

    // pel- rules (pelanggan -> langgan)
    if (word.startsWith("pel")) {
      const rest = word.slice(3);
      if (this.dictionary.has(rest)) {
        return rest;
      }
    }

    // pe- rules
    if (word.startsWith("pe")) {
      const rest = word.slice(2);
      if (this.dictionary.has(rest)) {
        return rest;
      }
    }

    return word;
  }
}
