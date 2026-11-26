const nf = new Intl.NumberFormat("de-DE");

export function formatInteger(value: number) {
  return nf.format(value);
}

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

export function formatPct(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2).replace(".", ",")} %`;
}

export function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Direction of a daily change, used as CSS modifier. */
export function changeTone(changePct: number | null): "up" | "down" | "flat" {
  if (changePct == null) return "flat";
  if (changePct > 0) return "up";
  if (changePct < 0) return "down";
  return "flat";
}
