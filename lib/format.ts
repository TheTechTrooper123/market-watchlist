const nf = new Intl.NumberFormat("de-DE");

export function formatMarketCap(usd: number) {
  if (usd >= 1e12) return `${(usd / 1e12).toFixed(2).replace(".", ",")} Bio. $`;
  return `${nf.format(Math.round(usd / 1e9))} Mrd. $`;
}

export function formatPrice(price: number | null, currency: string) {
  if (price == null) return "—";
  const digits = price >= 1000 ? 0 : price >= 10 ? 2 : 3;
  return `${price.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${currency}`;
}

export function formatPct(p: number | null) {
  if (p == null || Number.isNaN(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2).replace(".", ",")} %`;
}

export function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
