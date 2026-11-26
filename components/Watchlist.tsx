"use client";

import { useMemo, useState } from "react";
import WatchlistTable from "@/components/WatchlistTable";
import WatchlistToolbar from "@/components/WatchlistToolbar";
import type { Company } from "@/lib/types";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  defaultSortDirection,
  filterAndSortCompanies,
  filterOptions,
  type SortKey,
  type WatchlistFilters,
  type WatchlistSort,
} from "@/lib/watchlist";

/** Holds the table state; filtering and sorting live in lib/watchlist.ts. */
export default function Watchlist({ companies }: { companies: Company[] }) {
  const [filters, setFilters] = useState<WatchlistFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<WatchlistSort>(DEFAULT_SORT);

  const options = useMemo(() => filterOptions(companies), [companies]);
  const rows = useMemo(
    () => filterAndSortCompanies(companies, filters, sort),
    [companies, filters, sort],
  );

  function updateFilter(key: keyof WatchlistFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: defaultSortDirection(key) },
    );
  }

  return (
    <>
      <WatchlistToolbar
        filters={filters}
        options={options}
        visibleCount={rows.length}
        totalCount={companies.length}
        onFilterChange={updateFilter}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
      <WatchlistTable rows={rows} sort={sort} onSort={toggleSort} />
    </>
  );
}
