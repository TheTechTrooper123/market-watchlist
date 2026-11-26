type Props = {
  data: number[];
  width?: number;
  height?: number;
};

const VERTICAL_PADDING = 2;

/** Tiny trend line for one table row; drawn in listing currency. */
export default function Sparkline({ data, width = 92, height = 26 }: Props) {
  if (!data || data.length < 2) {
    return <span style={{ color: "var(--muted-2)" }}>—</span>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);

  const y = (value: number) =>
    height - VERTICAL_PADDING - ((value - min) / span) * (height - 2 * VERTICAL_PADDING);

  const points = data
    .map((value, index) => `${(index * stepX).toFixed(2)},${y(value).toFixed(2)}`)
    .join(" ");
  const lastValue = data[data.length - 1];
  const color = lastValue >= data[0] ? "var(--up)" : "var(--down)";

  return (
    <svg
      className="spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx={(width - 1).toFixed(2)} cy={y(lastValue).toFixed(2)} r="1.7" fill={color} />
    </svg>
  );
}
