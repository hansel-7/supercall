import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Live speech-to-text from the device microphone (Chrome / Edge).
 * Restarts automatically after browser-imposed pauses while `listening` is on.
 */
export function useSpeechRecognition({ lang = 'en-US' } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [lines, setLines] = useState([]);
  const recRef = useRef(null);
  const keepAliveRef = useRef(false);
  const restartTimerRef = useRef(null);
  const startAttemptRef = useRef(0);
  const MAX_RESTART_ATTEMPTS = 8;

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    keepAliveRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    startAttemptRef.current = 0;
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    stop();
    keepAliveRef.current = true;
    startAttemptRef.current = 0;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    const scheduleRestart = () => {
      if (!keepAliveRef.current || recRef.current !== rec) return;
      if (startAttemptRef.current >= MAX_RESTART_ATTEMPTS) {
        keepAliveRef.current = false;
        recRef.current = null;
        setListening(false);
        return;
      }
      const retryDelay = 200 + startAttemptRef.current * 180;
      startAttemptRef.current += 1;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!keepAliveRef.current || recRef.current !== rec) return;
        try {
          rec.start();
          startAttemptRef.current = 0;
          setListening(true);
        } catch {
          scheduleRestart();
        }
      }, retryDelay);
    };

    rec.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const piece = r[0]?.transcript ?? '';
        if (r.isFinal) {
          const trimmed = piece.trim();
          if (trimmed) {
            setLines((prev) => [
              ...prev,
              { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, text: trimmed, at: Date.now() },
            ]);
          }
        } else {
          interimText += piece;
        }
      }
      setInterim(interimText.trim());
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed') {
        keepAliveRef.current = false;
        setListening(false);
        recRef.current = null;
        return;
      }
      scheduleRestart();
    };

    rec.onend = () => {
      if (!keepAliveRef.current) {
        recRef.current = null;
        setListening(false);
        return;
      }
      if (recRef.current !== rec) return;
      try {
        rec.start();
        startAttemptRef.current = 0;
        setListening(true);
      } catch {
        scheduleRestart();
      }
    };

    recRef.current = rec;
    const beginStart = (attempt = 0) => {
      try {
        rec.start();
        setListening(true);
        startAttemptRef.current = 0;
      } catch {
        // SpeechRecognition can throw when restarted too quickly after stop.
        if (attempt < 6 && keepAliveRef.current && recRef.current === rec) {
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null;
            beginStart(attempt + 1);
          }, 120 + attempt * 120);
          return;
        }
        keepAliveRef.current = false;
        recRef.current = null;
        setListening(false);
      }
    };
    beginStart(0);
  }, [lang, stop]);

  const clearLines = useCallback(() => {
    setLines([]);
    setInterim('');
  }, []);

  useEffect(
    () => () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      startAttemptRef.current = 0;
      stop();
    },
    [stop]
  );

  return { supported, listening, interim, lines, start, stop, clearLines };
}
