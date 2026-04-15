import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { Device } from '../types';
import { DEVICE_STATUS_STYLES } from '../lib/utils';

interface HeaderProps {
  devices: Device[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function Header({ devices, lastUpdated, onRefresh }: HeaderProps) {
  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const totalCount = devices.length;
  const allOnline = onlineCount === totalCount && totalCount > 0;

  return (
    <header className="bg-slate-900 border-b border-slate-700/60 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
            <Activity size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">WasteSort Monitor</h1>
            <p className="text-slate-400 text-xs">AI-Powered Waste Classification</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {lastUpdated && (
            <span className="hidden sm:block text-slate-500 text-xs">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <div className="flex items-center gap-2">
            {devices.slice(0, 4).map((device) => {
              const st = DEVICE_STATUS_STYLES[device.status];
              return (
                <div key={device.id} className="group relative hidden sm:flex items-center gap-1.5 cursor-default">
                  <span className={`w-2 h-2 rounded-full ${st.dot} ${device.status === 'online' ? 'animate-pulse' : ''}`} />
                  <span className={`text-xs font-medium ${st.text}`}>{device.name}</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    <p className="font-medium text-white">{device.name}</p>
                    <p className="text-slate-400">{device.location}</p>
                    <p className={st.text}>{st.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
            allOnline
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : onlineCount === 0
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {allOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{onlineCount}/{totalCount} Online</span>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
