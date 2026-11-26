/** Pure filter and sort logic of the watchlist table. */

import type { Company } from "@/lib/types";

export type SortKey =
  | "rank"
  | "name"
  | "marketCapUsd"
  | "price"
  | "changePct"
  | "yearsHistory"
  | "country";

export type SortDirection = "asc" | "desc";

export type WatchlistSort = {
  key: SortKey;
  direction: SortDirection;
};

export type WatchlistFilters = {
  query: string;
  venue: string;
  country: string;
  sector: string;
};

export type FilterOptions = {
  /** Exchange code and display name, sorted by name. */
  venues: [string, string][];
  countries: string[];
  sectors: string[];
};

export const DEFAULT_FILTERS: WatchlistFilters = {
  query: "",
  venue: "",
  country: "",
  sector: "",
};

export const DEFAULT_SORT: WatchlistSort = { key: "rank", direction: "asc" };

const TEXT_SORT_KEYS: SortKey[] = ["name", "country", "rank"];

export function defaultSortDirection(key: SortKey): SortDirection {
  return TEXT_SORT_KEYS.includes(key) ? "asc" : "desc";
}

export function filterOptions(companies: Company[]): FilterOptions {
  const venues = [...new Map(companies.map((c) => [c.exchangeCode, c.exchange])).entries()];
  venues.sort((a, b) => a[1].localeCompare(b[1]));

  const countries = [...new Set(companies.map((c) => c.country).filter(Boolean))];
  countries.sort((a, b) => a.localeCompare(b));

  const sectors = [...new Set(companies.map((c) => c.sector).filter((s) => s && s !== "—"))];
  sectors.sort((a, b) => a.localeCompare(b));

  return { venues, countries, sectors };
}

function matchesFilters(company: Company, filters: WatchlistFilters): boolean {
  if (filters.venue && company.exchangeCode !== filters.venue) return false;
  if (filters.country && company.country !== filters.country) return false;
  if (filters.sector && company.sector !== filters.sector) return false;

  const query = filters.query.trim().toLowerCase();
  if (!query) return true;

  const haystack = `${company.name} ${company.symbol} ${company.country} ${company.sector}`;
  return haystack.toLowerCase().includes(query);
}

function compareCompanies(a: Company, b: Company, key: SortKey): number {
  switch (key) {
    case "name":
    case "country":
      return a[key].localeCompare(b[key]);
    case "changePct":
      return (a.changePct ?? -999) - (b.changePct ?? -999);
    case "price":
      return (a.price ?? 0) - (b.price ?? 0);
    default:
      return a[key] - b[key];
  }
}

/** Filters the table and returns a new array in the requested order. */
export function filterAndSortCompanies(
  companies: Company[],
  filters: WatchlistFilters,
  sort: WatchlistSort,
): Company[] {
  const factor = sort.direction === "asc" ? 1 : -1;

  return companies
    .filter((company) => matchesFilters(company, filters))
    .sort((a, b) => compareCompanies(a, b, sort.key) * factor);
}

/** True when any filter is set, so the reset button can be shown. */
export function hasActiveFilters(filters: WatchlistFilters): boolean {
  return Boolean(filters.query || filters.venue || filters.country || filters.sector);
}
