import snapshotJson from "@/data/watchlist.json";
import historyJson from "@/data/history.json";
import { RAW_DATA_BASE, REVALIDATE_SECONDS } from "@/lib/site";
import type { Company, History, Snapshot } from "@/lib/types";

/**
 * The daily screener commits fresh JSON to the repository, so the page reads it
 * from there and revalidates in the background. The copies bundled at build time
 * are the fallback when the repository is unreachable.
 */
const bundledSnapshot = snapshotJson as unknown as Snapshot;
const bundledHistory = historyJson as unknown as History;

async function loadFromRepository<T>(file: string): Promise<T | null> {
  try {
    const response = await fetch(`${RAW_DATA_BASE}/${file}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loadSnapshot(): Promise<Snapshot> {
  const snapshot = await loadFromRepository<Snapshot>("watchlist.json");
  if (!snapshot || !Array.isArray(snapshot.companies) || snapshot.companies.length === 0) {
    return bundledSnapshot;
  }
  return snapshot;
}

export async function loadHistory(): Promise<History> {
  const history = await loadFromRepository<History>("history.json");
  if (!history?.series) return bundledHistory;
  return history;
}

/** Companies of the build-time snapshot: static params and the 404 page need them. */
export function bundledCompanies(): Company[] {
  return bundledSnapshot.companies;
}
