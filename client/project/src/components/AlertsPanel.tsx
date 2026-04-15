import { AlertTriangle, WifiOff, ServerCrash, Wrench, Info, CheckCircle2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertType } from '../types';
import { SEVERITY_STYLES } from '../lib/utils';
import { timeAgo } from '../lib/utils';

const TYPE_ICONS: Record<AlertType, React.ElementType> = {
  device_offline: WifiOff,
  low_confidence: AlertTriangle,
  backend_error: ServerCrash,
  maintenance: Wrench,
  info: Info,
};

interface AlertsPanelProps {
  alerts: Alert[];
  onResolve: (id: string) => void;
  loading: boolean;
}

export default function AlertsPanel({ alerts, onResolve, loading }: AlertsPanelProps) {
  const [showResolved, setShowResolved] = useState(false);

  const active = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);
  const displayed = showResolved ? alerts : active;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="section-title">System Alerts</h2>
          {active.length > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
              {active.length} active
            </span>
          )}
        </div>
        {resolved.length > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showResolved ? 'rotate-180' : ''}`} />
            {showResolved ? 'Hide' : `+${resolved.length} resolved`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-700/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-green-400" />
          </div>
          <p className="text-slate-400 text-sm">All systems operational</p>
          <p className="text-slate-600 text-xs">No active alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((alert) => {
            const styles = SEVERITY_STYLES[alert.severity];
            const Icon = TYPE_ICONS[alert.alert_type];
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-opacity ${styles.bg} ${styles.border} ${alert.resolved ? 'opacity-50' : ''}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${styles.bg}`}>
                  <Icon size={14} className={styles.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${styles.icon}`}>
                      {alert.severity}
                    </span>
                    {alert.devices?.name && (
                      <span className="text-slate-500 text-xs">{alert.devices.name}</span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm leading-snug">{alert.message}</p>
                  <p className="text-slate-500 text-xs mt-1">{timeAgo(alert.created_at)}</p>
                </div>
                {!alert.resolved && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="flex-shrink-0 text-xs text-slate-500 hover:text-green-400 transition-colors px-2 py-1 rounded-lg hover:bg-green-500/10"
                  >
                    Resolve
                  </button>
                )}
                {alert.resolved && (
                  <div className="flex-shrink-0">
                    <CheckCircle2 size={14} className="text-green-400/60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
