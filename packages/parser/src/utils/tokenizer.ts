/**
 * Splits camelCase, PascalCase, snake_case, kebab-case, acronyms, and digits.
 * E.g. "parseHTTPResponse" -> "parse http response"
 * E.g. "hitungDiskon_pelanggan" -> "hitung diskon pelanggan"
 */
export function splitIdentifierTokens(identifier: string): readonly string[] {
  if (!identifier) {
    return [];
  }

  // Replace separators with spaces
  const cleaned = identifier
    .replace(/[_\-.:/]/g, " ")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // e.g. "HTTPResponse" -> "HTTP Response"
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // e.g. "parseHTTP" -> "parse HTTP"
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2") // e.g. "v2" -> "v 2"
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2");

  const tokens = cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return tokens;
}
