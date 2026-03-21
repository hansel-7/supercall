import { useState, useEffect, useCallback, useRef } from 'react';
import { callScript } from '../data/callScript';
import { insights } from '../data/insights';

const TICK_INTERVAL = 2500;

export function useCallSimulation() {
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

  const computeSentiment = useCallback((step, prev) => {
    let vcDelta = 0;
    let founderDelta = 0;

    const triggers = step.triggers || [];
    for (const t of triggers) {
      const insight = insights[t];
      if (!insight) continue;
      if (insight.type === 'metric') {
        vcDelta += 1.5;
        founderDelta += 1;
      }
      if (insight.type === 'alert') {
        vcDelta -= 1.5;
        founderDelta -= 0.5;
      }
      if (insight.type === 'suggestion') {
        founderDelta += 1;
      }
      if (insight.type === 'context') {
        vcDelta += 0.5;
      }
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
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= callScript.length) {
        setIsPlaying(false);
        setCurrentSpeaker(null);
        return prev;
      }

      const step = callScript[next];
      setCurrentSpeaker(step.speaker);
      setTranscript((t) => [...t, { speaker: step.speaker, name: step.name, text: step.text }]);

      if (step.triggers && step.triggers.length > 0) {
        const newInsights = step.triggers
          .map((triggerId) => insights[triggerId])
          .filter(Boolean)
          .map((insight) => ({ ...insight, timestamp: Date.now() }));

        const newActions = newInsights.filter(
          (i) => i.id.startsWith('action-')
        );

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

      return next;
    });
  }, [computeSentiment]);

  const play = useCallback(() => {
    if (!isCallActive) {
      setIsCallActive(true);
    }
    setIsPlaying(true);
  }, [isCallActive]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(-1);
    setTranscript([]);
    setActiveInsights([]);
    setCurrentSpeaker(null);
    setCallDuration(0);
    setIsCallActive(false);
    setActionItems([]);
    setSentimentHistory({ vcInterest: [55], founderConfidence: [70] });
  }, []);

  useEffect(() => {
    if (isPlaying) {
      advanceStep();
      timerRef.current = setInterval(advanceStep, TICK_INTERVAL);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, advanceStep]);

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
