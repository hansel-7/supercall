import CallerTile from './CallerTile';
import LiveTranscript from './LiveTranscript';
import CallControls from './CallControls';

export default function CallScreen({
  currentSpeaker,
  transcript,
  callDuration,
  isPlaying,
  isCallActive,
  isComplete,
  onPlay,
  onPause,
  onRestart,
}) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="grid grid-cols-2 gap-3 flex-shrink-0">
        <CallerTile
          name="Sarah Chen"
          role="Partner"
          company="Meridian Ventures"
          speaker="vc"
          isSpeaking={currentSpeaker === 'vc'}
        />
        <CallerTile
          name="Alex Rivera"
          role="CEO & Co-founder"
          company="NovaPay"
          speaker="founder"
          isSpeaking={currentSpeaker === 'founder'}
        />
      </div>

      <div className="flex-1 min-h-0 bg-surface-800/40 rounded-xl border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Live Transcript
          </span>
        </div>
        <div className="h-[calc(100%-2rem)] overflow-hidden">
          <LiveTranscript transcript={transcript} />
        </div>
      </div>

      <div className="flex-shrink-0">
        <CallControls
          callDuration={callDuration}
          isPlaying={isPlaying}
          isCallActive={isCallActive}
          isComplete={isComplete}
          onPlay={onPlay}
          onPause={onPause}
          onRestart={onRestart}
        />
      </div>
    </div>
  );
}
