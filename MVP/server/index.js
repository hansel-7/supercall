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
    refinedContext: 'No context yet.',
    conversationNature: 'unknown',
    lastLoggedNature: 'unknown',
    analysisInFlight: false,
    analysisTimer: null,
    lastAnalyzedAt: 0,
    pendingLatestText: '',
  });
  res.json({ ok: true, sessionId });
});

function getSession(sessionId) {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, {
      lines: [],
      refinedContext: 'No context yet.',
      conversationNature: 'unknown',
      lastLoggedNature: 'unknown',
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

async function analyzeWithContext({ sessionId, latestText }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const session = getSession(sessionId);
  const contextText = session.lines
    .map((l) => `[${l.type}] ${l.text}`)
    .join('\n')
    .slice(-12000);
  const previousRefinedContext = session.refinedContext || 'No context yet.';
  const previousNature = session.conversationNature || 'unknown';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'You analyze streaming call transcript chunks with memory.\n' +
            'Continuously refine context and infer the conversation nature.\n' +
            'Task 1: identify the current topic in 3-8 words.\n' +
            'Task 2: classify conversation nature (e.g., sales call, support, interview, negotiation, casual chat).\n' +
            'Task 3: update refined context summary in 1-2 concise sentences.\n' +
            'Task 4: extract all numeric values mentioned in the latest chunk.\n' +
            'Return strict JSON only with shape: {"topic":"...","nature":"...","refinedContext":"...","numbers":["..."]}.\n' +
            'For numbers, preserve formatting like %, $, ranges, and decimals.',
        },
        {
          role: 'user',
          content:
            `Session: ${sessionId}\n` +
            `Previous nature: ${previousNature}\n` +
            `Previous refined context:\n${previousRefinedContext}\n\n` +
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
  const raw = data?.output_text?.trim() ?? '';
  if (!raw) {
    return {
      topic: 'unknown',
      nature: previousNature,
      refinedContext: previousRefinedContext,
      numbers: [],
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const topic = typeof parsed?.topic === 'string' && parsed.topic.trim()
      ? parsed.topic.trim()
      : 'unknown';
    const nature = typeof parsed?.nature === 'string' && parsed.nature.trim()
      ? parsed.nature.trim()
      : previousNature;
    const refinedContext = typeof parsed?.refinedContext === 'string' && parsed.refinedContext.trim()
      ? parsed.refinedContext.trim()
      : previousRefinedContext;
    const numbers = Array.isArray(parsed?.numbers)
      ? parsed.numbers.map((n) => String(n))
      : [];
    return { topic, nature, refinedContext, numbers };
  } catch {
    // fallback below
  }

  return {
    topic: 'unknown',
    nature: previousNature,
    refinedContext: previousRefinedContext,
    numbers: raw.match(/-?\d+(?:[.,]\d+)?%?/g) ?? [],
  };
}

function runAnalysisNow(sessionId) {
  const session = getSession(sessionId);
  const latestText = session.pendingLatestText?.trim();
  if (!latestText || session.analysisInFlight) return;

  session.analysisInFlight = true;
  session.pendingLatestText = '';
  const ts = new Date().toISOString();

  analyzeWithContext({ sessionId, latestText })
    .then(({ topic, nature, refinedContext, numbers }) => {
      const s = getSession(sessionId);
      const prevLoggedNature = s.lastLoggedNature || 'unknown';
      s.conversationNature = nature;
      s.refinedContext = refinedContext;
      s.lastAnalyzedAt = Date.now();

      console.log(`[${ts}] [${sessionId}] [topic] ${topic}`);
      console.log(`[${ts}] [${sessionId}] [nature] ${nature}`);
      if (nature && nature !== 'unknown' && nature !== prevLoggedNature) {
        console.log(`[${ts}] [${sessionId}] [nature:identified] ${nature}`);
      }
      s.lastLoggedNature = nature || prevLoggedNature;
      console.log(`[${ts}] [${sessionId}] [context] ${refinedContext}`);
      console.log(`[${ts}] [${sessionId}] [numbers] ${numbers.length ? numbers.join(', ') : '(none)'}`);
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
