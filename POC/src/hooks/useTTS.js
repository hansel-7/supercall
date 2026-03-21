import { useState, useRef, useCallback } from 'react';
import { callScript } from '../data/callScript';
import { fetchSpeech } from '../lib/tts';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const PLAYBACK_RATE = 1.3;

function measureDurationMs(blobUrl) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => { audio.src = ''; };

    audio.addEventListener('loadedmetadata', () => {
      const ms = Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null;
      cleanup();
      resolve(ms);
    }, { once: true });

    audio.addEventListener('error', () => { cleanup(); resolve(null); }, { once: true });

    // Safety timeout — blob URLs should resolve instantly
    setTimeout(() => { cleanup(); resolve(null); }, 3000);

    audio.src = blobUrl;
  });
}

export function useTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const audioUrlsRef = useRef([]);
  const durationsRef = useRef([]);        // duration in ms for each step
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
    const durations = new Array(callScript.length).fill(null);
    let completed = 0;

    try {
      await Promise.all(
        callScript.map(async (step, idx) => {
          try {
            const url = await fetchSpeech(step.text, step.speaker, API_KEY);
            urls[idx] = url;
            // Measure real playback duration for this clip
            durations[idx] = await measureDurationMs(url);
          } catch (err) {
            console.warn(`TTS failed for step ${idx}:`, err.message);
          } finally {
            completed += 1;
            setProgress(Math.round((completed / callScript.length) * 100));
          }
        })
      );

      audioUrlsRef.current = urls;
      durationsRef.current = durations;
      setIsReady(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Returns effective playback duration in ms (adjusted for playback rate). */
  const getDuration = useCallback((stepIndex) => {
    const raw = durationsRef.current[stepIndex];
    return raw != null ? Math.round(raw / PLAYBACK_RATE) : null;
  }, []);

  const playStep = useCallback((stepIndex) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }

    const url = audioUrlsRef.current[stepIndex];
    if (!url) return;

    const audio = new Audio(url);
    audio.playbackRate = PLAYBACK_RATE;
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

  const reset = useCallback(() => {
    stopAll();
    audioUrlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
    audioUrlsRef.current = [];
    durationsRef.current = [];
    setIsReady(false);
    setProgress(0);
    setError(null);
  }, [stopAll]);

  return { isLoading, progress, isReady, error, preload, getDuration, playStep, stopAll, reset };
}
