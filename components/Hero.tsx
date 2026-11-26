import { formatInteger } from "@/lib/format";

type Props = {
  companyCount: number;
  venueCount: number;
  minHistoryYears: number;
};

export default function Hero({ companyCount, venueCount, minHistoryYears }: Props) {
  return (
    <div>
      <h1>
        Die <em>{formatInteger(companyCount)}</em> Schwergewichte
        <br />
        der Weltbörsen
      </h1>
      <p className="lede">
        Jeden Handelstag liest der Screener <strong>{venueCount} Börsen</strong> aus und
        behält alle Unternehmen ab <strong>50 Mrd. USD</strong> Marktkapitalisierung. Jedes
        Unternehmen wird nur einmal geführt — an seiner <strong>Heimatbörse</strong> und nur
        mit seinen <strong>Stammaktien</strong>: Hinterlegungsscheine, Zweitnotierungen,
        Anleihen, Fonds und Zertifikate fallen weg. Voraussetzung sind zudem mindestens{" "}
        <strong>{minHistoryYears} Jahre Kursgeschichte</strong>.
      </p>
    </div>
  );
}
