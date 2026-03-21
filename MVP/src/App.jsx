import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import AIAssistantPanel from './components/AIAssistantPanel';
import CallScreenMvp from './components/CallScreenMvp';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

export default function App() {
  const { supported, listening, lines, interim, start, stop, clearLines } = useSpeechRecognition();
  const sentLineCountRef = useRef(0);
  const lastInterimRef = useRef('');
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  const sessionIdRef = useRef('default');
  const [activeSessionId, setActiveSessionId] = useState('default');
  const [topic, setTopic] = useState('unknown');
  const [keyNumbers, setKeyNumbers] = useState([]);
  const [insights, setInsights] = useState([]);

  const resetUiState = useCallback(() => {
    clearLines();
    sentLineCountRef.current = 0;
    lastInterimRef.current = '';
    setTopic('unknown');
    setKeyNumbers([]);
    setInsights([]);
  }, [clearLines]);

  const handleStart = useCallback(async () => {
    resetUiState();
    // Start microphone capture immediately in direct user gesture context.
    start();
    fetch(`${serverUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.sessionId === 'string' && data.sessionId.trim()) {
          const sessionId = data.sessionId.trim();
          sessionIdRef.current = sessionId;
          setActiveSessionId(sessionId);
        }
      })
      .catch(() => {
        sessionIdRef.current = 'default';
        setActiveSessionId('default');
      });
  }, [resetUiState, serverUrl, start]);

  const handleClear = useCallback(() => {
    resetUiState();
    fetch(`${serverUrl}/transcript/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionIdRef.current }),
    }).catch(() => {});
  }, [resetUiState, serverUrl]);

  useEffect(() => {
    if (lines.length < sentLineCountRef.current) {
      sentLineCountRef.current = 0;
    }
    if (lines.length === sentLineCountRef.current) return;

    const newLines = lines.slice(sentLineCountRef.current);
    sentLineCountRef.current = lines.length;

    newLines.forEach((line) => {
      fetch(`${serverUrl}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          type: 'final',
          text: line.text,
          at: line.at,
        }),
      }).catch(() => {});
    });
  }, [lines, serverUrl]);

  useEffect(() => {
    if (!interim || interim === lastInterimRef.current) return;
    lastInterimRef.current = interim;

    fetch(`${serverUrl}/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        type: 'interim',
        text: interim,
        at: Date.now(),
      }),
    }).catch(() => {});
  }, [interim, serverUrl]);

  useEffect(() => {
    if (!activeSessionId) return undefined;

    let cancelled = false;
    const fetchState = async () => {
      try {
        const response = await fetch(`${serverUrl}/session/${activeSessionId}/state`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setTopic(typeof data?.topic === 'string' && data.topic.trim() ? data.topic.trim() : 'unknown');
        setKeyNumbers(Array.isArray(data?.keyNumbers) ? data.keyNumbers : []);
        // Temporarily disable Live Insights rendering.
        setInsights([]);
      } catch {
        // ignore transient network errors
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeSessionId, serverUrl]);

  const metrics = useMemo(() => {
    const byLabel = new Map();
    keyNumbers.forEach((k) => {
      const normalizedLabel = String(k?.label || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      if (!normalizedLabel) return;
      byLabel.set(normalizedLabel, {
        key: `num-${normalizedLabel}`,
        label: String(k.label || '').trim(),
        current: String(k.value || '').trim(),
      });
    });
    return Array.from(byLabel.values()).filter((m) => m.current);
  }, [keyNumbers]);

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
            onStart={handleStart}
            onStop={stop}
            onClear={handleClear}
            lines={lines}
            interim={interim}
          />
        </div>
        <div className="flex-1 min-w-0">
          <AIAssistantPanel
            insights={insights}
            metrics={metrics}
            actionItems={[]}
            isCallActive={listening}
            isPlaying={listening}
          />
        </div>
      </main>
    </div>
  );
}
