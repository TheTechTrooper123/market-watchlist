# Market Watchlist

Täglich aktualisierte Watchlist der weltweit größten börsennotierten Unternehmen.
Die Seite liest jeden Handelstag **34 Börsen** aus und zeigt alle Unternehmen, die
die Kriterien erfüllen — aktuell **rund 400 Gesellschaften** aus 28 Ländern.

## Kriterien

| Regel | Umsetzung |
| --- | --- |
| Marktkapitalisierung ≥ 50 Mrd. USD | Marktkapitalisierung je Notierung, mit tagesaktuellem Wechselkurs in USD umgerechnet |
| ~25 Börsen | 34 Cash-Equity-Plätze in Nordamerika, Europa, Asien-Pazifik, Naher Osten, Lateinamerika und Afrika |
| Ein Unternehmen = eine Notierung | Jede Gesellschaft wird an ihrer **Heimatbörse** geführt; Zweitnotierungen (z. B. Apple in Xetra, Toronto oder Mexiko) fallen weg |
| Nur Stammaktien | Hinterlegungsscheine (ADR/ADS/GDR), Fonds, ETFs, Vorzugsaktien, Anleihen und Zertifikate werden aussortiert |
| ≥ 10 Jahre Kurshistorie | Ersthandelsdatum der Notierung muss mindestens zehn Jahre zurückliegen |

### Wie die Heimatbörse bestimmt wird

Der Screener zieht je Notierung den **Sitz des Emittenten** (`assetProfile.country`)
und vergleicht ihn mit dem Land der Börse. Eine Notierung zählt nur, wenn ihre Börse
im Heimatmarkt des Emittenten liegt. Damit verschwinden beide Problemfälle
automatisch:

* **Zweitnotierungen** — Apple in Xetra oder Mexiko: Emittent USA, Börse Deutschland/Mexiko → verworfen.
* **Hinterlegungsscheine** — `TSM` (NYSE) ist ein ADR, `2330.TW` die Stammaktie; `AZN` (NYSE) ist ein ADR, `AZN.L` die Stammaktie. Behalten wird jeweils die Heimatbörse.
* **Mehrere Aktiengattungen** (Alphabet A/C, Samsung Stamm/Vorzug, Petrobras ON/PN) werden zu einem Unternehmen zusammengefasst; die Stammaktie gewinnt.

Sonderfälle mit Sitz außerhalb der ausgelesenen Märkte (Bermuda, Cayman, Jersey,
Luxemburg …) werden über eine Heimatmarkt-Gruppe zugeordnet (siehe `HOME_MARKETS`
in `scripts/screen.mjs`).

## Architektur

```
scripts/screen.mjs          Screener: Börsen auslesen, filtern, data/watchlist.json schreiben
data/watchlist.json         Momentaufnahme (von GitHub Actions täglich neu erzeugt)
app/page.tsx                Seite (Server Component, liest die Momentaufnahme)
components/Watchlist.tsx    Tabelle mit Suche, Filtern, Sortierung, Sparklines
.github/workflows/screen.yml  Cron: werktags 22:30 UTC nach US-Börsenschluss
```

Es gibt keine Datenbank und keinen API-Key: Der GitHub-Action-Job schreibt die
Momentaufnahme ins Repository, der Push löst das Vercel-Deployment aus. Die Seite
ist damit statisch, schnell und immer auf dem Stand des letzten Handelstags.

## Lokal starten

```bash
npm install
npm run screen   # Daten neu ziehen (~40 s, ~2.900 Requests gegen Yahoo Finance)
npm run dev      # http://localhost:3000
```

## Datenquelle

Kurse und Fundamentaldaten von Yahoo Finance (inoffiziell, ohne API-Key).
Keine Anlageberatung.
