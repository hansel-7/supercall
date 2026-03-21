import { useState, useEffect, useCallback, useRef } from 'react';
import { callScript } from '../data/callScript';
import { insights } from '../data/insights';

// Fallback duration used when audio duration is unknown
const DEFAULT_STEP_DURATION = 4000;

/**
 * getStepDuration(stepIndex) → number|null
 * Called by the simulation to decide how long to wait before advancing.
 * Should return the audio clip duration in ms, or null to use the default.
 */
export function useCallSimulation(getStepDuration) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [activeInsights, setActiveInsights] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [actionItems, setActionItems] = useState([]);
  const [sentimentHistory, setSentimentHistory] = useState({
    vcInterest: [55],
    founderConfidence: [70],
  });

  const timerRef = useRef(null);
  const durationRef = useRef(null);
  const isPlayingRef = useRef(false);
  const advanceStepRef = useRef(null);

  // Keep latest getStepDuration in a ref so setTimeout callbacks always use current value
  const getStepDurationRef = useRef(getStepDuration);
  useEffect(() => {
    getStepDurationRef.current = getStepDuration;
  }, [getStepDuration]);

  const computeSentiment = useCallback((step, prev) => {
    let vcDelta = 0;
    let founderDelta = 0;

    const triggers = step.triggers || [];
    for (const t of triggers) {
      const insight = insights[t];
      if (!insight) continue;
      if (insight.type === 'metric') { vcDelta += 1.5; founderDelta += 1; }
      if (insight.type === 'alert') { vcDelta -= 1.5; founderDelta -= 0.5; }
      if (insight.type === 'suggestion') { founderDelta += 1; }
      if (insight.type === 'context') { vcDelta += 0.5; }
    }

    if (step.speaker === 'founder') founderDelta += 0.5;
    if (step.speaker === 'vc') vcDelta += 0.5;

    const lastVc = prev.vcInterest[prev.vcInterest.length - 1];
    const lastFounder = prev.founderConfidence[prev.founderConfidence.length - 1];

    return {
      vcInterest: [...prev.vcInterest, Math.round(Math.min(95, Math.max(10, lastVc + vcDelta)))],
      founderConfidence: [
        ...prev.founderConfidence,
        Math.round(Math.min(95, Math.max(10, lastFounder + founderDelta))),
      ],
    };
  }, []);

  const advanceStep = useCallback(() => {
    setCurrentIndex((prevIdx) => {
      const next = prevIdx + 1;

      if (next >= callScript.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentSpeaker(null);
        return prevIdx;
      }

      const step = callScript[next];
      setCurrentSpeaker(step.speaker);
      setTranscript((t) => [...t, { speaker: step.speaker, name: step.name, text: step.text }]);

      if (step.triggers && step.triggers.length > 0) {
        const newInsights = step.triggers
          .map((id) => insights[id])
          .filter(Boolean)
          .map((insight) => ({ ...insight, timestamp: Date.now() }));

        const newActions = newInsights.filter((i) => i.id.startsWith('action-'));
        setActiveInsights((existing) => [...existing, ...newInsights]);

        if (newActions.length > 0) {
          setActionItems((existing) => [
            ...existing,
            ...newActions.map((a) => ({
              id: a.id,
              text: a.title.replace('Action: ', ''),
              detail: a.body,
              completed: false,
            })),
          ]);
        }
      }

      setSentimentHistory((prev) => computeSentiment(step, prev));

      // Schedule next step to fire after this step's audio duration
      const stepDuration = getStepDurationRef.current?.(next) ?? DEFAULT_STEP_DURATION;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (isPlayingRef.current) advanceStepRef.current?.();
      }, stepDuration);

      return next;
    });
  }, [computeSentiment]);

  // Always keep advanceStepRef pointing to the latest function
  advanceStepRef.current = advanceStep;

  const play = useCallback(() => {
    if (!isCallActive) setIsCallActive(true);
    isPlayingRef.current = true;
    setIsPlaying(true);
    // Kick off the first (or next) step immediately
    advanceStep();
  // advanceStep is stable (computeSentiment has no deps that change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallActive]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const restart = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentIndex(-1);
    setTranscript([]);
    setActiveInsights([]);
    setCurrentSpeaker(null);
    setCallDuration(0);
    setIsCallActive(false);
    setActionItems([]);
    setSentimentHistory({ vcInterest: [55], founderConfidence: [70] });
  }, []);

  // Wall-clock call duration timer (separate from simulation tick)
  useEffect(() => {
    if (isCallActive && isPlaying) {
      durationRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [isCallActive, isPlaying]);

  const isComplete = currentIndex >= callScript.length - 1;

  return {
    currentIndex,
    currentStep: currentIndex >= 0 ? callScript[currentIndex] : null,
    currentSpeaker,
    transcript,
    activeInsights,
    actionItems,
    sentimentHistory,
    callDuration,
    isPlaying,
    isCallActive,
    isComplete,
    totalSteps: callScript.length,
    play,
    pause,
    restart,
  };
}
