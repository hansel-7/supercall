import { useState, useRef, useCallback } from 'react';
import { callScript } from '../data/callScript';
import { fetchSpeech } from '../lib/tts';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const PLAYBACK_RATE = 1.1;

// sage (vc) outputs lower amplitude than onyx (founder) — boost via GainNode
const GAIN = { vc: 1.8, founder: 1.0 };

// Deterministic hash of the current call script so we can compare against
// the hash saved alongside the pre-generated audio files.
function computeScriptHash() {
  const str = callScript.map((s) => `${s.speaker}:${s.text}`).join('|');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // djb2-style — fast, good enough for cache-busting
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(16);
}

// Try to load a static audio file from /public/audio/.
// Returns a blob URL on success, or null if the file is absent.
async function loadStaticAudio(stepIndex) {
  try {
    const res = await fetch(`/audio/step-${stepIndex}.mp3`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// Returns the hash stored in /audio/script-hash-browser.txt (written by
// generate-audio.mjs), or null if the file doesn't exist.
async function fetchStoredHash() {
  try {
    const res = await fetch('/audio/script-hash-browser.txt');
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

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
  const durationsRef = useRef([]);
  const currentAudioRef = useRef(null);

  const preload = useCallback(async () => {
    setIsLoading(true);
    setProgress(0);
    setError(null);

    const urls = new Array(callScript.length).fill(null);
    const durations = new Array(callScript.length).fill(null);
    let completed = 0;

    try {
      // Check whether the committed audio files match the current script.
      // generate-audio.mjs writes /audio/script-hash-browser.txt using the
      // same djb2 algorithm as computeScriptHash(), so a straight string
      // comparison tells us if the audio is still valid.
      const currentHash = computeScriptHash();
      const storedHash = await fetchStoredHash();
      const useStaticFiles = storedHash === currentHash;

      if (useStaticFiles) {
        console.info('[TTS] Static audio matches script — loading from /audio/');
      } else {
        console.info('[TTS] No matching static audio — calling TTS API');
      }

      await Promise.all(
        callScript.map(async (step, idx) => {
          try {
            let url = null;

            if (useStaticFiles) {
              url = await loadStaticAudio(idx);
            }

            // Fall back to API if static file is missing or hash mismatch
            if (!url) {
              if (!API_KEY) throw new Error('VITE_OPENAI_API_KEY is not set in .env');
              url = await fetchSpeech(step.text, step.speaker, API_KEY);
            }

            urls[idx] = url;
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

    const speaker = callScript[stepIndex]?.speaker ?? 'founder';
    const gain = GAIN[speaker] ?? 1.0;

    const audio = new Audio(url);
    audio.playbackRate = PLAYBACK_RATE;

    // Apply gain via Web Audio API to normalise volume across voices
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const gainNode = ctx.createGain();
      gainNode.gain.value = gain;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch {
      // Fallback: no gain adjustment
    }

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
