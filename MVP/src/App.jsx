import { useCallback, useState } from 'react';
import { Phone } from 'lucide-react';
import LiveSttView from './components/LiveSttView';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

export default function App() {
  const [recordError, setRecordError] = useState(null);
  const { supported, listening, lines, interim, start, stop, clearLines } = useSpeechRecognition();
  const { start: startRecorder, stop: stopRecorder } = useAudioRecorder();

  const handleStart = useCallback(async () => {
    setRecordError(null);
    try {
      await startRecorder();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRecordError(`Could not start recording: ${msg}`);
    }
    start();
  }, [startRecorder, start]);

  const handleStop = useCallback(() => {
    stop();
    stopRecorder();
  }, [stop, stopRecorder]);

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
        <p className="text-[11px] text-gray-500 hidden sm:block">Live speech-to-text · auto-save audio</p>
      </header>

      <main className="flex-1 min-h-0 p-3">
        <div className="h-full max-w-3xl mx-auto">
          <LiveSttView
            supported={supported}
            listening={listening}
            onStart={handleStart}
            onStop={handleStop}
            onClear={clearLines}
            lines={lines}
            interim={interim}
            recordError={recordError}
            onDismissRecordError={() => setRecordError(null)}
          />
        </div>
      </main>
    </div>
  );
}
