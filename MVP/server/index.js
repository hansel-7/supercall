import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
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
    insightAnalysisInFlight: false,
    analysisTimer: null,
    lastAnalyzedAt: 0,
    lastInsightAnalyzedAt: 0,
    pendingLatestText: '',
    pendingInsightLatestText: '',
    insightMemory: {
      lastTopic: 'unknown',
      facts: [],
      intentions: [],
      results: [],
      risks: [],
      obstacles: [],
      nextSteps: [],
    },
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
      insightAnalysisInFlight: false,
      analysisTimer: null,
      lastAnalyzedAt: 0,
      lastInsightAnalyzedAt: 0,
      pendingLatestText: '',
      pendingInsightLatestText: '',
      insightMemory: {
        lastTopic: 'unknown',
        facts: [],
        intentions: [],
        results: [],
        risks: [],
        obstacles: [],
        nextSteps: [],
      },
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

function normalizeInsightKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);
}

function mapInsightCategoryToType(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'risk' || c === 'obstacle') return 'alert';
  if (c === 'intention' || c === 'next_step') return 'suggestion';
  return 'context';
}

function mapCategoryToMemoryKey(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'fact') return 'facts';
  if (c === 'intention') return 'intentions';
  if (c === 'result') return 'results';
  if (c === 'risk') return 'risks';
  if (c === 'obstacle') return 'obstacles';
  return 'nextSteps';
}

function mergeInsightMemory(session, topic, insightItems) {
  const memory = session.insightMemory || {
    lastTopic: 'unknown',
    facts: [],
    intentions: [],
    results: [],
    risks: [],
    obstacles: [],
    nextSteps: [],
  };
  memory.lastTopic = String(topic || memory.lastTopic || 'unknown');

  insightItems.forEach((insight) => {
    const key = mapCategoryToMemoryKey(insight.category);
    const list = Array.isArray(memory[key]) ? memory[key] : [];
    const candidate = {
      title: insight.title,
      body: insight.body,
      updatedAt: Date.now(),
    };
    const sig = `${normalizeInsightKey(candidate.title)}:${normalizeInsightKey(candidate.body)}`;
    const existingIndex = list.findIndex((item) => {
      const itemSig = `${normalizeInsightKey(item?.title)}:${normalizeInsightKey(item?.body)}`;
      return itemSig === sig;
    });
    if (existingIndex >= 0) list[existingIndex] = candidate;
    else list.push(candidate);
    memory[key] = list.slice(-20);
  });

  session.insightMemory = memory;
}

function upsertQualitativeInsightCard(session, topic, insight) {
  const title = String(insight?.title || '').trim();
  const body = String(insight?.body || '').trim();
  const category = String(insight?.category || '').trim().toLowerCase();
  if (!title || !body || !category) return;

  const metricKey = `qual:${normalizeInsightKey(category)}:${normalizeInsightKey(title)}`;
  const now = Date.now();
  const insights = Array.isArray(session.insights) ? session.insights : [];
  const existingIndex = insights.findIndex((i) => i?.metricKey === metricKey);
  const next = {
    id: existingIndex >= 0 ? insights[existingIndex].id : `${now}-${metricKey}`,
    metricKey,
    type: mapInsightCategoryToType(category),
    title: `${title}`,
    body,
    highlight: Array.isArray(insight?.highlight)
      ? insight.highlight.map((h) => String(h || '').trim()).filter(Boolean).slice(0, 4)
      : [],
    updatedAt: now,
  };
  if (existingIndex >= 0) insights[existingIndex] = next;
  else insights.push(next);
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

async function analyzeInsightsWithContext({ sessionId, latestText, detectedTopic }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  const session = getSession(sessionId);
  const contextText = session.lines
    .map((l) => `[${l.type}] ${l.text}`)
    .join('\n')
    .slice(-12000);
  const topicContext = String(detectedTopic || session.topic || 'unknown').trim() || 'unknown';
  const memory = session.insightMemory || {};

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'qualitative_insights_result',
          schema: {
            type: 'object',
            properties: {
              insights: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'string',
                      enum: ['fact', 'intention', 'result', 'risk', 'obstacle', 'next_step'],
                    },
                    title: { type: 'string' },
                    body: { type: 'string' },
                    highlight: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['category', 'title', 'body'],
                  additionalProperties: false,
                },
              },
            },
            required: ['insights'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'You create concise qualitative insights for a live sales assistant.\n' +
            'Use detected topic as primary context.\n' +
            'Focus on facts, intentions, results, risks, obstacles, and next steps.\n' +
            'Return 0-4 items only, each short and specific.\n' +
            'Do not return numeric metrics here.\n' +
            'Return strict JSON.',
        },
        {
          role: 'user',
          content:
            `Session: ${sessionId}\n` +
            `Detected topic: ${topicContext}\n` +
            `Previous qualitative memory: ${JSON.stringify(memory).slice(0, 2500)}\n` +
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
  if (!raw) return deriveHeuristicInsights(detectedTopic, latestText);
  try {
    const parsed = JSON.parse(raw);
    const insights = Array.isArray(parsed?.insights)
      ? parsed.insights
          .map((i) => ({
            category: typeof i?.category === 'string' ? i.category.trim().toLowerCase() : '',
            title: typeof i?.title === 'string' ? i.title.trim() : '',
            body: typeof i?.body === 'string' ? i.body.trim() : '',
            highlight: Array.isArray(i?.highlight)
              ? i.highlight.map((h) => String(h || '').trim()).filter(Boolean)
              : [],
          }))
          .filter((i) => i.category && i.title && i.body)
          .slice(0, 4)
      : [];
    return insights.length > 0 ? insights : deriveHeuristicInsights(detectedTopic, latestText);
  } catch {
    return deriveHeuristicInsights(detectedTopic, latestText);
  }
}

function deriveHeuristicInsights(detectedTopic, latestText) {
  const topic = String(detectedTopic || 'unknown').trim() || 'unknown';
  const text = String(latestText || '').trim();
  if (!text) return [];
  const lower = text.toLowerCase();

  const insights = [
    {
      category: 'fact',
      title: 'Current discussion point',
      body: `Conversation is focused on ${topic}.`,
      highlight: [topic],
    },
  ];

  if (/\b(need|want|looking for|prefer|hope)\b/.test(lower)) {
    insights.push({
      category: 'intention',
      title: 'Client intention detected',
      body: text.slice(0, 180),
      highlight: ['need', 'want', 'looking for', 'prefer'],
    });
  }

  if (/\b(not sure|unsure|concern|worry|expensive|pricey|too high|risk)\b/.test(lower)) {
    insights.push({
      category: 'risk',
      title: 'Potential objection',
      body: `Client signals concern: "${text.slice(0, 160)}"`,
      highlight: ['not sure', 'concern', 'expensive', 'pricey', 'too high', 'risk'],
    });
  }

  if (/\b(next step|follow up|tomorrow|next week|schedule|send)\b/.test(lower)) {
    insights.push({
      category: 'next_step',
      title: 'Next step candidate',
      body: text.slice(0, 180),
      highlight: ['next step', 'follow up', 'schedule', 'send'],
    });
  }

  return insights.slice(0, 4);
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

function runMetricAnalysisNow(sessionId) {
  const session = getSession(sessionId);
  const latestText = session.pendingLatestText?.trim();
  if (!latestText || session.analysisInFlight) return;

  session.analysisInFlight = true;
  session.pendingLatestText = '';
  const ts = new Date().toISOString();

  // Start qualitative analysis in parallel with metric analysis.
  runInsightAnalysisNow(sessionId, session.topic);

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

      const latestInsightText = s.pendingInsightLatestText || latestText;
      s.pendingInsightLatestText = latestInsightText;
      runInsightAnalysisNow(sessionId, topic);
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

function runInsightAnalysisNow(sessionId, detectedTopic) {
  const session = getSession(sessionId);
  const latestText = String(session.pendingInsightLatestText || '').trim();
  if (!latestText || session.insightAnalysisInFlight) return;

  session.insightAnalysisInFlight = true;
  session.pendingInsightLatestText = '';
  const ts = new Date().toISOString();

  analyzeInsightsWithContext({ sessionId, latestText, detectedTopic })
    .then((insightItems) => {
      const s = getSession(sessionId);
      s.lastInsightAnalyzedAt = Date.now();
      if (Array.isArray(insightItems) && insightItems.length > 0) {
        mergeInsightMemory(s, detectedTopic || s.topic, insightItems);
        insightItems.forEach((insight) => upsertQualitativeInsightCard(s, detectedTopic || s.topic, insight));
        console.log(
          `[${ts}] [${sessionId}] [insights] ${insightItems
            .map((i) => `${i.category}:${i.title}`)
            .join(', ')}`
        );
      }
    })
    .catch((err) => {
      console.error(`[${ts}] [${sessionId}] [insight-analysis:error] ${err.message}`);
    })
    .finally(() => {
      const s = getSession(sessionId);
      s.insightAnalysisInFlight = false;
      if (s.pendingInsightLatestText) {
        runInsightAnalysisNow(sessionId, s.topic);
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
    runMetricAnalysisNow(sessionId);
    return;
  }

  session.analysisTimer = setTimeout(() => {
    const s = getSession(sessionId);
    s.analysisTimer = null;
    runMetricAnalysisNow(sessionId);
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
  session.pendingInsightLatestText = text.trim();
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
