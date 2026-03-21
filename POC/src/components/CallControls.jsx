import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Play,
  Pause,
  RotateCcw,
  Monitor,
} from 'lucide-react';
import { useState } from 'react';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallControls({
  callDuration,
  isPlaying,
  isCallActive,
  isComplete,
  onPlay,
  onPause,
  onRestart,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface-800/80 backdrop-blur-sm rounded-xl border border-white/5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : isCallActive ? 'bg-yellow-500' : 'bg-gray-500'}`}
          />
          <span className="text-xs font-mono text-gray-400">
            {isCallActive ? formatDuration(callDuration) : '00:00'}
          </span>
        </div>
        {isCallActive && (
          <span className="text-xs text-gray-500 hidden sm:inline">
            {isComplete ? 'Call Ended' : isPlaying ? 'Live' : 'Paused'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2.5 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`p-2.5 rounded-full transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
          {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>
        <button className="p-2.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
          <Monitor className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {!isCallActive || isComplete ? (
          <button
            onClick={isComplete ? onRestart : onPlay}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-full text-sm font-medium transition-colors"
          >
            {isComplete ? (
              <>
                <RotateCcw className="w-4 h-4" /> Restart
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Start Call
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={isPlaying ? onPause : onPlay}
              className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={onRestart}
              className="p-2.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors">
              <PhoneOff className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="text-xs text-gray-500 hidden sm:block">
        {isCallActive && !isComplete && (
          <span className="font-mono">
            Turn {Math.min(30, Math.max(0, Math.floor(callDuration / 3.5) + 1))}/30
          </span>
        )}
      </div>
    </div>
  );
}
