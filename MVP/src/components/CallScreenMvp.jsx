import { Eye, EyeOff, Mic, MicOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
  const [showLiveTranscription, setShowLiveTranscription] = useState(true);

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5 sm:gap-3">
      <div className="flex-shrink-0 bg-surface-700/60 backdrop-blur-sm border border-white/5 rounded-2xl p-4 sm:p-6 min-h-[220px] sm:min-h-[280px] flex items-center justify-center">
        {!listening ? (
          <button
            type="button"
            onClick={onStart}
            disabled={!supported}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs sm:text-sm font-medium"
          >
            <Mic className="w-4 h-4" /> Start Listening
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-medium"
          >
            <MicOff className="w-4 h-4" /> Stop Listening
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-surface-800/40 rounded-xl border border-white/5 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2 mr-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live Transcript</span>
          </div>
          <button
            type="button"
            onClick={() => setShowLiveTranscription((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-[11px] text-gray-300 font-medium"
            aria-label={showLiveTranscription ? 'Hide live transcription' : 'Show live transcription'}
            title={showLiveTranscription ? 'Hide live transcription' : 'Show live transcription'}
          >
            {showLiveTranscription ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showLiveTranscription ? 'Hide' : 'Show'}
          </button>
        </div>
        {showLiveTranscription ? (
          <div className="h-[calc(100%-2rem)] overflow-hidden">
            <LiveTranscriptStream lines={lines} interim={interim} />
          </div>
        ) : (
          <div className="h-[calc(100%-2rem)] flex items-center justify-center text-xs text-gray-500">
            Live transcription is hidden.
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 bg-surface-800/80 backdrop-blur-sm rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs text-gray-500">{listening ? 'Listening...' : 'Standby'}</span>
        <button
          type="button"
          onClick={onClear}
          disabled={lines.length === 0 && !interim}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-gray-300 text-[11px] sm:text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}
