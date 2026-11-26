import Link from "next/link";
import { formatDate } from "@/lib/format";

export default function Topbar({ asOf, generatedAt }: { asOf: string; generatedAt: string }) {
  const generated = new Date(generatedAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">M</span>
        Market Watchlist
      </Link>
      <div className="topbar-meta">
        <span className="live">
          <span className="live-dot" />
          Handelstag {formatDate(asOf)}
        </span>
        <span>Stand {generated} Uhr</span>
      </div>
    </header>
  );
}
