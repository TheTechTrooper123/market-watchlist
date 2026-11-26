/**
 * Share-class rules: which listings are common shares, how companies are
 * identified across venues, and which class wins when a company lists several.
 */

/** Legal forms stripped from company names so that listings can be matched. */
const LEGAL_SUFFIXES = [
  "incorporated", "inc", "corp", "corporation", "company", "co", "limited", "ltd",
  "plc", "ag", "se", "spa", "nv", "sa", "ab", "asa", "oyj", "kk", "bhd", "berhad",
  "tbk", "pte", "lp", "llc", "holding", "holdings", "group", "the", "class",
];

/** Names that mark a listing as something other than a common share. */
const NON_COMMON_STOCK_PATTERNS = [
  /depositary|depository|\badrs?\b|\bgdrs?\b|\bads\b|sponsored/i,
  /\bfund\b|\betf\b|investment trust|\btrust units\b|\bunit trust\b/i,
  /preference|preferred|\bpref\b|\bpfd\b|vorzugsaktie|\bvorz\b/i,
  /\bbond\b|\bnote\b|\bnotes\b|\bnts\b|anleihe|obligation|\b[0-9.,]+ ?% ?bd|\bbds?\b/i,
  /certificate|\bcert\b|warrant|rights issue/i,
  /\bkdrs?\b|\bcross listing\b|\bprimary listing\b|\bsecondary listing\b/i,
];

/** Company key: name without accents, punctuation and legal suffixes. */
export function normalizeName(name) {
  const cleaned = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ");
  while (parts.length > 1 && LEGAL_SUFFIXES.includes(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join(" ").replace(/\s+/g, "");
}

/** Ticker digits of a listing, e.g. "005930" for "005930.KS". */
function tickerDigits(quote) {
  return String(quote.symbol).split(".")[0];
}

/** Drops depositary receipts, funds, preference shares, bonds and certificates. */
export function isNonCommonStock(quote) {
  const name = quote.longName || quote.shortName || "";
  if (!name) return true;
  if (/%/.test(name)) return true;
  if (NON_COMMON_STOCK_PATTERNS.some((pattern) => pattern.test(name))) return true;

  // Korean preference lines carry the same name as the common stock and differ
  // only in the ticker: 0 = common, 5/7/9 = preferred.
  if (quote.__venue === "KSC") {
    const digits = tickerDigits(quote);
    if (/^\d{6}$/.test(digits) && !digits.endsWith("0")) return true;
  }
  // Brazilian preferred shares (PETR4) versus common shares (PETR3).
  if (quote.__venue === "SAO") {
    const digits = tickerDigits(quote);
    if (/\d$/.test(digits) && !digits.endsWith("3")) return true;
  }
  return false;
}

/** Common shares rank above preferred lines when a company lists several. */
export function shareClassRank(quote) {
  const digits = tickerDigits(quote);
  if (quote.__venue === "SAO") return digits.endsWith("3") ? 2 : 1;
  if (quote.__venue === "KSC") return digits.endsWith("0") ? 2 : 1;
  return 1;
}
