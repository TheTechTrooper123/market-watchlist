import type { FilterOptions, WatchlistFilters } from "@/lib/watchlist";
import { hasActiveFilters } from "@/lib/watchlist";
import { formatInteger } from "@/lib/format";

type Props = {
  filters: WatchlistFilters;
  options: FilterOptions;
  visibleCount: number;
  totalCount: number;
  onFilterChange: (key: keyof WatchlistFilters, value: string) => void;
  onReset: () => void;
};

/** Search field, the three dropdowns and the hit counter above the table. */
export default function WatchlistToolbar({
  filters,
  options,
  visibleCount,
  totalCount,
  onFilterChange,
  onReset,
}: Props) {
  return (
    <div className="toolbar">
      <div className="search">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.6-3.6" strokeLinecap="round" />
        </svg>
        <input
          value={filters.query}
          onChange={(event) => onFilterChange("query", event.target.value)}
          placeholder="Unternehmen oder Ticker suchen …"
          aria-label="Suche"
        />
      </div>

      <select
        value={filters.venue}
        onChange={(event) => onFilterChange("venue", event.target.value)}
        aria-label="Börse"
      >
        <option value="">Alle Börsen</option>
        {options.venues.map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={filters.country}
        onChange={(event) => onFilterChange("country", event.target.value)}
        aria-label="Land"
      >
        <option value="">Alle Länder</option>
        {options.countries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>

      <select
        value={filters.sector}
        onChange={(event) => onFilterChange("sector", event.target.value)}
        aria-label="Sektor"
      >
        <option value="">Alle Sektoren</option>
        {options.sectors.map((sector) => (
          <option key={sector} value={sector}>
            {sector}
          </option>
        ))}
      </select>

      {hasActiveFilters(filters) && (
        <button className="reset" onClick={onReset}>
          Zurücksetzen
        </button>
      )}

      <span className="count">
        {formatInteger(visibleCount)} / {formatInteger(totalCount)}
      </span>
    </div>
  );
}
