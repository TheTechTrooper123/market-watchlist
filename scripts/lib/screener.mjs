/**
 * The daily screening pipeline: read every venue, keep common shares of
 * companies worth at least USD 50bn, follow each company on its home venue and
 * require ten years of price history. Writes the snapshot and the monthly series.
 */

import fs from "node:fs/promises";
import path from "node:path";

import {
  FX_CURRENCIES,
  HISTORY_CONCURRENCY,
  MAX_PLAUSIBLE_MARKET_CAP_USD,
  MAX_QUOTES_PER_VENUE,
  MIN_HISTORY_YEARS,
  MIN_MARKET_CAP_USD,
  OUTPUT_PATHS,
  PROFILE_CONCURRENCY,
  SCREEN_THRESHOLD_RATIO,
  VENUE_BY_CODE,
  VENUES,
  VENUE_MCAP_CURRENCY,
  homeMarkets,
  isForeignOnlyMarket,
} from "./config.mjs";
import { mapWithLimit } from "./concurrency.mjs";
import { loadFxRates, splitCurrency } from "./currency.mjs";
import { isNonCommonStock, normalizeName, shareClassRank } from "./shares.mjs";

/** Why a listing did not make it into the watchlist. Keys are shown on the site. */
const DROP_REASONS = {
  belowThreshold: "unter 50 Mrd. USD",
  noQuote: "keine Kursdaten / kein Marktwert",
  implausible: "unplausible Kursdaten",
  notCommonStock: "keine Stammaktie (Fonds, Vorzüge, Anleihe, ADR)",
  noName: "ohne Firmennamen",
  unknownDomicile: "Sitz unbekannt, einzige Notierung",
  foreignListingOnly: "nur Zweitnotierung / Hinterlegungsschein",
  noHistory: "keine Kurshistorie",
  shortHistory: `unter ${MIN_HISTORY_YEARS} Jahren Historie`,
  fewPrices: "zu wenige Kurspunkte",
};

const MIN_WEEKLY_CLOSES = 20;
const MIN_MONTHLY_CLOSES = 60;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365.25;

function createDropCounter() {
  const counts = {};
  return {
    add(reason, amount = 1) {
      counts[reason] = (counts[reason] ?? 0) + amount;
    },
    counts,
  };
}

/** Reads every venue page by page and tags each quote with its venue. */
async function collectListings(client, fxRates, log) {
  const listings = [];

  for (const venue of VENUES) {
    const mcapCurrency = VENUE_MCAP_CURRENCY[venue.code];
    let thresholdLocal = MIN_MARKET_CAP_USD * SCREEN_THRESHOLD_RATIO;

    if (mcapCurrency) {
      const rate = fxRates[mcapCurrency];
      if (!rate) {
        log(`! skipping ${venue.code}: no fx rate for ${mcapCurrency}`);
        continue;
      }
      thresholdLocal /= rate;
    }

    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    let collected = 0;

    while (offset < total && offset < MAX_QUOTES_PER_VENUE) {
      const page = await client.screen(venue.code, thresholdLocal, offset);
      total = page.total;
      if (!page.quotes.length) break;

      for (const quote of page.quotes) {
        listings.push({
          ...quote,
          __venue: venue.code,
          __mcapCcy: mcapCurrency ?? quote.currency,
        });
      }
      collected += page.quotes.length;
      offset += page.quotes.length;
    }

    log(`  ${venue.code.padEnd(4)} ${String(collected).padStart(4)} listings above threshold`);
  }

  log(`scanned ${listings.length} listings on ${VENUES.length} venues`);
  return listings;
}

/** Converts market caps to USD and drops everything that is not a common share. */
function toCandidates(listings, fxRates, drops) {
  const candidates = [];

  for (const quote of listings) {
    const { code } = splitCurrency(quote.__mcapCcy ?? "USD");
    const rate = fxRates[code];
    if (!rate || !quote.marketCap) {
      drops.add(DROP_REASONS.noQuote);
      continue;
    }

    const marketCapUsd = quote.marketCap * rate;
    if (marketCapUsd < MIN_MARKET_CAP_USD) {
      drops.add(DROP_REASONS.belowThreshold);
      continue;
    }
    if (marketCapUsd > MAX_PLAUSIBLE_MARKET_CAP_USD || !(quote.regularMarketPrice > 0)) {
      drops.add(DROP_REASONS.implausible);
      continue;
    }
    if (isNonCommonStock(quote)) {
      drops.add(DROP_REASONS.notCommonStock);
      continue;
    }

    const name = quote.longName || quote.shortName;
    if (!name) {
      drops.add(DROP_REASONS.noName);
      continue;
    }

    candidates.push({
      symbol: quote.symbol,
      name,
      venue: quote.__venue,
      marketCapUsd,
      currency: quote.currency,
      price: quote.regularMarketPrice ?? null,
      changePct: quote.regularMarketChangePercent ?? null,
      classRank: shareClassRank(quote),
    });
  }

  return candidates;
}

/** Groups listings of the same company, regardless of venue or share class. */
function groupByCompany(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = normalizeName(candidate.name);
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }
  return groups;
}

/**
 * Every listing needs its issuer domicile: even a company with a single visible
 * listing can be a foreign cross-listing or a depositary receipt.
 */
async function resolveProfiles(client, candidates, log) {
  log(`resolving domicile for ${candidates.length} listings`);

  const profiles = new Map();
  await mapWithLimit(candidates, PROFILE_CONCURRENCY, async (candidate) => {
    try {
      profiles.set(candidate.symbol, await client.profile(candidate.symbol));
    } catch (error) {
      profiles.set(candidate.symbol, {
        country: null,
        sector: null,
        industry: null,
        error: error.message,
      });
    }
  });

  const resolved = [...profiles.values()].filter((profile) => profile?.country).length;
  log(`resolved ${resolved} domiciles`);
  return profiles;
}

/** Picks one listing per company: the largest common share on its home venue. */
function pickHomeListings(groups, profiles, drops) {
  const picked = [];

  for (const listings of groups.values()) {
    const scored = listings.map((listing) => {
      const profile = profiles.get(listing.symbol);
      const country = profile?.country ?? null;
      const venueCountry = VENUE_BY_CODE.get(listing.venue)?.country ?? null;
      return {
        ...listing,
        country,
        sector: profile?.sector ?? null,
        industry: profile?.industry ?? null,
        venueCountry,
        isHome: venueCountry ? homeMarkets(country).includes(venueCountry) : false,
      };
    });

    const byClassAndSize = scored.sort(
      (a, b) => b.classRank - a.classRank || b.marketCapUsd - a.marketCapUsd,
    );
    const homeListings = byClassAndSize.filter((listing) => listing.isHome);
    const largest = byClassAndSize[0];

    if (homeListings.length) {
      picked.push(homeListings[0]);
      continue;
    }
    if (largest.country == null) {
      // Domicile unknown (profile unavailable) and no rival listing to compare
      // against: the venue we see is the only home this company has in scope.
      picked.push(largest);
      drops.add(DROP_REASONS.unknownDomicile);
      continue;
    }
    if (isForeignOnlyMarket(largest.country)) {
      // Domiciled outside every scanned market: its only home in scope.
      picked.push(largest);
      continue;
    }

    drops.add(DROP_REASONS.foreignListingOnly);
  }

  return picked;
}

/** One year of weekly closes plus ten years of monthly closes per company. */
async function loadHistories(client, picked) {
  return mapWithLimit(picked, HISTORY_CONCURRENCY, async (company) => {
    const [yearChart, decadeChart] = await Promise.all([
      client.chart(company.symbol, "1y", "1wk"),
      client.chart(company.symbol, "10y", "1mo"),
    ]);
    const year = yearChart?.chart?.result?.[0];
    if (!year?.meta) throw new Error("no chart");
    return { year, decade: decadeChart?.chart?.result?.[0] ?? null };
  });
}

/** Monthly closes for the detail page, or null when the series is too short. */
function buildMonthlySeries(decadeChart) {
  const timestamps = decadeChart?.timestamp ?? [];
  const closes = decadeChart?.indicators?.quote?.[0]?.close ?? [];
  const points = [];

  for (let index = 0; index < closes.length; index++) {
    if (typeof closes[index] === "number" && timestamps[index]) {
      points.push([timestamps[index], closes[index]]);
    }
  }
  if (points.length < MIN_MONTHLY_CLOSES) return null;

  return {
    s: new Date(points[0][0] * 1000).toISOString().slice(0, 10),
    c: points.map(([, close]) => Number(close.toFixed(2))),
  };
}

/** Turns one listing plus its charts into a watchlist entry, or drops it. */
function buildCompany(listing, history, now, drops) {
  const chart = history?.year;
  if (!chart?.meta) {
    drops.add(DROP_REASONS.noHistory);
    return null;
  }

  const meta = chart.meta;
  const firstTradeDate = meta.firstTradeDate ? new Date(meta.firstTradeDate * 1000) : null;
  const years = firstTradeDate
    ? (now - firstTradeDate.getTime()) / (DAYS_PER_YEAR * MILLISECONDS_PER_DAY)
    : 0;
  if (years < MIN_HISTORY_YEARS) {
    drops.add(DROP_REASONS.shortHistory);
    return null;
  }

  const closes = (chart.indicators?.quote?.[0]?.close ?? []).filter(
    (value) => typeof value === "number",
  );
  if (closes.length < MIN_WEEKLY_CLOSES) {
    drops.add(DROP_REASONS.fewPrices);
    return null;
  }

  const price = meta.regularMarketPrice ?? closes[closes.length - 1];
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const changePct =
    previousClose && price
      ? Number((((price - previousClose) / previousClose) * 100).toFixed(2))
      : listing.changePct ?? null;

  return {
    company: {
      name: listing.name,
      symbol: listing.symbol,
      exchangeCode: listing.venue,
      exchange: VENUE_BY_CODE.get(listing.venue)?.name ?? listing.venue,
      country: listing.country ?? listing.venueCountry ?? "",
      sector: listing.sector ?? "—",
      industry: listing.industry ?? "—",
      marketCapUsd: Math.round(listing.marketCapUsd),
      price: price ?? null,
      currency: meta.currency ?? listing.currency,
      changePct,
      listingSince: firstTradeDate ? firstTradeDate.toISOString().slice(0, 10) : "",
      yearsHistory: Number(years.toFixed(1)),
      spark: closes.slice(-60).map((value) => Number(value.toFixed(2))),
    },
    series: buildMonthlySeries(history.decade),
  };
}

function buildSnapshot(companies, stats) {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    asOf: generatedAt.slice(0, 10),
    venues: VENUES.map(({ code, name, country }) => ({ code, name, country })),
    criteria: {
      minMarketCapUsd: MIN_MARKET_CAP_USD,
      minHistoryYears: MIN_HISTORY_YEARS,
      venues: VENUES.length,
    },
    stats,
    companies,
  };
}

async function writeJson(segments, payload, spacing = 0) {
  const file = path.join(process.cwd(), ...segments);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, spacing) + "\n");
  return file;
}

const relativePath = (file) => path.relative(process.cwd(), file);

/**
 * Runs the whole screen and writes `data/watchlist.json` and `data/history.json`.
 * @param {{ client: import("./yahoo.mjs").YahooClient, log?: typeof console.log }} options
 */
export async function runScreener({ client, log = (...args) => console.log(...args) }) {
  const startedAt = Date.now();

  await client.authenticate();
  log("authenticated against Yahoo Finance");

  const fxRates = await loadFxRates(client, FX_CURRENCIES, log);
  const drops = createDropCounter();

  const listings = await collectListings(client, fxRates, log);
  const candidates = toCandidates(listings, fxRates, drops);
  log(`${candidates.length} common-stock listings above USD 50bn`);

  const groups = groupByCompany(candidates);
  log(`${groups.size} distinct companies`);

  const profiles = await resolveProfiles(client, candidates, log);
  const picked = pickHomeListings(groups, profiles, drops);
  log(`${picked.length} companies on their home venue`);

  const histories = await loadHistories(client, picked);
  const now = Date.now();
  const series = {};
  const companies = [];

  picked.forEach((listing, index) => {
    const built = buildCompany(listing, histories[index], now, drops);
    if (!built) return;
    if (built.series) series[listing.symbol] = built.series;
    companies.push(built.company);
  });

  companies.sort((a, b) => b.marketCapUsd - a.marketCapUsd);
  companies.forEach((company, index) => {
    company.rank = index + 1;
  });

  const snapshot = buildSnapshot(companies, {
    companies: companies.length,
    listingsScanned: listings.length,
    companiesBeforeHistoryFilter: picked.length,
    dropped: drops.counts,
  });

  const historyFile = await writeJson(OUTPUT_PATHS.history, {
    generatedAt: snapshot.generatedAt,
    series,
  });
  const snapshotFile = await writeJson(OUTPUT_PATHS.snapshot, snapshot, 1);

  log(`wrote ${relativePath(historyFile)}: ${Object.keys(series).length} Kursreihen`);
  log(
    `wrote ${relativePath(snapshotFile)}: ${companies.length} companies in ${(
      (Date.now() - startedAt) / 1000
    ).toFixed(0)}s`,
  );
  log("dropped:", drops.counts);

  return snapshot;
}
