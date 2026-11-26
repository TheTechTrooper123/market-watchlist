import Link from "next/link";
import Sparkline from "@/components/Sparkline";
import { changeTone, formatMarketCap, formatPct, formatPrice } from "@/lib/format";
import { yahooQuoteUrl } from "@/lib/site";
import type { Company } from "@/lib/types";
import type { SortKey, WatchlistSort } from "@/lib/watchlist";

type Props = {
  rows: Company[];
  sort: WatchlistSort;
  onSort: (key: SortKey) => void;
};

type HeaderProps = {
  label: string;
  column: SortKey;
  sort: WatchlistSort;
  onSort: (key: SortKey) => void;
  className?: string;
};

/** Clickable and keyboard-operable column header. */
function SortableHeader({ label, column, sort, onSort, className = "" }: HeaderProps) {
  const active = sort.key === column;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <th
      className={`sortable ${className}`.trim()}
      onClick={() => onSort(column)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSort(column);
        }
      }}
      tabIndex={0}
      role="button"
      aria-sort={ariaSort}
    >
      {label}
      {active && <span className="sort-arrow">{sort.direction === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

export default function WatchlistTable({ rows, sort, onSort }: Props) {
  return (
    <div className="table-shell">
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <SortableHeader label="#" column="rank" sort={sort} onSort={onSort} />
              <SortableHeader label="Unternehmen" column="name" sort={sort} onSort={onSort} />
              <th className="hide-md">Börse</th>
              <SortableHeader label="Land" column="country" sort={sort} onSort={onSort} className="hide-md" />
              <th className="hide-md">Sektor</th>
              <SortableHeader label="Marktkap." column="marketCapUsd" sort={sort} onSort={onSort} className="num" />
              <SortableHeader label="Kurs" column="price" sort={sort} onSort={onSort} className="num" />
              <SortableHeader label="1 Tag" column="changePct" sort={sort} onSort={onSort} className="num" />
              <SortableHeader
                label="Historie"
                column="yearsHistory"
                sort={sort}
                onSort={onSort}
                className="num hide-md"
              />
              <th className="center hide-md">1 Jahr</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => (
              <tr key={company.symbol}>
                <td className="rank">{company.rank}</td>
                <td>
                  <div className="company">
                    <Link
                      className="company-name"
                      href={`/u/${encodeURIComponent(company.symbol)}`}
                    >
                      {company.name}
                    </Link>
                    <span className="company-sub">
                      <a
                        className="ticker"
                        href={yahooQuoteUrl(company.symbol)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {company.symbol}
                      </a>
                      <span className="hide-md"> · seit {company.listingSince.slice(0, 4)}</span>
                    </span>
                  </div>
                </td>
                <td className="venue hide-md">
                  {company.exchange}
                  <span className="venue-code">{company.exchangeCode}</span>
                </td>
                <td className="venue hide-md">{company.country || "—"}</td>
                <td className="venue hide-md">{company.sector}</td>
                <td className="num mcap">{formatMarketCap(company.marketCapUsd)}</td>
                <td className="num">{formatPrice(company.price, company.currency)}</td>
                <td className={`num chg ${changeTone(company.changePct)}`}>
                  {formatPct(company.changePct)}
                </td>
                <td className="num years hide-md">{company.yearsHistory.toFixed(0)} J.</td>
                <td className="center hide-md">
                  <Sparkline data={company.spark} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div className="empty">Keine Treffer für diese Filter.</div>}
    </div>
  );
}
