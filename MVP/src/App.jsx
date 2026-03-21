import { Phone } from 'lucide-react';
import AIAssistantPanel from './components/AIAssistantPanel';
import CallScreenMvp from './components/CallScreenMvp';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

export default function App() {
  const { supported, listening, lines, interim, start, stop, clearLines } = useSpeechRecognition();

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-900 flex flex-col">
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-surface-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Phone className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">SuperCall</span>
          <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full font-medium">MVP</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Live Meeting</span>
          <span className="text-gray-700">|</span>
          <span>Realtime Captions</span>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex gap-3 p-3">
        <div className="w-[55%] flex-shrink-0">
          <CallScreenMvp
            supported={supported}
            listening={listening}
            onStart={start}
            onStop={stop}
            onClear={clearLines}
            lines={lines}
            interim={interim}
          />
        </div>
        <div className="flex-1 min-w-0">
          <AIAssistantPanel
            insights={[]}
            metrics={[]}
            actionItems={[]}
            isCallActive={listening}
            isPlaying={listening}
          />
        </div>
      </main>
    </div>
  );
}
