type Props = {
  /** Monthly closes in listing currency. */
  data: number[];
  /** First month of the series, ISO date. */
  start: string;
  currency: string;
};

const WIDTH = 1000;
const HEIGHT = 320;
const PADDING = 8;

function formatAxisValue(value: number, currency: string) {
  const digits = value >= 1000 ? 0 : value >= 10 ? 2 : 3;
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${currency}`;
}

/** Year labels for the x axis, without duplicates for short series. */
function yearLabels(startIso: string, pointCount: number): number[] {
  const startYear = Number(startIso.slice(0, 4)) || new Date().getFullYear() - 10;
  const endYear = startYear + Math.round((pointCount - 1) / 12);
  const labels = Array.from({ length: 6 }, (_, index) =>
    Math.round(startYear + ((endYear - startYear) * index) / 5),
  );
  return labels.filter((year, index) => labels.indexOf(year) === index);
}

/** Server-rendered SVG: no chart library, no client JavaScript. */
export default function PriceChart({ data, start, currency }: Props) {
  if (!data || data.length < 2) {
    return <div className="chart-empty">Kein Kursverlauf verfügbar.</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = WIDTH / (data.length - 1);

  const x = (index: number) => index * stepX;
  const y = (value: number) =>
    HEIGHT - PADDING - ((value - min) / span) * (HEIGHT - 2 * PADDING);

  const line = data.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${HEIGHT} ${line} ${x(data.length - 1).toFixed(1)},${HEIGHT}`;
  const stroke = data[data.length - 1] >= data[0] ? "var(--up)" : "var(--down)";
  const gridValues = [max, min + span / 2, min];
  const years = yearLabels(start, data.length);

  return (
    <div className="chart">
      <div className="chart-body">
        <div className="chart-plot">
          <svg
            className="chart-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
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

            {gridValues.map((value) => (
              <line
                key={value}
                x1="0"
                x2={WIDTH}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--border)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={value === gridValues[1] ? "3 4" : undefined}
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
          {gridValues.map((value) => (
            <span key={value}>{formatAxisValue(value, currency)}</span>
          ))}
        </div>
      </div>

      <div className="chart-axis-x">
        {years.map((year) => (
          <span key={year}>{year}</span>
        ))}
      </div>
    </div>
  );
}
