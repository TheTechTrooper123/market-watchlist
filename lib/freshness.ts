const DAY_MS = 24 * 60 * 60 * 1000;

/** Nach so vielen Handelstagen ohne neuen Datenstand gilt die Liste als veraltet. */
export const STALE_AFTER_TRADING_DAYS = 2;

/** Kalendertag in Berliner Zeit als YYYY-MM-DD. */
function todayInBerlin(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Werktage (Mo–Fr) zwischen zwei Kalendertagen. Börsenfeiertage bleiben
 * unberücksichtigt — dadurch liegt die Schätzung eher zu hoch, was bei einer
 * Warnung unkritisch ist.
 */
export function tradingDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return 0;

  let days = 0;
  for (let t = from + DAY_MS; t <= to; t += DAY_MS) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

/** Alter der Momentaufnahme in Handelstagen und ob sie als veraltet gilt. */
export function staleness(asOf: string, now: Date = new Date()) {
  const tradingDays = tradingDaysBetween(asOf, todayInBerlin(now));
  return {
    tradingDays,
    isStale: tradingDays > STALE_AFTER_TRADING_DAYS,
  };
}
