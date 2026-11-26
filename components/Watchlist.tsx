"use client";

import { useMemo, useState } from "react";
import type { Company } from "@/lib/types";

type SortKey = "rank" | "name" | "marketCapUsd" | "price" | "changePct" | "yearsHistory" | "country";

const nf = new Intl.NumberFormat("de-DE");

function formatMarketCap(usd: number) {
  if (usd >= 1e12) return `${(usd / 1e12).toFixed(2).replace(".", ",")} Bio. $`;
  return `${nf.format(Math.round(usd / 1e9))} Mrd. $`;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return "—";
  const digits = price >= 1000 ? 0 : price >= 10 ? 2 : 3;
  return `${price.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${currency}`;
}

function formatPct(p: number | null) {
  if (p == null || Number.isNaN(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2).replace(".", ",")} %`;
}

function Sparkline({ data, width = 92, height = 26 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return <span style={{ color: "var(--muted-2)" }}>—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = (i * stepX).toFixed(2);
    const y = (height - 2 - ((v - min) / span) * (height - 4)).toFixed(2);
    return `${x},${y}`;
  });
  const up = data[data.length - 1] >= data[0];
  const color = up ? "var(--up)" : "var(--down)";
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle
        cx={(width - 1).toFixed(2)}
        cy={height - 2 - ((data[data.length - 1] - min) / span) * (height - 4)}
        r="1.7"
        fill={color}
      />
    </svg>
  );
}

export default function Watchlist({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const [venue, setVenue] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const venues = useMemo(
    () => [...new Map(companies.map((c) => [c.exchangeCode, c.exchange])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [companies],
  );
  const countries = useMemo(
    () => [...new Set(companies.map((c) => c.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [companies],
  );
  const sectors = useMemo(
    () => [...new Set(companies.map((c) => c.sector).filter((s) => s && s !== "—"))].sort((a, b) => a.localeCompare(b)),
    [companies],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = companies.filter((c) => {
      if (venue && c.exchangeCode !== venue) return false;
      if (country && c.country !== country) return false;
      if (sector && c.sector !== sector) return false;
      if (q && !`${c.name} ${c.symbol} ${c.country} ${c.sector}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      switch (sortKey) {
        case "name":
        case "country":
          return a[sortKey].localeCompare(b[sortKey]) * dir;
        case "changePct":
          return ((a.changePct ?? -999) - (b.changePct ?? -999)) * dir;
        case "price":
          return ((a.price ?? 0) - (b.price ?? 0)) * dir;
        case "marketCapUsd":
          return (a.marketCapUsd - b.marketCapUsd) * dir;
        case "yearsHistory":
          return (a.yearsHistory - b.yearsHistory) * dir;
        default:
          return (a.rank - b.rank) * dir;
      }
    });
  }, [companies, query, venue, country, sector, sortKey, sortDir]);

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "country" || key === "rank" ? "asc" : "desc");
    }
  }

  const hasFilter = query || venue || country || sector;

  function head(key: SortKey, label: string, cls = "") {
    const active = sortKey === key;
    return (
      <th className={`sortable ${cls}`} onClick={() => sortBy(key)} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
        {label}
        {active && <span className="sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </th>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.6-3.6" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Unternehmen oder Ticker suchen …"
            aria-label="Suche"
          />
        </div>

        <select value={venue} onChange={(e) => setVenue(e.target.value)} aria-label="Börse">
          <option value="">Alle Börsen</option>
          {venues.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Land">
          <option value="">Alle Länder</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sektor">
          <option value="">Alle Sektoren</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            className="reset"
            onClick={() => {
              setQuery("");
              setVenue("");
              setCountry("");
              setSector("");
            }}
          >
            Zurücksetzen
          </button>
        )}

        <span className="count">
          {nf.format(rows.length)} / {nf.format(companies.length)}
        </span>
      </div>

      <div className="table-shell">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                {head("rank", "#")}
                {head("name", "Unternehmen")}
                <th className="hide-md">Börse</th>
                {head("country", "Land", "hide-md")}
                <th className="hide-md">Sektor</th>
                {head("marketCapUsd", "Marktkap.", "num")}
                {head("price", "Kurs", "num")}
                {head("changePct", "1 Tag", "num")}
                {head("yearsHistory", "Historie", "num hide-md")}
                <th className="center hide-md">1 Jahr</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.symbol}>
                  <td className="rank">{c.rank}</td>
                  <td>
                    <div className="company">
                      <span className="company-name">{c.name}</span>
                      <span className="company-sub">
                        <a
                          className="ticker"
                          href={`https://finance.yahoo.com/quote/${encodeURIComponent(c.symbol)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {c.symbol}
                        </a>
                        <span className="hide-md"> · seit {c.listingSince.slice(0, 4)}</span>
                      </span>
                    </div>
                  </td>
                  <td className="venue hide-md">
                    {c.exchange}
                    <span className="venue-code">{c.exchangeCode}</span>
                  </td>
                  <td className="venue hide-md">{c.country || "—"}</td>
                  <td className="venue hide-md">{c.sector}</td>
                  <td className="num mcap">{formatMarketCap(c.marketCapUsd)}</td>
                  <td className="num">{formatPrice(c.price, c.currency)}</td>
                  <td className={`num chg ${c.changePct == null ? "flat" : c.changePct > 0 ? "up" : c.changePct < 0 ? "down" : "flat"}`}>
                    {formatPct(c.changePct)}
                  </td>
                  <td className="num years hide-md">{c.yearsHistory.toFixed(0)} J.</td>
                  <td className="center hide-md">
                    <Sparkline data={c.spark} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="empty">Keine Treffer für diese Filter.</div>}
      </div>
    </>
  );
}
