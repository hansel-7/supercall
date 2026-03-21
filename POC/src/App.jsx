import CallScreen from './components/CallScreen';
import AIAssistantPanel from './components/AIAssistantPanel';
import { useCallSimulation } from './hooks/useCallSimulation';
import { Phone } from 'lucide-react';

export default function App() {
  const sim = useCallSimulation();

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-900 flex flex-col">
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
            onPlay={sim.play}
            onPause={sim.pause}
            onRestart={sim.restart}
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
    </div>
  );
}
