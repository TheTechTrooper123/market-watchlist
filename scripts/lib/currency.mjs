/**
 * Currency handling: quotes that report minor units, and USD conversion rates.
 */

import { FX_CONCURRENCY } from "./config.mjs";
import { mapWithLimit } from "./concurrency.mjs";

/** Currencies quoted in 1/100 of the major unit. */
const MINOR_UNITS = {
  GBp: { code: "GBP", factor: 100 },
  ZAc: { code: "ZAR", factor: 100 },
  ILA: { code: "ILS", factor: 100 },
};

/** Splits a quoted currency into the major unit and its conversion factor. */
export function splitCurrency(currency) {
  const minor = MINOR_UNITS[currency];
  if (minor) return { code: minor.code, factor: minor.factor };
  return { code: currency, factor: 1 };
}

/**
 * USD value of one unit per currency, fetched from Yahoo's FX pairs. Currencies
 * that fail stay missing; callers treat that as "not convertible".
 */
export async function loadFxRates(client, currencies, log = () => {}) {
  const rates = { USD: 1 };
  const targets = [...new Set(currencies)].filter((currency) => currency && currency !== "USD");

  await mapWithLimit(targets, FX_CONCURRENCY, async (currency) => {
    try {
      const chart = await client.chart(`${currency}USD=X`, "5d", "1d");
      const price = chart?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) rates[currency] = price;
    } catch {
      // Left out on purpose; the caller reports the missing rate.
    }
  });

  log("fx rates:", Object.keys(rates).length);
  return rates;
}
