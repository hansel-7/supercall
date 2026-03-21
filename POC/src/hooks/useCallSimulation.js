import { useState, useEffect, useCallback, useRef } from 'react';
import { callScript } from '../data/callScript';
import { insights } from '../data/insights';

const DEFAULT_STEP_DURATION = 4000;

const INITIAL_METRICS = [
  { key: 'arr',           label: 'ARR',                prev: '$1.8M',            current: null },
  { key: 'revMix',        label: 'Rev Mix (Ent)',       prev: '~40%',             current: null },
  { key: 'acv',           label: 'Avg Contract Value',  prev: '$45K',             current: null },
  { key: 'burn',          label: 'Monthly Burn',        prev: '$280K',            current: null },
  { key: 'runway',        label: 'Runway',              prev: '~16 months',       current: null },
  { key: 'nrr',           label: 'NRR',                 prev: '118%',             current: null },
  { key: 'grossRet',      label: 'Gross Retention',     prev: '91%',              current: null },
  { key: 'vpEng',         label: 'VP Engineering',      prev: 'Open search',      current: null },
  { key: 'valuation',     label: 'Valuation Ask',       prev: '$25–30M (range)',  current: null },
  { key: 'pipeline',      label: 'Signed Pipeline',     prev: 'N/A',              current: null },
];

export function useCallSimulation(getStepDuration) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [activeInsights, setActiveInsights] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [actionItems, setActionItems] = useState([]);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [callStartTime, setCallStartTime] = useState(null);

  const timerRef = useRef(null);
  const insightTimerRef = useRef(null);
  const metricsTimerRef = useRef(null);
  const durationRef = useRef(null);
  const isPlayingRef = useRef(false);
  const advanceStepRef = useRef(null);

  const getStepDurationRef = useRef(getStepDuration);
  useEffect(() => {
    getStepDurationRef.current = getStepDuration;
  }, [getStepDuration]);

  // Apply metric updates from a step immediately when the step starts
  const applyMetricUpdates = useCallback((step) => {
    if (!step.metricUpdates) return;
    setMetrics((prev) =>
      prev.map((m) =>
        step.metricUpdates[m.key] != null
          ? { ...m, current: step.metricUpdates[m.key] }
          : m
      )
    );
  }, []);

  const fireInsightsForStep = useCallback((step) => {
    if (!step.triggers || step.triggers.length === 0) return;

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
      const stepDuration = getStepDurationRef.current?.(next) ?? DEFAULT_STEP_DURATION;

      setCurrentSpeaker(step.speaker);
      setTranscript((t) => [...t, { speaker: step.speaker, name: step.name, text: step.text }]);

      // Update metrics after Alex finishes speaking (at full step duration)
      if (metricsTimerRef.current) clearTimeout(metricsTimerRef.current);
      if (step.speaker === 'founder' && step.metricUpdates) {
        metricsTimerRef.current = setTimeout(() => {
          applyMetricUpdates(step);
        }, stepDuration);
      }

      // Insight timing: VC turns fire at 65% (context while Sarah is still talking),
      // founder turns fire at 85% (VC follow-up questions as Alex wraps up)
      if (insightTimerRef.current) clearTimeout(insightTimerRef.current);
      const insightRatio = step.speaker === 'vc' ? 0.65 : 0.85;
      const insightDelay = Math.max(500, stepDuration * insightRatio);
      insightTimerRef.current = setTimeout(() => {
        fireInsightsForStep(step);
      }, insightDelay);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (isPlayingRef.current) advanceStepRef.current?.();
      }, stepDuration);

      return next;
    });
  }, [applyMetricUpdates, fireInsightsForStep]);

  advanceStepRef.current = advanceStep;

  const play = useCallback(() => {
    if (!isCallActive) {
      setIsCallActive(true);
      setCallStartTime(new Date());
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
    advanceStep();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallActive]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (insightTimerRef.current) { clearTimeout(insightTimerRef.current); insightTimerRef.current = null; }
    if (metricsTimerRef.current) { clearTimeout(metricsTimerRef.current); metricsTimerRef.current = null; }
  }, []);

  const restart = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (insightTimerRef.current) { clearTimeout(insightTimerRef.current); insightTimerRef.current = null; }
    if (metricsTimerRef.current) { clearTimeout(metricsTimerRef.current); metricsTimerRef.current = null; }
    setCurrentIndex(-1);
    setTranscript([]);
    setActiveInsights([]);
    setCurrentSpeaker(null);
    setCallDuration(0);
    setIsCallActive(false);
    setActionItems([]);
    setMetrics(INITIAL_METRICS);
    setCallStartTime(null);
  }, []);

  // Instantly populate all state as if the full call just finished — used by "Skip to End".
  const skipToEnd = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (insightTimerRef.current) { clearTimeout(insightTimerRef.current); insightTimerRef.current = null; }
    if (metricsTimerRef.current) { clearTimeout(metricsTimerRef.current); metricsTimerRef.current = null; }

    const fullTranscript = callScript.map((s) => ({ speaker: s.speaker, name: s.name, text: s.text }));

    // Apply every metricUpdate in script order
    const allMetrics = INITIAL_METRICS.map((m) => ({ ...m }));
    callScript.forEach((step) => {
      if (!step.metricUpdates) return;
      Object.entries(step.metricUpdates).forEach(([key, value]) => {
        const row = allMetrics.find((r) => r.key === key);
        if (row) row.current = value;
      });
    });

    // Collect all insights and action items
    const allInsights = [];
    const allActions = [];
    callScript.forEach((step) => {
      if (!step.triggers) return;
      step.triggers.forEach((id) => {
        const insight = insights[id];
        if (!insight) return;
        allInsights.push({ ...insight, timestamp: Date.now() });
        if (id.startsWith('action-')) {
          allActions.push({
            id,
            text: insight.title.replace('Action: ', ''),
            detail: insight.body,
            completed: false,
          });
        }
      });
    });

    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsCallActive(true);
    setCallStartTime((prev) => prev ?? new Date());
    setCurrentIndex(callScript.length - 1);
    setCurrentSpeaker(null);
    setTranscript(fullTranscript);
    setMetrics(allMetrics);
    setActiveInsights(allInsights);
    setActionItems(allActions);
  }, []);

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
    metrics,
    callDuration,
    callStartTime,
    isPlaying,
    isCallActive,
    isComplete,
    totalSteps: callScript.length,
    play,
    pause,
    restart,
    skipToEnd,
  };
}
