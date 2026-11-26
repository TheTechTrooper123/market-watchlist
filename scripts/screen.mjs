#!/usr/bin/env node
/**
 * Market Watchlist screener.
 *
 * Rule set (see README):
 *  1. Scan the venues listed in ./lib/config.mjs every trading day.
 *  2. Keep companies with a market capitalisation of at least USD 50bn.
 *  3. Follow every company on one venue only: the venue of its home market.
 *     Foreign cross-listings and depositary receipts (ADR/ADS/GDR) are dropped.
 *  4. Only common shares: no funds, ETFs, preferred shares, bonds, certificates.
 *  5. Require at least 10 years of price history on that listing.
 */

import { runScreener } from "./lib/screener.mjs";
import { YahooClient } from "./lib/yahoo.mjs";

runScreener({ client: new YahooClient() }).catch((error) => {
  console.error(error);
  process.exit(1);
});
