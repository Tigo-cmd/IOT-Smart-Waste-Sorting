import { useState, useCallback } from 'react';
import { FilterState } from './types';
import { useDetections } from './hooks/useDetections';
import { useDevices } from './hooks/useDevices';
import { useAlerts } from './hooks/useAlerts';
import { useStats } from './hooks/useStats';
import Header from './components/Header';
import LivePanel from './components/LivePanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import HistoryTable from './components/HistoryTable';

const DEFAULT_FILTERS: FilterState = {
  device: 'all',
  category: 'all',
  dateFrom: '',
  dateTo: '',
};

export default function App() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  const { detections, loading: detectionsLoading, refetch: refetchDetections } = useDetections(filters);
  const { devices, refetch: refetchDevices } = useDevices();
  const { refetch: refetchAlerts } = useAlerts();
  const { categoryStats, totalDetections, avgConfidence, lowConfidenceCount, dailyCounts } = useStats(detections);

  const handleRefresh = useCallback(() => {
    refetchDetections();
    refetchDevices();
    refetchAlerts();
    setLastUpdated(new Date());
  }, [refetchDetections, refetchDevices, refetchAlerts]);

  const latest = detections[0] ?? null;

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-cyan-500/30">
      <Header devices={devices} lastUpdated={lastUpdated} onRefresh={handleRefresh} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <LivePanel latest={latest} />
          </div>

          <div className="lg:col-span-7">
            <AnalyticsPanel
              categoryStats={categoryStats}
              totalDetections={totalDetections}
              avgConfidence={avgConfidence}
              lowConfidenceCount={lowConfidenceCount}
              dailyCounts={dailyCounts}
            />
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-8">
          <HistoryTable
            detections={detections}
            devices={devices}
            filters={filters}
            onFilterChange={setFilters}
            loading={detectionsLoading}
          />
        </div>
      </main>
    </div>
  );
}
