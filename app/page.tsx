import Hero from "@/components/Hero";
import StaleNotice from "@/components/StaleNotice";
import SummaryStats from "@/components/SummaryStats";
import Topbar from "@/components/Topbar";
import Watchlist from "@/components/Watchlist";
import { loadSnapshot } from "@/lib/data";
import { formatDate, formatInteger } from "@/lib/format";
import { staleness } from "@/lib/freshness";

export const revalidate = 900;

export default async function Page() {
  const { companies, criteria, stats, generatedAt, asOf } = await loadSnapshot();
  const countryCount = new Set(companies.map((company) => company.country).filter(Boolean)).size;
  const { tradingDays, isStale } = staleness(asOf);

  return (
    <main className="wrap">
      <Topbar asOf={asOf} generatedAt={generatedAt} />

      {isStale && <StaleNotice date={formatDate(asOf)} tradingDays={tradingDays} />}

      <section className="hero">
        <Hero
          companyCount={companies.length}
          venueCount={criteria.venues}
          minHistoryYears={criteria.minHistoryYears}
        />
        <SummaryStats
          companyCount={companies.length}
          venueCount={criteria.venues}
          countryCount={countryCount}
          minMarketCapUsd={criteria.minMarketCapUsd}
        />
      </section>

      <Watchlist companies={companies} />

      <footer className="foot">
        <p>
          Kriterien: Marktkapitalisierung ≥ 50 Mrd. USD (in USD umgerechnet), Stammaktien only,
          eine Notierung pro Unternehmen an der Heimatbörse, ≥ {criteria.minHistoryYears} Jahre
          Kurshistorie. Im letzten Lauf wurden{" "}
          <code>{formatInteger(stats.listingsScanned)}</code> Notierungen geprüft.
        </p>
        <p>
          Daten: Yahoo Finance · Aktualisierung werktäglich nach US-Börsenschluss · keine
          Anlageberatung.
        </p>
      </footer>
    </main>
  );
}
