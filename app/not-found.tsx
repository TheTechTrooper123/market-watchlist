import Link from "next/link";
import { bundledCompanies } from "@/lib/data";
import { formatInteger } from "@/lib/format";

export default function NotFound() {
  const companyCount = bundledCompanies().length;

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
          Watchlist. Alle {formatInteger(companyCount)} Gesellschaften ab 50 Mrd. USD findest
          du in der Übersicht.
        </p>
        <Link href="/" className="back">
          ← Zurück zur Watchlist
        </Link>
      </section>
    </main>
  );
}
