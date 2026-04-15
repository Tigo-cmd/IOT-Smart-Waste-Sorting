import { useState } from 'react';
import { Camera, ZoomIn } from 'lucide-react';
import { Detection } from '../types';
import { CLASS_BG, confidenceLabel, timeAgo } from '../lib/utils';
import ImageModal from './ImageModal';

interface LivePanelProps {
  latest: Detection | null;
}

export default function LivePanel({ latest }: LivePanelProps) {
  const [modalImage, setModalImage] = useState<string | null>(null);

  if (!latest) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-16">
        <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center">
          <Camera size={24} className="text-slate-500" />
        </div>
        <p className="text-slate-400 text-sm">No detections yet</p>
        <p className="text-slate-500 text-xs">Waiting for system activity...</p>
      </div>
    );
  }

  const confidenceColor =
    latest.confidence >= 0.9 ? 'text-green-400' :
      latest.confidence >= 0.7 ? 'text-amber-400' : 'text-red-400';

  const confidenceBg =
    latest.confidence >= 0.9 ? 'bg-green-400' :
      latest.confidence >= 0.7 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <>
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Live Detection Feed</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Live</span>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video cursor-pointer group"
          onClick={() => latest.image_url && setModalImage(latest.image_url)}>
          {latest.image_url ? (
            <img
              src={latest.image_url}
              alt={`${latest.waste_class} detection`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera size={40} className="text-slate-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          {latest.image_url && (
            <div className="absolute top-3 right-3 bg-black/50 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn size={16} className="text-white" />
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wide ${CLASS_BG[latest.waste_class]}`}>
              {latest.waste_class}
            </span>
            <span className="text-slate-300 text-xs bg-black/50 px-2 py-1 rounded-lg">
              {timeAgo(latest.timestamp)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
            <p className="text-slate-500 text-xs mb-1">Class</p>
            <p className="text-white font-semibold capitalize">{latest.waste_class}</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
            <p className="text-slate-500 text-xs mb-1">Confidence</p>
            <div className="flex items-center gap-1.5">
              <p className={`font-semibold ${confidenceColor}`}>{(latest.confidence * 100).toFixed(1)}%</p>
              <span className={`text-xs ${confidenceColor} opacity-70`}>({confidenceLabel(latest.confidence)})</span>
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
            <p className="text-slate-500 text-xs mb-1">Device</p>
            <p className="text-white font-semibold text-sm truncate">
              {latest.devices?.name ?? '—'}
            </p>
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${confidenceBg}`}
            style={{ width: `${(latest.confidence * 100).toFixed(0)}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs text-right -mt-2">
          Confidence: {(latest.confidence * 100).toFixed(1)}%
        </p>

      </div>

      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}
    </>
  );
}
