import { DailyCount } from '../types';

interface ActivityChartProps {
  data: DailyCount[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 h-24 w-full">
      {data.map((day) => {
        const pct = (day.count / maxCount) * 100;
        const isToday = day.label === 'Today';
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="relative w-full flex items-end" style={{ height: '72px' }}>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  isToday ? 'bg-cyan-500' : 'bg-slate-600 group-hover:bg-slate-500'
                }`}
                style={{ height: `${Math.max(pct, day.count > 0 ? 6 : 2)}%` }}
              />
              {day.count > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {day.count}
                </div>
              )}
            </div>
            <span className={`text-xs ${isToday ? 'text-cyan-400 font-medium' : 'text-slate-500'} truncate w-full text-center`}>
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
