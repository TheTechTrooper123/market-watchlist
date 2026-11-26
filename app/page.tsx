import snapshotJson from "@/data/watchlist.json";
import type { Snapshot } from "@/lib/types";
import Watchlist from "@/components/Watchlist";

const snapshot = snapshotJson as unknown as Snapshot;

const nf = new Intl.NumberFormat("de-DE");

function formatAsOf(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Page() {
  const { companies, criteria, stats, generatedAt, asOf } = snapshot;
  const countries = new Set(companies.map((c) => c.country).filter(Boolean));
  const generated = new Date(generatedAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <main className="wrap">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">M</span>
          Market Watchlist
        </div>
        <div className="topbar-meta">
          <span className="live">
            <span className="live-dot" />
            Handelstag {formatAsOf(asOf)}
          </span>
          <span>Stand {generated} Uhr</span>
        </div>
      </header>

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
