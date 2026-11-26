import Link from "next/link";
import { allCompanies } from "@/lib/data";

const nf = new Intl.NumberFormat("de-DE");

export default function NotFound() {
  const count = allCompanies().length;

  return (
    <main className="wrap">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">M</span>
          Market Watchlist
        </Link>
      </header>

      <section className="notfound">
        <div className="detail-kicker">Fehler 404</div>
        <h1 className="detail-title">Diese Seite gibt es nicht</h1>
        <p className="lede">
          Entweder ist die Adresse vertippt, oder das Unternehmen steht nicht in der
          Watchlist. Alle {nf.format(count)} Gesellschaften ab 50 Mrd. USD findest du in
          der Übersicht.
        </p>
        <Link href="/" className="back">
          ← Zurück zur Watchlist
        </Link>
      </section>
    </main>
  );
}
