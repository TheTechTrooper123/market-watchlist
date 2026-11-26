import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import PriceChart from "@/components/PriceChart";
import { allCompanies, loadHistory, loadSnapshot } from "@/lib/data";
import { formatDate, formatMarketCap, formatPct, formatPrice } from "@/lib/format";

export const revalidate = 900;

export function generateStaticParams() {
  return allCompanies().map((c) => ({ symbol: c.symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  // Bewusst die Laufzeit-Momentaufnahme statt der im Build gebündelten Kopie:
  // sonst tragen neu aufgenommene Unternehmen falsche Metadaten.
  const snapshot = await loadSnapshot();
  const company = snapshot.companies.find((c) => c.symbol === symbol);
  if (!company) return { title: "Unternehmen nicht gefunden — Market Watchlist" };
  return {
    title: `${company.name} (${company.symbol}) — Market Watchlist`,
    description: `${company.name} an der ${company.exchange}: Marktkapitalisierung, Kennzahlen und Kursverlauf der letzten zehn Jahre.`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const [snapshot, history] = await Promise.all([loadSnapshot(), loadHistory()]);
  const company = snapshot.companies.find((c) => c.symbol === symbol);
  if (!company) notFound();

  const series = history.series[symbol];
  const performance =
    series && series.c.length > 1
      ? ((series.c[series.c.length - 1] - series.c[0]) / series.c[0]) * 100
      : null;

  const facts: [string, string][] = [
    ["Marktkapitalisierung", formatMarketCap(company.marketCapUsd)],
    ["Kurs", formatPrice(company.price, company.currency)],
    ["Erste Notierung", formatDate(company.listingSince)],
    ["Kurshistorie", `${company.yearsHistory.toFixed(1)} Jahre`],
    ["Börse", `${company.exchange} (${company.exchangeCode})`],
    ["Land", company.country || "—"],
    ["Sektor", company.sector],
    ["Branche", company.industry],
    ["Rang", `${company.rank} von ${snapshot.companies.length}`],
    [
      "10-Jahres-Entwicklung",
      performance == null ? "—" : formatPct(Number(performance.toFixed(2))),
    ],
  ];

  return (
    <main className="wrap">
      <Topbar asOf={snapshot.asOf} generatedAt={snapshot.generatedAt} />

      <Link href="/" className="back">
        ← Alle Unternehmen
      </Link>

      <section className="detail-head">
        <div>
          <div className="detail-kicker">
            Platz {company.rank} · {company.exchangeCode}
          </div>
          <h1 className="detail-title">{company.name}</h1>
          <div className="detail-sub">
            <a
              className="ticker"
              href={`https://finance.yahoo.com/quote/${encodeURIComponent(company.symbol)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {company.symbol}
            </a>
            <span>
              {company.country} · {company.sector}
            </span>
          </div>
        </div>
        <div className="detail-price">
          <div className="price">{formatPrice(company.price, company.currency)}</div>
          <div
            className={`chg ${company.changePct == null ? "flat" : company.changePct > 0 ? "up" : company.changePct < 0 ? "down" : "flat"}`}
          >
            {formatPct(company.changePct)} heute
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Kursverlauf</h2>
          <span>{series ? "10 Jahre · monatlich" : "keine Reihe verfügbar"}</span>
        </div>
        {series ? (
          <PriceChart data={series.c} start={series.s} currency={company.currency} />
        ) : (
          <div className="chart-empty">
            Für {company.symbol} liegt derzeit keine Monatsreihe vor.
          </div>
        )}
      </section>

      <dl className="facts">
        {facts.map(([label, value]) => (
          <div className="fact" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <footer className="foot">
        <p>
          Kurse in {company.currency}, Marktkapitalisierung in USD umgerechnet. Daten: Yahoo
          Finance · keine Anlageberatung.
        </p>
        <p>
          Kriterien der Liste: ≥ 50 Mrd. USD, Stammaktien, Heimatbörse, ≥ 10 Jahre Historie.
        </p>
      </footer>
    </main>
  );
}
