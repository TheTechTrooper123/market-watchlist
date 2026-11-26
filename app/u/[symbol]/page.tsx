import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompanyFacts from "@/components/CompanyFacts";
import PriceChart from "@/components/PriceChart";
import Topbar from "@/components/Topbar";
import { buildCompanyFacts } from "@/lib/companyView";
import { bundledCompanies, loadHistory, loadSnapshot } from "@/lib/data";
import { changeTone, formatPct, formatPrice } from "@/lib/format";
import { yahooQuoteUrl } from "@/lib/site";

export const revalidate = 900;

export function generateStaticParams() {
  return bundledCompanies().map((company) => ({ symbol: company.symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  // Live snapshot, not the build-time copy: otherwise companies added by today's
  // screener would carry "not found" metadata despite rendering fine.
  const snapshot = await loadSnapshot();
  const company = snapshot.companies.find((entry) => entry.symbol === symbol);

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

  const company = snapshot.companies.find((entry) => entry.symbol === symbol);
  if (!company) notFound();

  const series = history.series[symbol];
  const facts = buildCompanyFacts(company, snapshot.companies.length, series);

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
              href={yahooQuoteUrl(company.symbol)}
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
          <div className={`chg ${changeTone(company.changePct)}`}>
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

      <CompanyFacts facts={facts} />

      <footer className="foot">
        <p>
          Kurse in {company.currency}, Marktkapitalisierung in USD umgerechnet. Daten: Yahoo
          Finance · keine Anlageberatung.
        </p>
        <p>Kriterien der Liste: ≥ 50 Mrd. USD, Stammaktien, Heimatbörse, ≥ 10 Jahre Historie.</p>
      </footer>
    </main>
  );
}
