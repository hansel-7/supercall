import express from 'express';
import 'dotenv/config';
import { randomUUID } from 'crypto';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_CONTEXT_LINES = 120;
const DEFAULT_SESSION_ID = 'default';
const sessionStore = new Map();
const ANALYSIS_COOLDOWN_MS = 3000;
const INTERIM_DEBOUNCE_MS = 1200;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'supercall-mvp-server',
    status: 'ok',
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/session', (_req, res) => {
  const sessionId = randomUUID();
  sessionStore.set(sessionId, {
    lines: [],
    topic: 'unknown',
    keyNumbers: [],
    metricUpdates: [],
    insights: [],
    analysisInFlight: false,
    analysisTimer: null,
    lastAnalyzedAt: 0,
    pendingLatestText: '',
  });
  res.json({ ok: true, sessionId });
});

app.get('/session/:sessionId/state', (req, res) => {
  const sessionId = req.params.sessionId || DEFAULT_SESSION_ID;
  const session = getSession(sessionId);
  res.json({
    ok: true,
    sessionId,
    topic: session.topic || 'unknown',
    keyNumbers: session.keyNumbers || [],
    metricUpdates: session.metricUpdates || [],
    insights: session.insights || [],
    lineCount: session.lines.length,
  });
});

function getSession(sessionId) {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, {
      lines: [],
      topic: 'unknown',
      keyNumbers: [],
      metricUpdates: [],
      insights: [],
      analysisInFlight: false,
      analysisTimer: null,
      lastAnalyzedAt: 0,
      pendingLatestText: '',
    });
  }
  return sessionStore.get(sessionId);
}

function appendLine(sessionId, line) {
  const session = getSession(sessionId);
  session.lines.push(line);
  if (session.lines.length > MAX_CONTEXT_LINES) {
    session.lines.splice(0, session.lines.length - MAX_CONTEXT_LINES);
  }
  return session;
}

function normalizeMetricLabel(label) {
  const raw = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!raw) return '';

  const compact = raw.replace(/\s+/g, ' ').trim();

  if (compact.includes('down payment')) return 'down payment';
  if (compact.includes('monthly payment')) return 'monthly payment';

  return compact
    .replace(/\b(initial|proposed|option|options|amount|starts|start|at|new|updated|current|latest)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMetricKey(metricKeyOrLabel) {
  const raw = String(metricKeyOrLabel || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, ' ');
  if (compact.includes('meeting time') || compact.includes('appointment time')) {
    return 'meeting time';
  }
  return normalizeMetricLabel(compact);
}

function formatMetricLabel(normalizedLabel, fallbackLabel) {
  if (!normalizedLabel) return String(fallbackLabel || '').trim();
  if (normalizedLabel === 'down payment') return 'Down payment';
  if (normalizedLabel === 'monthly payment') return 'Monthly payment';
  return normalizedLabel
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeMetricValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const numeric = raw.replace(/[, ]+/g, '');
  if (/^-?\d+(\.\d+)?$/.test(numeric)) return numeric;
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

function appendMetricUpdate(session, { metricKey, label, previousValue, nextValue }) {
  if (!metricKey) return;
  const updates = Array.isArray(session.metricUpdates) ? session.metricUpdates : [];
  const now = Date.now();
  updates.push({
    id: `${now}-${metricKey}`,
    metricKey,
    label,
    previousValue,
    value: nextValue,
    updatedAt: now,
  });
  session.metricUpdates = updates.slice(-200);
}

function upsertMetricInsight(session, metric) {
  const metricKey = normalizeMetricLabel(metric?.label);
  if (!metricKey) return;

  const now = Date.now();
  const insights = Array.isArray(session.insights) ? session.insights : [];
  const existingIndex = insights.findIndex((i) => i?.metricKey === metricKey);
  const nextInsight = {
    id: existingIndex >= 0 ? insights[existingIndex].id : `${now}-${metricKey}`,
    metricKey,
    type: 'metric',
    title: metric.label,
    body: `${metric.label}: ${metric.value}`,
    highlight: [metric.value],
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    insights[existingIndex] = nextInsight;
  } else {
    insights.push(nextInsight);
  }

  insights.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  session.insights = insights.slice(0, 24);
}

async function analyzeWithContext({ sessionId, latestText }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const session = getSession(sessionId);
  const contextText = session.lines
    .map((l) => `[${l.type}] ${l.text}`)
    .join('\n')
    .slice(-12000);
  const previousTopic = session.topic || 'unknown';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'topic_numbers_result',
          schema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              keyNumbers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    metricKey: { type: 'string' },
                    label: { type: 'string' },
                    value: { type: 'string' },
                  },
                  required: ['label', 'value'],
                  additionalProperties: false,
                },
              },
            },
            required: ['topic', 'keyNumbers'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'You analyze streaming conversation transcript with context memory.\n' +
            'Task 1: identify current topic in 3-8 words.\n' +
            'Task 2: extract key numbers relevant to that topic across the full conversation context.\n' +
            'For each metric, provide the latest/current value mentioned so far.\n' +
            'Also provide metricKey: a stable semantic key in snake_case so updates map correctly (example: meeting_time, down_payment, monthly_payment).\n' +
            'Each number must include a short semantic label.\n' +
            'If no topic-relevant number appears, return an empty keyNumbers array.\n' +
            'Return JSON: {"topic":"...","keyNumbers":[{"metricKey":"...","label":"...","value":"..."}]}',
        },
        {
          role: 'user',
          content:
            `Session: ${sessionId}\n` +
            `Previous topic: ${previousTopic}\n` +
            `Conversation context (oldest to newest):\n${contextText}\n\n` +
            `Latest chunk to focus on:\n${latestText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!raw) return { topic: deriveTopicHeuristic(latestText), keyNumbers: [] };

  try {
    const parsed = JSON.parse(raw);
    const topic = typeof parsed?.topic === 'string' && parsed.topic.trim()
      ? parsed.topic.trim()
      : deriveTopicHeuristic(latestText);
    const keyNumbers = Array.isArray(parsed?.keyNumbers)
      ? parsed.keyNumbers
          .map((k) => ({
            metricKey: typeof k?.metricKey === 'string' ? k.metricKey.trim() : '',
            label: typeof k?.label === 'string' ? k.label.trim() : '',
            value: typeof k?.value === 'string' ? k.value.trim() : '',
          }))
          .filter((k) => k.label && k.value)
      : [];
    return { topic, keyNumbers };
  } catch {
    // fallback below
  }

  // Fallback: salvage topic from plain-text output.
  const maybeTopic =
    raw
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .replace(/^topic\s*:\s*/i, '')
      .trim() || deriveTopicHeuristic(latestText);

  return { topic: maybeTopic, keyNumbers: [] };
}

function deriveTopicHeuristic(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return 'unknown';
  if (t.includes('raise') && (t.includes('fund') || t.includes('investment'))) {
    return 'startup fundraising discussion';
  }
  if (t.includes('customer') || t.includes('support')) return 'customer support discussion';
  if (t.includes('interview') || t.includes('candidate')) return 'job interview discussion';
  if (t.includes('contract') || t.includes('pricing')) return 'commercial negotiation';
  return text
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');
}

function runAnalysisNow(sessionId) {
  const session = getSession(sessionId);
  const latestText = session.pendingLatestText?.trim();
  if (!latestText || session.analysisInFlight) return;

  session.analysisInFlight = true;
  session.pendingLatestText = '';
  const ts = new Date().toISOString();

  analyzeWithContext({ sessionId, latestText })
    .then(({ topic, keyNumbers }) => {
      const s = getSession(sessionId);
      s.lastAnalyzedAt = Date.now();
      s.topic = topic;

      if (Array.isArray(keyNumbers) && keyNumbers.length > 0) {
        const mergedByLabel = new Map(
          (s.keyNumbers || []).map((k) => [normalizeMetricLabel(k.label), k])
        );
        const changedNumbers = [];

        keyNumbers.forEach((k) => {
          const semanticKey = normalizeMetricKey(k.metricKey || k.label);
          if (!semanticKey) return;

          const existing = mergedByLabel.get(semanticKey);
          const nextValue = String(k.value || '').trim();
          if (!nextValue) return;

          const normalizedNextValue = normalizeMetricValue(nextValue);
          const normalizedExistingValue = normalizeMetricValue(existing?.value);
          if (existing && normalizedExistingValue === normalizedNextValue) {
            return;
          }

          const nextMetric = {
            metricKey: semanticKey,
            label: formatMetricLabel(semanticKey, existing?.label || k.label),
            value: nextValue,
            updatedAt: Date.now(),
          };
          mergedByLabel.set(semanticKey, nextMetric);
          changedNumbers.push({
            metric: nextMetric,
            previousValue: existing?.value ?? null,
          });
        });

        s.keyNumbers = Array.from(mergedByLabel.values());

        if (changedNumbers.length > 0) {
          changedNumbers.forEach(({ metric, previousValue }) => {
            appendMetricUpdate(s, {
              metricKey: metric.metricKey || normalizeMetricLabel(metric.label),
              label: metric.label,
              previousValue,
              nextValue: metric.value,
            });
            upsertMetricInsight(s, metric);
          });
        }
      }

      console.log(`[${ts}] [${sessionId}] [topic] ${topic}`);
      if (Array.isArray(keyNumbers) && keyNumbers.length > 0) {
        console.log(
          `[${ts}] [${sessionId}] [keyNumbers] ${keyNumbers
            .map((k) => `${k.label}=${k.value}`)
            .join(', ')}`
        );
      }
    })
    .catch((err) => {
      console.error(`[${ts}] [${sessionId}] [analysis:error] ${err.message}`);
    })
    .finally(() => {
      const s = getSession(sessionId);
      s.analysisInFlight = false;
      if (s.pendingLatestText) {
        scheduleAnalysis(sessionId, 'final');
      }
    });
}

function scheduleAnalysis(sessionId, chunkType) {
  const session = getSession(sessionId);

  if (session.analysisTimer) {
    clearTimeout(session.analysisTimer);
    session.analysisTimer = null;
  }

  const now = Date.now();
  const elapsed = now - (session.lastAnalyzedAt || 0);
  const cooldownWait = Math.max(0, ANALYSIS_COOLDOWN_MS - elapsed);
  const debounceWait = chunkType === 'final' ? 0 : INTERIM_DEBOUNCE_MS;
  const waitMs = Math.max(cooldownWait, debounceWait);

  if (waitMs === 0) {
    runAnalysisNow(sessionId);
    return;
  }

  session.analysisTimer = setTimeout(() => {
    const s = getSession(sessionId);
    s.analysisTimer = null;
    runAnalysisNow(sessionId);
  }, waitMs);
}

app.post('/transcript', (req, res) => {
  const { type, text, at, sessionId = DEFAULT_SESSION_ID } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ ok: false, error: 'text is required' });
    return;
  }

  const ts = at ? new Date(at).toISOString() : new Date().toISOString();
  const normalizedType = typeof type === 'string' ? type : 'chunk';
  const normalizedSessionId =
    typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : DEFAULT_SESSION_ID;

  appendLine(normalizedSessionId, { type: normalizedType, text: text.trim(), at: ts });
  console.log(`[${ts}] [${normalizedSessionId}] [${normalizedType}] ${text}`);
  const session = getSession(normalizedSessionId);
  session.pendingLatestText = text.trim();
  scheduleAnalysis(normalizedSessionId, normalizedType);

  res.json({ ok: true, sessionId: normalizedSessionId });
});

app.post('/transcript/reset', (req, res) => {
  const { sessionId = DEFAULT_SESSION_ID } = req.body ?? {};
  const normalizedSessionId =
    typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : DEFAULT_SESSION_ID;
  const existing = sessionStore.get(normalizedSessionId);
  if (existing?.analysisTimer) {
    clearTimeout(existing.analysisTimer);
  }
  sessionStore.delete(normalizedSessionId);
  res.json({ ok: true, sessionId: normalizedSessionId });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
