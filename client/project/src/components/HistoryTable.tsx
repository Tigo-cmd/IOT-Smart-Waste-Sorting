import { useState } from 'react';
import { Eye, SlidersHorizontal, X } from 'lucide-react';
import { Detection, Device, FilterState, WasteClass } from '../types';
import { CLASS_BG, CLASS_COLORS, formatTimestamp, confidenceLabel } from '../lib/utils';
import ImageModal from './ImageModal';

const WASTE_CLASSES: (WasteClass | 'all')[] = ['all', 'plastic', 'metal', 'organic', 'paper', 'nylon', 'unknown'];

interface HistoryTableProps {
  detections: Detection[];
  devices: Device[];
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  loading: boolean;
}

export default function HistoryTable({
  detections,
  devices,
  filters,
  onFilterChange,
  loading,
}: HistoryTableProps) {
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter out any residual demo categories from the UI display
  const validDetections = detections.filter(d =>
    ['plastic', 'metal', 'organic', 'paper', 'nylon', 'unknown'].includes(d.waste_class)
  );

  const hasActiveFilters =
    filters.device !== 'all' ||
    filters.category !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  const clearFilters = () =>
    onFilterChange({ device: 'all', category: 'all', dateFrom: '', dateTo: '' });

  return (
    <>
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="section-title">Detection History</h2>
            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
              {detections.length} records
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showFilters || hasActiveFilters
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'
                }`}
            >
              <SlidersHorizontal size={12} />
              Filters
              {hasActiveFilters && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700/40">
            <div>
              <label className="text-slate-500 text-xs block mb-1">Device</label>
              <select
                value={filters.device}
                onChange={(e) => onFilterChange({ ...filters, device: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Devices</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-500 text-xs block mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => onFilterChange({ ...filters, category: e.target.value as WasteClass | 'all' })}
                className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                {WASTE_CLASSES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-500 text-xs block mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs block mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['Image', 'Class', 'Confidence', 'Device', 'Timestamp', 'Action'].map((h) => (
                  <th key={h} className="text-left text-slate-500 text-xs font-medium uppercase tracking-wide px-4 sm:px-5 pb-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/30">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 sm:px-5 py-3">
                        <div className="h-4 bg-slate-700/40 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : validDetections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 text-sm py-10">
                    No detections match the current filters.
                  </td>
                </tr>
              ) : (
                validDetections.map((d) => {
                  const confColor =
                    d.confidence >= 0.9 ? 'text-green-400' :
                      d.confidence >= 0.7 ? 'text-amber-400' : 'text-red-400';
                  return (
                    <tr key={d.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 sm:px-5 py-3">
                        {d.image_url ? (
                          <img
                            src={d.image_url}
                            alt={d.waste_class}
                            className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => setModalImage(d.image_url)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                            <span className="text-slate-500 text-xs">—</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CLASS_COLORS[d.waste_class] }}
                          />
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-md border capitalize ${CLASS_BG[d.waste_class]}`}>
                            {d.waste_class}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold ${confColor}`}>
                            {(d.confidence * 100).toFixed(1)}%
                          </span>
                          <span className={`text-xs ${confColor} opacity-60`}>
                            {confidenceLabel(d.confidence)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <p className="text-slate-300 text-sm">{d.devices?.name ?? '—'}</p>
                        <p className="text-slate-500 text-xs">{d.devices?.location ?? ''}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <p className="text-slate-300 text-sm">{formatTimestamp(d.timestamp)}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        {d.image_url ? (
                          <button
                            onClick={() => setModalImage(d.image_url)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            <Eye size={13} />
                            View
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}
    </>
  );
}
