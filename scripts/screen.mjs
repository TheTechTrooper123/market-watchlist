#!/usr/bin/env node
/**
 * Market Watchlist screener.
 *
 * Rule set (see README):
 *  1. Scan a fixed list of ~34 cash-equity venues every trading day.
 *  2. Keep companies with a market capitalisation of at least USD 50bn.
 *  3. Follow every company on one venue only: the venue of its home market.
 *     Foreign cross-listings and depositary receipts (ADR/ADS/GDR) are dropped.
 *  4. Only common shares: no funds, ETFs, preferred shares, bonds, certificates.
 *  5. Require at least 10 years of price history on that listing.
 */

import fs from "node:fs/promises";
import path from "node:path";

const MIN_MARKET_CAP_USD = 50e9;
const MIN_HISTORY_YEARS = 10;
/** No listed company comes near this; larger values are broken quote data. */
const MAX_PLAUSIBLE_MARKET_CAP_USD = 25e12;
const OUT_FILE = path.join(process.cwd(), "data", "watchlist.json");
const CACHE_DIR = path.join(process.cwd(), ".cache");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Venues scanned, with the country of the exchange itself. */
const VENUES = [
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

const VENUE_BY_CODE = new Map(VENUES.map((v) => [v.code, v]));
const VENUE_COUNTRIES = new Set(VENUES.map((v) => v.country));

/** Market caps on these venues are reported in the major unit, prices in the minor. */
const VENUE_MCAP_CURRENCY = { LSE: "GBP", JNB: "ZAR", TLV: "ILS" };

/**
 * Where a company is at home. A company is followed on a venue only if that
 * venue sits in its home market group, which drops ADRs and foreign secondary
 * listings. Countries without an entry fall back to their own name.
 */
const HOME_MARKETS = {
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

function homeMarkets(country) {
  if (!country) return [];
  if (country in HOME_MARKETS) return HOME_MARKETS[country];
  return [country];
}

/** Countries that have at least one venue in the scan; anything else can only trade abroad here. */
const FOREIGN_ONLY_OK = (country) => !homeMarkets(country).some((c) => VENUE_COUNTRIES.has(c));

// ---------------------------------------------------------------- HTTP client

class Yahoo {
  constructor() {
    this.cookie = "";
    this.crumb = "";
  }

  async auth() {
    const res = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": UA },
      redirect: "manual",
    });
    const cookies = res.headers.getSetCookie?.() ?? [];
    this.cookie = cookies.map((c) => c.split(";")[0]).join("; ");
    const crumbRes = await fetch(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      { headers: { "User-Agent": UA, cookie: this.cookie } },
    );
    this.crumb = (await crumbRes.text()).trim();
    if (!this.crumb || this.crumb.length > 24) throw new Error("could not obtain Yahoo crumb");
  }

  async request(host, pathAndQuery, init = {}) {
    const url = `https://${host}${pathAndQuery}`;
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            "User-Agent": UA,
            cookie: this.cookie,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...(init.headers || {}),
          },
        });
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`HTTP ${res.status} ${url}`);
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1) ** 2));
          if (res.status === 429) await this.auth().catch(() => {});
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
        return await res.json();
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    throw lastErr;
  }

  async chart(symbol, range = "1y", interval = "1wk") {
    const q = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplit`;
    return this.request("query1.finance.yahoo.com", q);
  }

  async profile(symbol) {
    const q = `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,price&crumb=${encodeURIComponent(this.crumb)}&lang=en-US&region=US`;
    const json = await this.request("query1.finance.yahoo.com", q);
    const r = json?.quoteSummary?.result?.[0];
    return {
      country: r?.assetProfile?.country ?? null,
      sector: r?.assetProfile?.sector ?? null,
      industry: r?.assetProfile?.industry ?? null,
      quoteType: r?.price?.quoteType ?? null,
    };
  }

  async screen(exchange, minLocalMarketCap, offset = 0) {
    const body = {
      size: 250,
      offset,
      sortField: "intradaymarketcap",
      sortType: "DESC",
      quoteType: "EQUITY",
      topOperator: "AND",
      query: {
        operator: "AND",
        operands: [
          { operator: "eq", operands: ["exchange", exchange] },
          { operator: "gt", operands: ["intradaymarketcap", Math.round(minLocalMarketCap)] },
        ],
      },
      userId: "",
      userIdType: "guid",
    };
    const q = `/v1/finance/screener?crumb=${encodeURIComponent(this.crumb)}&lang=en-US&region=US`;
    const json = await this.request("query1.finance.yahoo.com", q, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const res = json?.finance?.result?.[0];
    return { total: res?.total ?? 0, quotes: res?.quotes ?? [] };
  }
}

const yahoo = new Yahoo();

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        out[i] = await fn(items[i], i);
      } catch (err) {
        out[i] = { __error: err.message };
      }
    }
  });
  await Promise.all(workers);
  return out;
}

// -------------------------------------------------------------------- filters

const LEGAL_SUFFIXES = [
  "incorporated", "inc", "corp", "corporation", "company", "co", "limited", "ltd",
  "plc", "ag", "se", "spa", "nv", "sa", "ab", "asa", "oyj", "kk", "bhd", "berhad",
  "tbk", "pte", "lp", "llc", "holding", "holdings", "group", "the", "class",
];

function normalizeName(name) {
  let s = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = s.split(" ");
  while (parts.length > 1 && LEGAL_SUFFIXES.includes(parts[parts.length - 1])) parts.pop();
  s = parts.join(" ");
  return s.replace(/\s+/g, "");
}

const NON_COMMON_PATTERNS = [
  /depositary|depository|\badrs?\b|\bgdrs?\b|\bads\b|sponsored/i,
  /\bfund\b|\betf\b|investment trust|\btrust units\b|\bunit trust\b/i,
  /preference|preferred|\bpref\b|\bpfd\b|vorzugsaktie|\bvorz\b/i,
  /\bbond\b|\bnote\b|\bnotes\b|\bnts\b|anleihe|obligation|\b[0-9.,]+ ?% ?bd|\bbds?\b/i,
  /certificate|\bcert\b|warrant|rights issue/i,
  /\bkdrs?\b|\bcross listing\b|\bprimary listing\b|\bsecondary listing\b/i,
];

function isNonCommonStock(quote) {
  const name = quote.longName || quote.shortName || "";
  if (!name) return true;
  if (/%/.test(name)) return true;
  if (NON_COMMON_PATTERNS.some((re) => re.test(name))) return true;
  // Korean preferred lines use the same name as the common stock and are
  // separated only by the ticker's last digit (0 = common, 5/7/9 = preferred).
  if (quote.__venue === "KSC") {
    const digits = String(quote.symbol).split(".")[0];
    if (/^\d{6}$/.test(digits) && !digits.endsWith("0")) return true;
  }
  // Brazilian preferred shares (PETR4) vs common (PETR3).
  if (quote.__venue === "SAO") {
    const digits = String(quote.symbol).split(".")[0];
    if (/\d$/.test(digits) && !digits.endsWith("3")) return true;
  }
  return false;
}

/** Common classes rank above preferred lines when a company lists several. */
function shareClassRank(quote) {
  const digits = String(quote.symbol).split(".")[0];
  if (quote.__venue === "SAO") return digits.endsWith("3") ? 2 : 1;
  if (quote.__venue === "KSC") return digits.endsWith("0") ? 2 : 1;
  return 1;
}

// ------------------------------------------------------------------------ fx

const MINOR_UNITS = {
  GBp: { code: "GBP", factor: 100 },
  ZAc: { code: "ZAR", factor: 100 },
  ILA: { code: "ILS", factor: 100 },
};

function splitCurrency(ccy) {
  const minor = MINOR_UNITS[ccy];
  if (minor) return { code: minor.code, factor: minor.factor };
  return { code: ccy, factor: 1 };
}

async function loadFx(currencies) {
  const rates = { USD: 1 };
  const list = [...currencies].filter((c) => c && c !== "USD");
  await pool(list, 6, async (ccy) => {
    try {
      const json = await yahoo.chart(`${ccy}USD=X`, "5d", "1d");
      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) rates[ccy] = price;
    } catch {
      /* leave missing, handled by caller */
    }
  });
  return rates;
}

// ------------------------------------------------------------------- screening

async function main() {
  const log = (...a) => console.log(...a);
  const started = Date.now();
  await yahoo.auth();
  log("authenticated against Yahoo Finance");

  const fx = await loadFx([
    "USD", "CAD", "GBP", "EUR", "CHF", "SEK", "DKK", "NOK", "PLN", "TRY",
    "JPY", "CNY", "HKD", "KRW", "TWD", "INR", "AUD", "SGD", "MYR", "IDR",
    "BRL", "MXN", "ZAR", "ILS", "SAR",
  ]);
  log("fx rates:", Object.keys(fx).length);

  const raw = [];
  const dropped = {};
  const bump = (k, n = 1) => (dropped[k] = (dropped[k] ?? 0) + n);

  for (const venue of VENUES) {
    const mcapCcy = VENUE_MCAP_CURRENCY[venue.code];
    // Threshold in the venue's own market-cap currency, with a buffer so that
    // FX drift never trims the list at the boundary.
    let threshold = MIN_MARKET_CAP_USD * 0.8;
    if (mcapCcy) {
      const rate = fx[mcapCcy];
      if (!rate) {
        log(`! skipping ${venue.code}: no fx rate for ${mcapCcy}`);
        continue;
      }
      threshold = (MIN_MARKET_CAP_USD * 0.8) / rate;
    }
    let offset = 0;
    let total = Infinity;
    let got = 0;
    while (offset < total && offset < 750) {
      const { total: t, quotes } = await yahoo.screen(venue.code, threshold, offset);
      total = t;
      if (!quotes.length) break;
      for (const q of quotes) {
        q.__venue = venue.code;
        q.__mcapCcy = mcapCcy ?? q.currency;
        raw.push(q);
      }
      got += quotes.length;
      offset += quotes.length;
    }
    log(`  ${venue.code.padEnd(4)} ${String(got).padStart(4)} listings above threshold`);
    if (got === 0) continue;
  }
  log(`scanned ${raw.length} listings on ${VENUES.length} venues`);

  // --- convert market caps to USD, drop non-common instruments
  const candidates = [];
  for (const q of raw) {
    const { code } = splitCurrency(q.__mcapCcy ?? "USD");
    const rate = fx[code];
    if (!rate || !q.marketCap) { bump("keine Kursdaten / kein Marktwert"); continue; }
    const mcap = q.marketCap * rate;
    if (mcap < MIN_MARKET_CAP_USD) { bump("unter 50 Mrd. USD"); continue; }
    if (mcap > MAX_PLAUSIBLE_MARKET_CAP_USD || !(q.regularMarketPrice > 0)) {
      bump("unplausible Kursdaten");
      continue;
    }
    if (isNonCommonStock(q)) { bump("keine Stammaktie (Fonds, Vorzüge, Anleihe, ADR)"); continue; }
    if (!q.longName && !q.shortName) { bump("ohne Firmennamen"); continue; }
    candidates.push({
      symbol: q.symbol,
      name: q.longName || q.shortName,
      venue: q.__venue,
      mcapUsd: mcap,
      currency: q.currency,
      price: q.regularMarketPrice ?? null,
      changePct: q.regularMarketChangePercent ?? null,
      classRank: shareClassRank(q),
    });
  }
  log(`${candidates.length} common-stock listings above USD 50bn`);

  // --- group by company, resolve the home market venue
  const groups = new Map();
  for (const c of candidates) {
    const key = normalizeName(c.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  log(`${groups.size} distinct companies`);

  // Every listing needs its issuer domicile: even a company with a single
  // visible listing can be a foreign cross-listing or a depositary receipt.
  const needProfile = candidates;
  log(`resolving domicile for ${needProfile.length} listings`);

  const profiles = new Map();
  await pool(needProfile, 6, async (c) => {
    try {
      const p = await yahoo.profile(c.symbol);
      profiles.set(c.symbol, p);
    } catch (err) {
      profiles.set(c.symbol, { country: null, sector: null, industry: null, error: err.message });
    }
  });
  log(`resolved ${[...profiles.values()].filter((p) => p?.country).length} domiciles`);

  const picked = [];
  for (const [, list] of groups) {
    const scored = list.map((c) => {
      const p = profiles.get(c.symbol);
      const country = p?.country ?? null;
      const venueCountry = VENUE_BY_CODE.get(c.venue)?.country ?? null;
      const homes = homeMarkets(country);
      const isHome = venueCountry ? homes.includes(venueCountry) : false;
      return { ...c, country, sector: p?.sector ?? null, industry: p?.industry ?? null, isHome, venueCountry, homes };
    });
    const bySize = scored.sort((a, b) => b.classRank - a.classRank || b.mcapUsd - a.mcapUsd);
    const home = bySize.filter((c) => c.isHome);
    let winner;
    if (home.length) {
      winner = home[0];
    } else if (bySize[0].country == null) {
      // Domicile unknown (profile unavailable) and no rival listing to compare
      // against: the venue we see is the only home this company has in scope.
      winner = bySize[0];
      bump("Sitz unbekannt, einzige Notierung");
    } else if (FOREIGN_ONLY_OK(bySize[0].country)) {
      // Domiciled outside every scanned market: its only home in scope.
      winner = bySize[0];
    } else {
      bump("nur Zweitnotierung / Hinterlegungsschein");
      continue;
    }
    picked.push(winner);
  }
  log(`${picked.length} companies on their home venue`);

  // --- 10 year history + price series
  const now = Date.now();
  const withHistory = [];
  const results = await pool(picked, 6, async (c) => {
    const json = await yahoo.chart(c.symbol, "1y", "1wk");
    const r = json?.chart?.result?.[0];
    if (!r?.meta) throw new Error("no chart");
    return r;
  });

  for (let i = 0; i < picked.length; i++) {
    const c = picked[i];
    const r = results[i];
    if (!r || r.__error || !r.meta) { bump("keine Kurshistorie"); continue; }
    const meta = r.meta;
    const first = meta.firstTradeDate ? new Date(meta.firstTradeDate * 1000) : null;
    const years = first ? (now - first.getTime()) / (365.25 * 24 * 3600 * 1000) : 0;
    if (years < MIN_HISTORY_YEARS) { bump(`unter ${MIN_HISTORY_YEARS} Jahren Historie`); continue; }
    const closes = (r.indicators?.quote?.[0]?.close ?? []).filter((v) => typeof v === "number");
    if (closes.length < 20) { bump("zu wenige Kurspunkte"); continue; }
    const price = meta.regularMarketPrice ?? closes[closes.length - 1];
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
    withHistory.push({
      name: c.name,
      symbol: c.symbol,
      exchangeCode: c.venue,
      exchange: VENUE_BY_CODE.get(c.venue)?.name ?? c.venue,
      country: c.country ?? c.venueCountry ?? "",
      sector: c.sector ?? "—",
      industry: c.industry ?? "—",
      marketCapUsd: Math.round(c.mcapUsd),
      price: price ?? null,
      currency: meta.currency ?? c.currency,
      changePct:
        prev && price ? Number((((price - prev) / prev) * 100).toFixed(2)) : c.changePct ?? null,
      listingSince: first ? first.toISOString().slice(0, 10) : "",
      yearsHistory: Number(years.toFixed(1)),
      spark: closes.slice(-60).map((v) => Number(v.toFixed(2))),
    });
  }

  withHistory.sort((a, b) => b.marketCapUsd - a.marketCapUsd);
  withHistory.forEach((c, i) => (c.rank = i + 1));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    asOf: new Date().toISOString().slice(0, 10),
    venues: VENUES.map(({ code, name, country }) => ({ code, name, country })),
    criteria: {
      minMarketCapUsd: MIN_MARKET_CAP_USD,
      minHistoryYears: MIN_HISTORY_YEARS,
      venues: VENUES.length,
    },
    stats: {
      companies: withHistory.length,
      listingsScanned: raw.length,
      companiesBeforeHistoryFilter: picked.length,
      dropped,
    },
    companies: withHistory,
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(snapshot, null, 1) + "\n");
  log(
    `wrote ${path.relative(process.cwd(), OUT_FILE)}: ${withHistory.length} companies in ${(
      (Date.now() - started) / 1000
    ).toFixed(0)}s`,
  );
  log("dropped:", dropped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
