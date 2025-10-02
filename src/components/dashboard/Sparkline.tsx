import React from 'react';

interface SparklineProps {
  values?: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
}

// Lightweight SVG sparkline (no external deps)
const Sparkline: React.FC<SparklineProps> = ({
  values = [],
  width = 80,
  height = 24,
  stroke = 'hsl(var(--primary))',
  fill = 'none',
  strokeWidth = 2,
  className
}) => {
  if (!values.length) {
    return <div className={"text-[10px] text-muted-foreground " + (className||'')}>—</div>;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 2) + 1;
    const y = height - (((v - min) / range) * (height - 2) + 1);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-label="sparkline">
      <polyline
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
};

export default Sparkline;