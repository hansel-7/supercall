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

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    keepAliveRef.current = false;
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

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

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
      }
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
      } catch {
        recRef.current = null;
        setListening(false);
      }
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      keepAliveRef.current = false;
      recRef.current = null;
      setListening(false);
    }
  }, [lang, stop]);

  const clearLines = useCallback(() => {
    setLines([]);
    setInterim('');
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, interim, lines, start, stop, clearLines };
}
