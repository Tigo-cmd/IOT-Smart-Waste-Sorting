import { WasteClass, DeviceStatus, AlertSeverity } from '../types';

export function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function confidenceLabel(score: number): string {
  if (score >= 0.9) return 'High';
  if (score >= 0.7) return 'Medium';
  return 'Low';
}

export const CLASS_COLORS: Record<WasteClass, string> = {
  plastic: '#38bdf8',
  metal: '#94a3b8',
  organic: '#4ade80',
  paper: '#fbbf24',
  nylon: '#a78bfa',
  unknown: '#64748b',
};

export const CLASS_BG: Record<WasteClass, string> = {
  plastic: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  metal: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  organic: 'bg-green-500/15 text-green-300 border-green-500/30',
  paper: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  nylon: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  unknown: 'bg-slate-600/15 text-slate-400 border-slate-600/30',
};
export const DEVICE_STATUS_STYLES: Record<DeviceStatus, { dot: string; label: string; text: string }> = {
  online: { dot: 'bg-green-400', label: 'Online', text: 'text-green-400' },
  offline: { dot: 'bg-red-400', label: 'Offline', text: 'text-red-400' },
  error: { dot: 'bg-orange-400', label: 'Error', text: 'text-orange-400' },
  maintenance: { dot: 'bg-amber-400', label: 'Maintenance', text: 'text-amber-400' },
};

export const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; icon: string; dot: string }> = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', dot: 'bg-blue-400' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', dot: 'bg-amber-400' },
  error: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400', dot: 'bg-red-400' },
  critical: { bg: 'bg-red-600/15', border: 'border-red-600/30', icon: 'text-red-300', dot: 'bg-red-300' },
};
