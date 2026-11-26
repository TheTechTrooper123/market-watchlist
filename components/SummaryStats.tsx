import { formatInteger } from "@/lib/format";

type Props = {
  companyCount: number;
  venueCount: number;
  countryCount: number;
  minMarketCapUsd: number;
};

const MINIMUM_IN_BILLIONS = 50;

export default function SummaryStats({
  companyCount,
  venueCount,
  countryCount,
  minMarketCapUsd,
}: Props) {
  const minimum = minMarketCapUsd / 1e9 || MINIMUM_IN_BILLIONS;

  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-value">{formatInteger(companyCount)}</div>
        <div className="stat-label">Unternehmen</div>
      </div>
      <div className="stat">
        <div className="stat-value">{venueCount}</div>
        <div className="stat-label">Börsen im Scan</div>
      </div>
      <div className="stat">
        <div className="stat-value">{formatInteger(countryCount)}</div>
        <div className="stat-label">Länder</div>
      </div>
      <div className="stat">
        <div className="stat-value">{formatInteger(minimum)}</div>
        <div className="stat-label">Mrd. USD Minimum</div>
      </div>
    </div>
  );
}
