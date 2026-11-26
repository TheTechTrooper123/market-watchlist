type Props = {
  data: number[];
  start: string;
  currency: string;
};

function fmt(value: number, currency: string) {
  const digits = value >= 1000 ? 0 : value >= 10 ? 2 : 3;
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${currency}`;
}

/** Server-gerendertes SVG: keine Client-Bibliothek, kein JavaScript nötig. */
export default function PriceChart({ data, start, currency }: Props) {
  if (!data || data.length < 2) {
    return <div className="chart-empty">Kein Kursverlauf verfügbar.</div>;
  }

  const W = 1000;
  const H = 320;
  const PAD = 8;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = W / (data.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const x = (i: number) => i * stepX;

  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${H} ${line} ${x(data.length - 1).toFixed(1)},${H}`;
  const up = data[data.length - 1] >= data[0];
  const stroke = up ? "var(--up)" : "var(--down)";

  const startYear = Number(start.slice(0, 4)) || new Date().getFullYear() - 10;
  const endYear = startYear + Math.round((data.length - 1) / 12);
  const years = [0, 1, 2, 3, 4, 5]
    .map((i) => Math.round(startYear + ((endYear - startYear) * i) / 5))
    .filter((v, i, a) => a.indexOf(v) === i);

  const gridValues = [max, min + span / 2, min];

  return (
    <div className="chart">
      <div className="chart-body">
        <div className="chart-plot">
          <svg
          className="chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Kursverlauf der letzten zehn Jahre"
        >
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridValues.map((v) => (
            <line
              key={v}
              x1="0"
              x2={W}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={v === gridValues[1] ? "3 4" : undefined}
            />
          ))}
          <polygon points={area} fill="url(#fill)" />
          <polyline
            points={line}
            fill="none"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          </svg>
        </div>
        <div className="chart-axis-y">
          {gridValues.map((v, i) => (
            <span key={i}>{fmt(v, currency)}</span>
          ))}
        </div>
      </div>
      <div className="chart-axis-x">
        {years.map((yr) => (
          <span key={yr}>{yr}</span>
        ))}
      </div>
    </div>
  );
}
