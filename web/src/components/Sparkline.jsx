/**
 * Tiny inline SVG sparkline. No deps.
 * Variants:
 *  - "line"  smooth area + line
 *  - "bars"  vertical bars (good for aging buckets)
 */
export default function Sparkline({
  data,
  variant = "line",
  width = 120,
  height = 32,
  color = "var(--accent)",
  className = "",
}) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  if (variant === "bars") {
    const bw = width / data.length;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden="true"
      >
        {data.map((v, i) => {
          const h = Math.max(2, ((v - min) / range) * (height - 2));
          return (
            <rect
              key={i}
              x={i * bw + 1}
              y={height - h}
              width={Math.max(2, bw - 2)}
              height={h}
              rx="1"
              fill={color}
              opacity={0.85}
              style={{
                transformOrigin: `${i * bw + bw / 2}px ${height}px`,
                animation: `grow_bar 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms both`,
              }}
            />
          );
        })}
      </svg>
    );
  }

  // line variant
  const stepX = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const line = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="urba-spark-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#urba-spark-fade)" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.slice(-1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={color} />
      ))}
    </svg>
  );
}
