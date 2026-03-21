import { useEffect, useRef, useCallback } from 'react';
import { Phone, Brain, AlertCircle, RefreshCw } from 'lucide-react';
import CallScreen from './components/CallScreen';
import AIAssistantPanel from './components/AIAssistantPanel';
import { useCallSimulation } from './hooks/useCallSimulation';
import { useTTS } from './hooks/useTTS';

export default function App() {
  const sim = useCallSimulation();
  const tts = useTTS();

  // Set when "Start Call" is clicked before TTS is ready — auto-starts the call once preload finishes
  const pendingStartRef = useRef(false);

  // Auto-start the simulation once audio is pre-fetched
  useEffect(() => {
    if (tts.isReady && pendingStartRef.current) {
      pendingStartRef.current = false;
      sim.play();
    }
  // sim.play is stable (useCallback with no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.isReady]);

  // Play the corresponding audio clip whenever the simulation advances to a new step
  useEffect(() => {
    if (sim.currentIndex >= 0 && tts.isReady) {
      tts.playStep(sim.currentIndex);
    }
  // Only re-run when the step index changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.currentIndex]);

  // Stop audio when the simulation is paused or ends
  useEffect(() => {
    if (!sim.isPlaying) {
      tts.stopAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.isPlaying]);

  const handleStartCall = useCallback(() => {
    if (tts.isLoading) return;

    if (!tts.isReady) {
      // Kick off pre-fetch; simulation will auto-start via the isReady effect
      pendingStartRef.current = true;
      tts.preload();
    } else {
      sim.play();
    }
  }, [tts, sim]);

  const handlePause = useCallback(() => {
    sim.pause();
    // stopAll is triggered via the isPlaying effect above
  }, [sim]);

  const handleRestart = useCallback(() => {
    tts.stopAll();
    sim.restart();
    // Keep audio URLs — no need to refetch for subsequent demos
    // Clicking "Start Call" again will call sim.play() directly since tts.isReady stays true
  }, [tts, sim]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-900 flex flex-col relative">
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-surface-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Phone className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">SuperCall</span>
          <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full font-medium">
            AI-Powered
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>NovaPay × Meridian Ventures</span>
          <span className="text-gray-700">|</span>
          <span>Series A Follow-up</span>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex gap-3 p-3">
        <div className="w-[55%] flex-shrink-0">
          <CallScreen
            currentSpeaker={sim.currentSpeaker}
            transcript={sim.transcript}
            callDuration={sim.callDuration}
            isPlaying={sim.isPlaying}
            isCallActive={sim.isCallActive}
            isComplete={sim.isComplete}
            currentIndex={sim.currentIndex}
            ttsLoading={tts.isLoading}
            onPlay={handleStartCall}
            onPause={handlePause}
            onRestart={handleRestart}
          />
        </div>
        <div className="flex-1 min-w-0">
          <AIAssistantPanel
            insights={sim.activeInsights}
            sentimentHistory={sim.sentimentHistory}
            actionItems={sim.actionItems}
            isCallActive={sim.isCallActive}
            isPlaying={sim.isPlaying}
          />
        </div>
      </main>

      {/* TTS loading overlay — shown while pre-fetching audio */}
      {tts.isLoading && (
        <div className="absolute inset-0 bg-surface-900/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Synthesizing voices...</p>
            <p className="text-gray-400 text-sm mt-1">
              Generating audio with GPT-4o mini TTS
            </p>
          </div>
          <div className="w-72 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                <span className="text-gray-400">Sarah Chen</span>
                <span className="text-gray-600 mx-1">·</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span className="text-gray-400">Alex Rivera</span>
              </div>
              <span className="text-white font-mono font-semibold">{tts.progress}%</span>
            </div>
            <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-200"
                style={{ width: `${tts.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 text-center">
              {tts.progress < 100
                ? `${Math.round(tts.progress * 0.3)} / 30 clips ready`
                : 'All clips ready — starting call...'}
            </p>
          </div>
        </div>
      )}

      {/* TTS error banner */}
      {tts.error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 z-50 max-w-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs flex-1">{tts.error}</span>
          <button
            onClick={() => { pendingStartRef.current = true; tts.preload(); }}
            className="flex items-center gap-1 text-xs text-red-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
