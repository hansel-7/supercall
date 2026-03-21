import { Mic, MicOff, Trash2 } from 'lucide-react';
import CallerTile from './CallerTile';
import LiveTranscriptStream from './LiveTranscriptStream';

export default function CallScreenMvp({
  supported,
  listening,
  lines,
  interim,
  onStart,
  onStop,
  onClear,
}) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="grid grid-cols-2 gap-3 flex-shrink-0">
        <CallerTile
          name="Speaker A"
          role="Participant"
          company="Live"
          speaker="vc"
          isSpeaking={false}
        />
        <CallerTile
          name="Speaker B"
          role="Participant"
          company="Live"
          speaker="founder"
          isSpeaking={false}
        />
      </div>

      <div className="flex-1 min-h-0 bg-surface-800/40 rounded-xl border border-white/5 p-4">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live Transcript</span>
          </div>
          {!listening ? (
            <button
              type="button"
              onClick={onStart}
              disabled={!supported}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-medium"
            >
              <Mic className="w-3.5 h-3.5" /> Start
            </button>
          ) : (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
            >
              <MicOff className="w-3.5 h-3.5" /> Stop
            </button>
          )}
        </div>
        <div className="h-[calc(100%-2rem)] overflow-hidden">
          <LiveTranscriptStream lines={lines} interim={interim} />
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 bg-surface-800/80 backdrop-blur-sm rounded-xl border border-white/5 flex items-center justify-between">
        <span className="text-xs text-gray-500">{listening ? 'Listening...' : 'Standby'}</span>
        <button
          type="button"
          onClick={onClear}
          disabled={lines.length === 0 && !interim}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-gray-300 text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}
