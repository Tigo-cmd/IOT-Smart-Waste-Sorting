import { Server, MapPin, Cpu, Clock } from 'lucide-react';
import { Device } from '../types';
import { DEVICE_STATUS_STYLES, timeAgo } from '../lib/utils';

interface DevicesPanelProps {
  devices: Device[];
  loading: boolean;
}

export default function DevicesPanel({ devices, loading }: DevicesPanelProps) {
  return (
    <div className="card space-y-4">
      <h2 className="section-title">Device Status</h2>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-700/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Server size={24} className="text-slate-600" />
          <p className="text-slate-500 text-sm">No devices registered</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const st = DEVICE_STATUS_STYLES[device.status];
            return (
              <div
                key={device.id}
                className="bg-slate-900/60 rounded-xl border border-slate-700/40 p-3 hover:border-slate-600/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      device.status === 'online' ? 'bg-green-500/15' :
                      device.status === 'error' ? 'bg-red-500/15' :
                      device.status === 'maintenance' ? 'bg-amber-500/15' : 'bg-slate-600/30'
                    }`}>
                      <Server size={14} className={st.text} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium leading-tight">{device.name}</p>
                      <p className="text-slate-500 text-xs">{device.ip_address}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                    device.status === 'online' ? 'bg-green-500/15 text-green-400' :
                    device.status === 'error' ? 'bg-red-500/15 text-red-400' :
                    device.status === 'maintenance' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-slate-600/30 text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${device.status === 'online' ? 'animate-pulse' : ''}`} />
                    {st.label}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin size={10} />
                    <span className="truncate">{device.location || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Cpu size={10} />
                    <span>v{device.firmware_version}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock size={10} />
                    <span>{device.last_seen ? timeAgo(device.last_seen) : 'Never'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
