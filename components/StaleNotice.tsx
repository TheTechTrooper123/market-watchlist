import { SCREENER_RUNS_URL } from "@/lib/site";

type Props = {
  /** Snapshot date, already formatted for display. */
  date: string;
  tradingDays: number;
};

/** Shown when the data is older than the allowed number of trading days. */
export default function StaleNotice({ date, tradingDays }: Props) {
  return (
    <aside className="stale" role="status">
      <div className="stale-main">
        <strong>Datenstand veraltet</strong>
        <span>
          Die Momentaufnahme stammt vom {date} — das sind {tradingDays} Handelstage. Der
          tägliche Screener hat seither nicht aktualisiert, angezeigt wird der letzte
          erfolgreiche Stand.
        </span>
      </div>
      <a
        className="stale-link"
        href={SCREENER_RUNS_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Workflow-Läufe ansehen
      </a>
    </aside>
  );
}
