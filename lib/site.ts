/** Central links and endpoints of the site. */

export const REPOSITORY_URL = "https://github.com/TheTechTrooper123/market-watchlist";

export const SCREENER_RUNS_URL = `${REPOSITORY_URL}/actions/workflows/screen.yml`;

/** Snapshot and series are read from the repository at runtime (ISR). */
export const RAW_DATA_BASE =
  "https://raw.githubusercontent.com/TheTechTrooper123/market-watchlist/main/data";

/** Seconds until a page and its data are revalidated. */
export const REVALIDATE_SECONDS = 900;

export function yahooQuoteUrl(symbol: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}
