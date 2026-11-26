import snapshotJson from "@/data/watchlist.json";
import historyJson from "@/data/history.json";
import type { Snapshot } from "@/lib/types";

export type History = {
  generatedAt: string;
  series: Record<string, { s: string; c: number[] }>;
};

const RAW_BASE =
  "https://raw.githubusercontent.com/TheTechTrooper123/market-watchlist/main/data";

const bundledSnapshot = snapshotJson as unknown as Snapshot;
const bundledHistory = historyJson as unknown as History;

/**
 * Die Momentaufnahme wird zur Laufzeit aus dem Repository geladen. Der tägliche
 * Screener committet dort frische Dateien, die Seite zieht sie beim nächsten
 * Revalidieren nach — ohne neues Deployment.
 */
export async function loadSnapshot(): Promise<Snapshot> {
  try {
    const res = await fetch(`${RAW_BASE}/watchlist.json`, { next: { revalidate: 900 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Snapshot;
    if (!Array.isArray(data.companies) || data.companies.length === 0) throw new Error("leer");
    return data;
  } catch {
    return bundledSnapshot;
  }
}

export async function loadHistory(): Promise<History> {
  try {
    const res = await fetch(`${RAW_BASE}/history.json`, { next: { revalidate: 900 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as History;
    if (!data.series) throw new Error("leer");
    return data;
  } catch {
    return bundledHistory;
  }
}

export function allCompanies(): Snapshot["companies"] {
  return bundledSnapshot.companies;
}
