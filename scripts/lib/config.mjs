/**
 * Static configuration of the screener: thresholds, rate limits, venues and the
 * mapping of company domiciles to their home market.
 */

export const MIN_MARKET_CAP_USD = 50e9;
export const MIN_HISTORY_YEARS = 10;
/** No listed company comes near this; larger values are broken quote data. */
export const MAX_PLAUSIBLE_MARKET_CAP_USD = 25e12;
/**
 * Listings are queried this far below the threshold, so that intraday FX drift
 * never trims companies at the boundary.
 */
export const SCREEN_THRESHOLD_RATIO = 0.8;
/** Quotes per Yahoo screener page. */
export const PAGE_SIZE = 250;
/** Safety cap on pages per venue. */
export const MAX_QUOTES_PER_VENUE = 750;
export const FX_CONCURRENCY = 6;
export const PROFILE_CONCURRENCY = 6;
export const HISTORY_CONCURRENCY = 5;

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const YAHOO = {
  apiHost: "query1.finance.yahoo.com",
  cookieBootstrapUrl: "https://fc.yahoo.com",
  crumbPath: "/v1/test/getcrumb",
  maxAttempts: 4,
};

/** Where the screener writes its output, relative to the project root. */
export const OUTPUT_PATHS = {
  snapshot: ["data", "watchlist.json"],
  history: ["data", "history.json"],
};

/** Currencies the watchlist may contain, plus USD as the base. */
export const FX_CURRENCIES = [
  "USD", "CAD", "GBP", "EUR", "CHF", "SEK", "DKK", "NOK", "PLN", "TRY",
  "JPY", "CNY", "HKD", "KRW", "TWD", "INR", "AUD", "SGD", "MYR", "IDR",
  "BRL", "MXN", "ZAR", "ILS", "SAR",
];

/** Venues scanned, with the country of the exchange itself. */
export const VENUES = [
  { code: "NMS", name: "Nasdaq Global Select", country: "United States" },
  { code: "NYQ", name: "New York Stock Exchange", country: "United States" },
  { code: "TOR", name: "Toronto Stock Exchange", country: "Canada" },
  { code: "LSE", name: "London Stock Exchange", country: "United Kingdom" },
  { code: "GER", name: "XETRA", country: "Germany" },
  { code: "PAR", name: "Euronext Paris", country: "France" },
  { code: "AMS", name: "Euronext Amsterdam", country: "Netherlands" },
  { code: "BRU", name: "Euronext Brussels", country: "Belgium" },
  { code: "EBS", name: "SIX Swiss Exchange", country: "Switzerland" },
  { code: "MCE", name: "Bolsa de Madrid", country: "Spain" },
  { code: "MIL", name: "Borsa Italiana", country: "Italy" },
  { code: "VIE", name: "Wiener Börse", country: "Austria" },
  { code: "STO", name: "Nasdaq Stockholm", country: "Sweden" },
  { code: "CPH", name: "Nasdaq Copenhagen", country: "Denmark" },
  { code: "OSL", name: "Oslo Børs", country: "Norway" },
  { code: "HEL", name: "Nasdaq Helsinki", country: "Finland" },
  { code: "WSE", name: "Warsaw Stock Exchange", country: "Poland" },
  { code: "IST", name: "Borsa Istanbul", country: "Turkey" },
  { code: "JPX", name: "Tokyo Stock Exchange", country: "Japan" },
  { code: "SHH", name: "Shanghai Stock Exchange", country: "China" },
  { code: "SHZ", name: "Shenzhen Stock Exchange", country: "China" },
  { code: "HKG", name: "Hong Kong Stock Exchange", country: "Hong Kong" },
  { code: "KSC", name: "Korea Exchange (KOSPI)", country: "South Korea" },
  { code: "TAI", name: "Taiwan Stock Exchange", country: "Taiwan" },
  { code: "NSI", name: "National Stock Exchange of India", country: "India" },
  { code: "ASX", name: "Australian Securities Exchange", country: "Australia" },
  { code: "SES", name: "Singapore Exchange", country: "Singapore" },
  { code: "KLS", name: "Bursa Malaysia", country: "Malaysia" },
  { code: "JKT", name: "Indonesia Stock Exchange", country: "Indonesia" },
  { code: "SAO", name: "B3 Brasil Bolsa Balcão", country: "Brazil" },
  { code: "MEX", name: "Bolsa Mexicana de Valores", country: "Mexico" },
  { code: "JNB", name: "Johannesburg Stock Exchange", country: "South Africa" },
  { code: "TLV", name: "Tel Aviv Stock Exchange", country: "Israel" },
  { code: "SAU", name: "Saudi Exchange (Tadawul)", country: "Saudi Arabia" },
];

export const VENUE_BY_CODE = new Map(VENUES.map((venue) => [venue.code, venue]));
export const VENUE_COUNTRIES = new Set(VENUES.map((venue) => venue.country));

/** Venues that report market caps in the major and prices in the minor unit. */
export const VENUE_MCAP_CURRENCY = { LSE: "GBP", JNB: "ZAR", TLV: "ILS" };

/**
 * Where a company is at home. A company is followed on a venue only if that
 * venue sits in its home market group, which drops ADRs and foreign secondary
 * listings. Countries without an entry fall back to their own name.
 */
export const HOME_MARKETS = {
  "Hong Kong": ["Hong Kong", "China"],
  China: ["China", "Hong Kong"],
  "Cayman Islands": ["Hong Kong", "China"],
  "British Virgin Islands": ["Hong Kong", "China"],
  Macao: ["Hong Kong", "China"],
  Bermuda: ["United States", "United Kingdom", "Hong Kong", "Canada"],
  "Isle of Man": ["United Kingdom"],
  Jersey: ["United Kingdom"],
  Guernsey: ["United Kingdom"],
  Ireland: ["Ireland", "United Kingdom", "United States"],
  Luxembourg: ["United States", "United Kingdom", "Germany", "Netherlands", "France"],
  "New Zealand": ["Australia", "New Zealand"],
  "United Arab Emirates": ["United Arab Emirates"],
  Russia: [],
  "Papua New Guinea": ["Australia"],
};

/** Home market groups for a domicile; unknown countries are their own market. */
export function homeMarkets(country) {
  if (!country) return [];
  return HOME_MARKETS[country] ?? [country];
}

/**
 * True when a domicile has no venue in the scan, so its only home in scope is
 * the foreign listing we happen to see.
 */
export function isForeignOnlyMarket(country) {
  return !homeMarkets(country).some((home) => VENUE_COUNTRIES.has(home));
}
