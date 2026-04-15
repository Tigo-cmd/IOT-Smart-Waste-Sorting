import { CategoryStats, WasteClass } from '../types';
import { CLASS_COLORS } from '../lib/utils';

interface DonutChartProps {
  stats: CategoryStats;
  total: number;
}

export default function DonutChart({ stats, total }: DonutChartProps) {
  const categories = Object.entries(stats) as [WasteClass, number][];
  const nonZero = categories.filter(([, v]) => v > 0);

  const radius = 56;
  const stroke = 14;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = nonZero.map(([key, value]) => {
    const pct = value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const startOffset = -offset;
    offset += dash;
    return { key, value, pct, dash, gap, startOffset };
  });

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-slate-500 text-sm">No data yet</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
          />
          {segments.map(({ key, dash, gap, startOffset }) => (
            <circle
              key={key}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={CLASS_COLORS[key]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={startOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-white text-2xl font-bold leading-none">{total}</p>
          <p className="text-slate-400 text-xs mt-0.5">Total</p>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {categories.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: CLASS_COLORS[key] }}
            />
            <span className="text-slate-300 text-sm capitalize flex-1">{key}</span>
            <span className="text-slate-400 text-sm font-medium">{value}</span>
            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: total > 0 ? `${(value / total) * 100}%` : '0%',
                  backgroundColor: CLASS_COLORS[key],
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
