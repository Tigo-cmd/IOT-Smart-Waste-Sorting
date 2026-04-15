import { BarChart2, Target, TrendingUp } from 'lucide-react';
import { CategoryStats, DailyCount } from '../types';
import DonutChart from './DonutChart';

interface AnalyticsPanelProps {
  categoryStats: CategoryStats;
  totalDetections: number;
  avgConfidence: number;
  lowConfidenceCount: number;
  dailyCounts: DailyCount[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/40 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-slate-400 text-xs mb-0.5">{label}</p>
        <p className="text-white text-xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPanel({
  categoryStats,
  totalDetections,
  avgConfidence,
  lowConfidenceCount,
  dailyCounts,
}: AnalyticsPanelProps) {
  const todayCount = dailyCounts[dailyCounts.length - 1]?.count ?? 0;

  return (
    <div className="card h-full flex flex-col justify-between space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Performance Summary</h2>
        <div className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400 font-medium uppercase">
          Real-time
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={BarChart2}
          label="Total"
          value={totalDetections}
          sub={`${todayCount} today`}
          accent="bg-cyan-500/15 text-cyan-400"
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={totalDetections > 0 ? `${(avgConfidence * 100).toFixed(0)}%` : '—'}
          sub="Avg. Confidence"
          accent="bg-green-500/15 text-green-400"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center py-4 border-y border-slate-800/50">
        <DonutChart stats={categoryStats} total={totalDetections} />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-400">
            {lowConfidenceCount} Low Confidence Detections
          </span>
        </div>
        <TrendingUp size={14} className="text-slate-600" />
      </div>
    </div>
  );
}
