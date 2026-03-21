import { Mic, MicOff, Trash2 } from 'lucide-react';
import LiveTranscriptStream from './LiveTranscriptStream';

export default function LiveSttView({
  supported,
  listening,
  onStart,
  onStop,
  onClear,
  lines,
  interim,
}) {
  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {!listening ? (
          <button
            type="button"
            onClick={onStart}
            disabled={!supported}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green/20 text-accent-green text-xs font-semibold hover:bg-accent-green/30 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Mic className="w-4 h-4" />
            Start listening
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-red/20 text-accent-red text-xs font-semibold hover:bg-accent-red/30"
          >
            <MicOff className="w-4 h-4" />
            Stop
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          disabled={lines.length === 0 && !interim}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-gray-300 text-xs font-medium hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear transcript
        </button>
      </div>

      {!supported && (
        <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Live speech-to-text needs <strong className="font-medium">Chrome</strong> or{' '}
          <strong className="font-medium">Edge</strong> (Web Speech API).
        </p>
      )}

      <div className="flex items-center gap-2 flex-shrink-0 px-0.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${listening ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}
        />
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
          {listening ? 'Listening' : 'Stopped'}
        </span>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-white/5 bg-surface-800/40 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live transcript</span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <LiveTranscriptStream lines={lines} interim={interim} />
        </div>
      </div>
    </div>
  );
}
