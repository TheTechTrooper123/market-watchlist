# Market Watchlist

Täglich aktualisierte Watchlist der weltweit größten börsennotierten Unternehmen.

[![Täglicher Screener](https://github.com/TheTechTrooper123/market-watchlist/actions/workflows/screen.yml/badge.svg)](https://github.com/TheTechTrooper123/market-watchlist/actions/workflows/screen.yml)
[![Deployment](https://github.com/TheTechTrooper123/market-watchlist/actions/workflows/deploy.yml/badge.svg)](https://github.com/TheTechTrooper123/market-watchlist/actions/workflows/deploy.yml)

**Live:** https://market-watchlist.ddnsfree.com
**Fallback-URL:** https://market-watchlist-one.vercel.app

Jeden Handelstag liest der Screener **34 Börsen** aus und behält alle Unternehmen ab
**50 Mrd. USD** Marktkapitalisierung. Voraussetzung sind eine Notierung an der
Heimatbörse, reine Stammaktien und mindestens zehn Jahre Kurshistorie — das ergibt
**rund 400 Gesellschaften** aus 27 Ländern.

## Inhalt

- [Was die Seite zeigt](#was-die-seite-zeigt)
- [Kriterien](#kriterien)
- [Heimatbörse, Stammaktien, Dubletten](#heimatbörse-stammaktien-dubletten)
- [Architektur](#architektur)
- [Automatisierung](#automatisierung)
- [Fehlermeldungen](#fehlermeldungen)
- [Domain und Hosting](#domain-und-hosting)
- [Lokal starten](#lokal-starten)
- [Konfiguration](#konfiguration)
- [Datenformat](#datenformat)
- [Aktueller Datenstand](#aktueller-datenstand)
- [Datenquelle, Grenzen, Rechtliches](#datenquelle-grenzen-rechtliches)
- [Fehlerbehebung](#fehlerbehebung)

## Was die Seite zeigt

| Ansicht | Inhalt |
| --- | --- |
| Startseite `/` | Kennzahlen (Unternehmen, Börsen, Länder), vollständige Tabelle mit Suche, Filter nach Land/Börse/Sektor, Sortierung nach Marktkapitalisierung, Kurs, Tagesänderung, Historie und Rang, Sparkline je Zeile |
| Detailseite `/u/<symbol>` | Kennzahlen (Marktkapitalisierung, Kurs, erste Notierung, Kurshistorie, Börse, Land, Sektor, Branche, Rang, 10-Jahres-Entwicklung) und Kursverlauf der letzten zehn Jahre als serverseitig gerendertes SVG |

Die Oberfläche ist deutsch, Preise erscheinen in der jeweiligen Landeswährung,
Marktkapitalisierungen immer in USD. Beide Seiten werden statisch vorgerendert und
alle 15 Minuten revalidiert.

**Veraltungshinweis:** Ist der Datenstand älter als zwei Handelstage, zeigt die
Startseite über dem Hero einen Hinweis mit Datum, Anzahl der Handelstage und einem
Link zu den Workflow-Läufen. Die Prüfung steckt in `lib/freshness.ts`
(`STALE_AFTER_TRADING_DAYS = 2`, gezählt werden Werktage; Börsenfeiertage bleiben
unberücksichtigt).

## Kriterien

| Regel | Umsetzung |
| --- | --- |
| Marktkapitalisierung ≥ 50 Mrd. USD | Marktkapitalisierung je Notierung, mit tagesaktuellem Wechselkurs in USD umgerechnet |
| ~25 Börsen | 34 Cash-Equity-Plätze in Nordamerika, Europa, Asien-Pazifik, Naher Osten, Lateinamerika und Afrika (`VENUES` in `scripts/screen.mjs`) |
| Ein Unternehmen = eine Notierung | Jede Gesellschaft wird an ihrer **Heimatbörse** geführt; Zweitnotierungen (z. B. Apple in Xetra, Toronto oder Mexiko) fallen weg |
| Nur Stammaktien | Hinterlegungsscheine (ADR/ADS/GDR), Fonds, ETFs, Vorzugsaktien, Anleihen und Zertifikate werden aussortiert |
| ≥ 10 Jahre Kurshistorie | Ersthandelsdatum der Notierung muss mindestens zehn Jahre zurückliegen |
| Plausible Kurse | Marktkapitalisierungen über 25 Billionen USD gelten als fehlerhafte Kursdaten und werden verworfen |

## Heimatbörse, Stammaktien, Dubletten

Der Screener zieht je Notierung den **Sitz des Emittenten** (`assetProfile.country`)
und vergleicht ihn mit dem Land der Börse. Eine Notierung zählt nur, wenn ihre Börse
im Heimatmarkt des Emittenten liegt. Damit verschwinden beide Problemfälle
automatisch:

- **Zweitnotierungen** — Apple in Xetra oder Mexiko: Emittent USA, Börse
  Deutschland/Mexiko → verworfen.
- **Hinterlegungsscheine** — `TSM` (NYSE) ist ein ADR, `2330.TW` die Stammaktie;
  `AZN` (NYSE) ist ein ADR, `AZN.L` die Stammaktie. Behalten wird jeweils die
  Heimatbörse.
- **Mehrere Aktiengattungen** (Alphabet A/C, Samsung Stamm/Vorzug, Petrobras ON/PN)
  werden über den normalisierten Firmennamen zu einem Unternehmen zusammengefasst;
  die Stammaktie gewinnt.
- **Sonderfälle mit Sitz außerhalb der ausgelesenen Märkte** (Bermuda, Cayman, Jersey,
  Luxemburg …) werden über eine Heimatmarkt-Gruppe zugeordnet (siehe `HOME_MARKETS`
  in `scripts/screen.mjs`).

## Architektur

```
app/
  page.tsx            Startseite: Kennzahlen, Hero, Tabelle
  u/[symbol]/page.tsx Detailseite, statisch vorgerendert für alle Symbole
  layout.tsx, globals.css
components/
  Watchlist.tsx       Tabelle mit Suche, Filtern, Sortierung, Sparklines
  PriceChart.tsx      10-Jahres-Liniendiagramm als SVG (ohne Chart-Bibliothek)
  Topbar.tsx          Kopfzeile mit Datenstand
lib/
  data.ts             Laden der Momentaufnahme (ISR aus dem Repo, Fallback: gebündelte JSON)
  format.ts           Zahlen-, Kurs- und Datumsformatierung (de-DE)
  types.ts            Typen für Snapshot und Kursreihen
scripts/
  screen.mjs          Screener: Börsen auslesen, filtern, beide JSON-Dateien schreiben
data/
  watchlist.json      Momentaufnahme (Unternehmen, Kennzahlen, Statistik)
  history.json        Monatsreihen der letzten zehn Jahre je Symbol
.github/workflows/
  screen.yml          Cron: werktags 22:30 UTC
  deploy.yml          Deployment bei Push auf main
```

**Datenfluss**

1. `screen.yml` startet `node scripts/screen.mjs` (rund 50 s, ~3.000 Requests gegen
   Yahoo Finance), prüft die Ergebnisgröße und committet `data/` zurück ins Repo.
2. Die Seite liest `data/watchlist.json` und `data/history.json` zur **Laufzeit** über
   `raw.githubusercontent.com` (`lib/data.ts`, Revalidierung alle 900 s). Neue Daten
   erscheinen dadurch ohne Deployment. Schlägt der Abruf fehl, greift die im Build
   gebündelte Kopie.
3. Code-Änderungen auf `main` lösen `deploy.yml` aus, das nach Typecheck und Build zu
   Vercel deployt.

Es gibt keine Datenbank und keinen API-Key für die Kursdaten.

## Automatisierung

### Täglicher Screener — `screen.yml`

- **Zeitplan:** `30 22 * * 1-5` — werktags 22:30 UTC, also nach Handelsschluss in New
  York (21:00 UTC). GitHub kann geplante Läufe bei hoher Last um einige Minuten
  verzögern und führt Zeitpläne nur vom Default-Branch `main` aus.
- **Manuell:** Actions → „Täglicher Screener“ → *Run workflow* oder
  `gh workflow run screen.yml`.
- **Plausibilitätsprüfung:** Der Lauf schlägt fehl, wenn weniger als 300 Unternehmen
  oder weniger als 300 Kursreihen entstehen — das ist das typische Symptom, wenn
  Yahoo Finance sein Antwortformat ändert oder drosselt. In diesem Fall wird nichts
  committet und die Seite behält den letzten guten Stand.
- **Abbruch nach 20 Minuten** (`timeout-minutes`), damit ein hängender Lauf nicht
  unbemerkt weiterläuft.
- **Zusammenfassung:** Unternehmen, Kursreihen und Erzeugungszeitpunkt stehen im
  Job-Summary des Laufs.

### Deployment — `deploy.yml`

- **Auslöser:** Push auf `main`; Daten-Commits (`data/**`) und reine
  Markdown-Änderungen sind ausgenommen, weil die Seite die Daten ohnehin zur Laufzeit
  zieht.
- **Ablauf:** `npm ci` → `tsc --noEmit` → `vercel deploy --prod --yes --archive=tgz`.
  Vercel baut aus dem Quellcode; der Tarball-Upload verbraucht nur eine Datei statt
  hunderter und hält damit das Upload-Limit des Free-Plans ein.
- **Manuell:** `gh workflow run deploy.yml`.
- **Parallele Läufe:** Ein neuer Push bricht einen laufenden Deploy ab
  (`concurrency: deploy-production`).

> Die native Vercel-GitHub-Integration ist nicht aktiv: Die Vercel-GitHub-App hat
> keinen Zugriff auf dieses Repository (`vercel git connect` scheitert mit „You need
> admin or write access to the repository“). Die Action oben leistet dasselbe —
> Push auf `main` ergibt ein Produktions-Deployment.

### Benötigte Repository-Secrets

| Secret | Inhalt |
| --- | --- |
| `VERCEL_TOKEN` | Vercel-Zugriffstoken des Kontos `till-dev` (`vercel tokens create`) |
| `VERCEL_ORG_ID` | Team-ID `team_N4FndqdmVdXsKMOatxALg4Rp` |
| `VERCEL_PROJECT_ID` | Projekt-ID `prj_rI602u4kXdSPPxkOdYcVdC5nsVry` |

Setzen mit `gh secret set <NAME>`. Der Screener braucht keine Secrets; er nutzt das
automatische `GITHUB_TOKEN` (`permissions: contents: write`).

## Fehlermeldungen

Beide Workflows melden Fehler als **GitHub-Issue** — GitHub benachrichtigt dich dazu
per E-Mail (Standard-Einstellung „Participating, @mentions and custom“).

| Workflow | Issue-Titel | Wann |
| --- | --- | --- |
| `screen.yml` | `Screener-Lauf fehlgeschlagen` | Screening-Fehler, leere/zu kleine Daten, Push-Fehler, Timeout |
| `deploy.yml` | `Deployment fehlgeschlagen` | Install-, Typecheck-, Build- oder Deploy-Fehler |

Verhalten:

- Das erste Auftreten legt das Issue an, mit Zeitpunkt, Auslöser, Branch, Commit und
  direktem Link zum Lauf.
- Weitere Fehlschläge hängen einen Kommentar an das offene Issue, statt ein neues zu
  erzeugen.
- Der nächste erfolgreiche Lauf kommentiert und **schließt** das Issue automatisch.
- Läufe lassen sich zusätzlich in der Actions-Übersicht und per
  `gh run list --workflow=screen.yml` einsehen.

## Domain und Hosting

- **Domain:** `market-watchlist.ddnsfree.com` (Dynu DDNS, kostenlose Subdomain).
- **DNS:** CNAME auf `cname.vercel-dns.com`, TTL 600 (Apex-Record, kein A-Record).
- **Vercel-Projekt:** `market-watchlist` im Team `till9`, Domain dort hinterlegt und
  per Let's-Encrypt-Zertifikat abgesichert; HTTP leitet mit 308 auf HTTPS um.
- **Zweite Adresse:** `market-watchlist-one.vercel.app` bleibt als Vercel-Standardalias
  erreichbar.

Dynu per API (Key aus `dynu_config.json`, Header `API-Key`):

```bash
# Domain anlegen
curl -X POST -H "API-Key: $DYNU_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"market-watchlist.ddnsfree.com","ipv4Address":"76.76.21.21","ttl":600,"ipv4":true,"ipv6":false}' \
  https://api.dynu.com/v2/dns

# CNAME setzen (nach dem Anlegen ist die Domain-ID bekannt)
curl -X POST -H "API-Key: $DYNU_API_KEY" -H "Content-Type: application/json" \
  -d '{"domainName":"market-watchlist.ddnsfree.com","nodeName":"","recordType":"CNAME","host":"cname.vercel-dns.com","ttl":600,"state":true}' \
  "https://api.dynu.com/v2/dns/<domain-id>/record"

# Domain mit dem Vercel-Projekt verbinden
vercel domains add market-watchlist.ddnsfree.com market-watchlist --force
```

## Lokal starten

```bash
npm install
npm run screen   # Daten neu ziehen (~50 s, ~3.000 Requests gegen Yahoo Finance)
npm run dev      # http://localhost:3000
npm run build    # Produktions-Build (statisch vorgerendert)
```

Voraussetzung: Node.js 22 oder neuer (GitHub Action und Vercel nutzen Node 22).

## Konfiguration

Stellschrauben in `scripts/screen.mjs`:

| Konstante | Bedeutung |
| --- | --- |
| `MIN_MARKET_CAP_USD` | Mindest-Marktkapitalisierung (50 Mrd. USD) |
| `MIN_HISTORY_YEARS` | Mindest-Kurshistorie (10 Jahre) |
| `MAX_PLAUSIBLE_MARKET_CAP_USD` | Obergrenze gegen fehlerhafte Kursdaten (25 Billionen USD) |
| `VENUES` | Ausgelesene Börsen mit Land |
| `HOME_MARKETS` | Zuordnung von Sitzländern ohne eigene Börse zum Heimatmarkt |
| `VENUE_MCAP_CURRENCY` | Börsen, die Marktkapitalisierung in Haupt- und Kurse in Nebeneinheiten melden |

In `lib/data.ts` legt `RAW_BASE` fest, woher die Laufzeitdaten kommen, und
`revalidate: 900` das Aktualisierungsintervall.

## Datenformat

`data/watchlist.json`

```jsonc
{
  "generatedAt": "2026-11-26T17:59:42.041Z",
  "asOf": "2026-11-26",
  "venues": [{ "code": "NMS", "name": "Nasdaq Global Select", "country": "United States" }],
  "criteria": { "minMarketCapUsd": 50000000000, "minHistoryYears": 10, "venues": 34 },
  "stats": { "companies": 407, "listingsScanned": 7456, "companiesBeforeHistoryFilter": 459, "dropped": {} },
  "companies": [
    {
      "rank": 1, "name": "…", "symbol": "AAPL", "exchangeCode": "NMS",
      "exchange": "Nasdaq Global Select", "country": "United States",
      "sector": "…", "industry": "…", "marketCapUsd": 0, "price": 0,
      "currency": "USD", "changePct": 0, "listingSince": "1980-12-12",
      "yearsHistory": 45.9, "spark": [0]
    }
  ]
}
```

`data/history.json`

```jsonc
{
  "generatedAt": "2026-11-26T17:59:42.041Z",
  "series": { "AAPL": { "s": "2016-11-01", "c": [0, 0] } }
}
```

`s` ist der erste Monat der Reihe, `c` die Monatsschlusskurse in Börsenwährung.

## Aktueller Datenstand

Letzter Screener-Lauf: **26. November 2026, 17:59 UTC**

| Kennzahl | Wert |
| --- | --- |
| Geprüfte Notierungen | 7.456 |
| Über 50 Mrd. USD | 459 Unternehmen |
| Nach Historien- und Heimatbörsenfilter | **407 Unternehmen** |
| Börsen im Scan | 34 (28 Börsenplätze in der Liste vertreten) |
| Länder | 27 |

Aussortiert im letzten Lauf: 5.349 unter 50 Mrd. USD, 336 ohne Kursdaten oder
Marktwert, 253 keine Stammaktie (Fonds, Vorzüge, Anleihen, ADR), 52 unter zehn Jahren
Historie, 24 nur Zweitnotierung oder Hinterlegungsschein, 2 unplausible Kursdaten,
1 unbekannter Sitz.

## Datenquelle, Grenzen, Rechtliches

- **Quelle:** Yahoo Finance über inoffizielle JSON-Endpunkte
  (`screener`, `quoteSummary`, `chart`, FX-Kurse), ohne API-Key.
- **Grenzen:** Die Endpunkte sind nicht dokumentiert und können sich ändern; es gibt
  keine Garantie auf Vollständigkeit oder Richtigkeit. Der Screener läuft deshalb mit
  Plausibilitätsprüfung, Zeitlimit und Fehlermeldung. Kennzahlen sind Momentaufnahmen
  des letzten Handelstags.
- **Historie:** Monatsschlusskurse der letzten zehn Jahre, keine Dividenden- oder
  Splittanpassung über Yahoo hinaus.
- **Keine Anlageberatung.** Alle Angaben ohne Gewähr; Nutzung auf eigene Gefahr.

## Fehlerbehebung

| Symptom | Ursache und Lösung |
| --- | --- |
| Seite zeigt alte Zahlen | ISR-Cache (900 s) abwarten oder Deployment neu auslösen; Datenstand steht in der Kopfzeile |
| Issue „Screener-Lauf fehlgeschlagen“ | Lauf öffnen, fehlgeschlagenen Schritt prüfen; häufig Yahoo-Drosselung → einfach neu starten (`gh workflow run screen.yml`) |
| Screener meldet „Nur … Unternehmen“ | Yahoo-Antwortformat geändert oder Rate-Limit; `scripts/screen.mjs` lokal mit `npm run screen` prüfen |
| Domain zeigt 404 oder Zertifikatsfehler | `dig +short market-watchlist.ddnsfree.com CNAME` muss `cname.vercel-dns.com.` liefern; sonst CNAME bei Dynu prüfen und `vercel domains verify market-watchlist.ddnsfree.com` ausführen |
| Deploy schlägt fehl | Issue „Deployment fehlgeschlagen“ mit Lauf-Link; Typecheck lokal mit `npx tsc --noEmit` reproduzieren |
| Deploy meldet `Too many requests … api-upload-free` | Vercel-Free-Plan: mehr als 5.000 hochgeladene Dateien in 24 Stunden. Der Workflow lädt deshalb ein tgz-Archiv; bei vielen Deploys hilft nur Abwarten bis zum Ablauf des Fensters |
| `vercel git connect` scheitert | Vercel-GitHub-App hat keinen Repo-Zugriff; Deploy läuft stattdessen über `deploy.yml` |

## Lizenz

Kein Lizenzfile — privates Projekt. Die Kursdaten gehören Yahoo Finance bzw. den
jeweiligen Börsen; Weiterverwendung dortiger Daten richtet sich nach deren
Bedingungen.
