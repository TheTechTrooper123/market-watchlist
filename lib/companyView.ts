/** Presentation logic for the company detail page. */

import type { Company, PriceSeries } from "@/lib/types";
import { formatDate, formatMarketCap, formatPct, formatPrice } from "@/lib/format";

export type CompanyFact = [label: string, value: string];

/** Change from the first to the last monthly close, in percent. */
export function tenYearPerformance(series?: PriceSeries): number | null {
  if (!series || series.c.length < 2) return null;
  const first = series.c[0];
  const last = series.c[series.c.length - 1];
  return ((last - first) / first) * 100;
}

export function buildCompanyFacts(
  company: Company,
  totalCompanies: number,
  series?: PriceSeries,
): CompanyFact[] {
  const performance = tenYearPerformance(series);

  return [
    ["Marktkapitalisierung", formatMarketCap(company.marketCapUsd)],
    ["Kurs", formatPrice(company.price, company.currency)],
    ["Erste Notierung", formatDate(company.listingSince)],
    ["Kurshistorie", `${company.yearsHistory.toFixed(1)} Jahre`],
    ["Börse", `${company.exchange} (${company.exchangeCode})`],
    ["Land", company.country || "—"],
    ["Sektor", company.sector],
    ["Branche", company.industry],
    ["Rang", `${company.rank} von ${totalCompanies}`],
    [
      "10-Jahres-Entwicklung",
      performance == null ? "—" : formatPct(Number(performance.toFixed(2))),
    ],
  ];
}
