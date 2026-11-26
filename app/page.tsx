import Topbar from "@/components/Topbar";
import Watchlist from "@/components/Watchlist";
import { loadSnapshot } from "@/lib/data";

export const revalidate = 900;

const nf = new Intl.NumberFormat("de-DE");

export default async function Page() {
  const snapshot = await loadSnapshot();
  const { companies, criteria, stats, generatedAt, asOf } = snapshot;
  const countries = new Set(companies.map((c) => c.country).filter(Boolean));

  return (
    <main className="wrap">
      <Topbar asOf={asOf} generatedAt={generatedAt} />

      <section className="hero">
        <div>
          <h1>
            Die <em>{nf.format(companies.length)}</em> Schwergewichte
            <br />
            der Weltbörsen
          </h1>
          <p className="lede">
            Jeden Handelstag liest der Screener <strong>{criteria.venues} Börsen</strong> aus und
            behält alle Unternehmen ab <strong>50 Mrd. USD</strong> Marktkapitalisierung. Jedes
            Unternehmen wird nur einmal geführt — an seiner <strong>Heimatbörse</strong> und nur mit
            seinen <strong>Stammaktien</strong>: Hinterlegungsscheine, Zweitnotierungen, Anleihen,
            Fonds und Zertifikate fallen weg. Voraussetzung sind zudem mindestens{" "}
            <strong>{criteria.minHistoryYears} Jahre Kursgeschichte</strong>.
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-value">{nf.format(companies.length)}</div>
            <div className="stat-label">Unternehmen</div>
          </div>
          <div className="stat">
            <div className="stat-value">{criteria.venues}</div>
            <div className="stat-label">Börsen im Scan</div>
          </div>
          <div className="stat">
            <div className="stat-value">{nf.format(countries.size)}</div>
            <div className="stat-label">Länder</div>
          </div>
          <div className="stat">
            <div className="stat-value">50</div>
            <div className="stat-label">Mrd. USD Minimum</div>
          </div>
        </div>
      </section>

      <Watchlist companies={companies} />

      <footer className="foot">
        <p>
          Kriterien: Marktkapitalisierung ≥ 50 Mrd. USD (in USD umgerechnet), Stammaktien only,
          eine Notierung pro Unternehmen an der Heimatbörse, ≥ {criteria.minHistoryYears} Jahre
          Kurshistorie. Im letzten Lauf wurden <code>{nf.format(stats.listingsScanned)}</code>{" "}
          Notierungen geprüft.
        </p>
        <p>
          Daten: Yahoo Finance · Aktualisierung werktäglich nach US-Börsenschluss · keine
          Anlageberatung.
        </p>
      </footer>
    </main>
  );
}
