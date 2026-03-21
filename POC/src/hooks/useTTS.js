import { useState, useRef, useCallback } from 'react';
import { callScript } from '../data/callScript';
import { fetchSpeech } from '../lib/tts';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export function useTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const audioUrlsRef = useRef([]);
  const currentAudioRef = useRef(null);

  const preload = useCallback(async () => {
    if (!API_KEY) {
      setError('VITE_OPENAI_API_KEY is not set in .env');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError(null);

    const urls = new Array(callScript.length).fill(null);
    let completed = 0;

    try {
      await Promise.all(
        callScript.map(async (step, idx) => {
          try {
            urls[idx] = await fetchSpeech(step.text, step.speaker, API_KEY);
          } catch (err) {
            // Log but don't abort — step will play silently
            console.warn(`TTS failed for step ${idx} (${step.speaker}):`, err.message);
          } finally {
            completed += 1;
            setProgress(Math.round((completed / callScript.length) * 100));
          }
        })
      );

      audioUrlsRef.current = urls;
      setIsReady(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const playStep = useCallback((stepIndex) => {
    // Stop anything currently playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }

    const url = audioUrlsRef.current[stepIndex];
    if (!url) return;

    const audio = new Audio(url);
    currentAudioRef.current = audio;
    audio.play().catch((err) => console.warn('Audio playback blocked:', err.message));
  }, []);

  const stopAll = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
  }, []);

  // Full reset — revokes blob URLs and clears state so preload can run again
  const reset = useCallback(() => {
    stopAll();
    audioUrlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
    audioUrlsRef.current = [];
    setIsReady(false);
    setProgress(0);
    setError(null);
  }, [stopAll]);

  return { isLoading, progress, isReady, error, preload, playStep, stopAll, reset };
}
