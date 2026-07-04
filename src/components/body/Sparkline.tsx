"use client";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}

/** Minimal SVG sparkline for e1RM trends. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  stroke = "var(--color-accent)",
}: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="rgba(255,255,255,0.15)"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 3;
  const points = values
    .map((v, i) => {
      const x = pad + (i * (width - pad * 2)) / (values.length - 1);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
