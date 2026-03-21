import express from 'express';
import 'dotenv/config';
import { randomUUID } from 'crypto';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_CONTEXT_LINES = 120;
const DEFAULT_SESSION_ID = 'default';
const sessionStore = new Map();

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
  sessionStore.set(sessionId, { lines: [] });
  res.json({ ok: true, sessionId });
});

function getSession(sessionId) {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, { lines: [] });
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
            'You analyze streaming call transcript chunks with prior context.\n' +
            'Task 1: identify the current conversation topic in 3-8 words.\n' +
            'Task 2: extract all numeric values mentioned in the latest chunk.\n' +
            'Return strict JSON only with shape: {"topic":"...","numbers":["..."]}.\n' +
            'For numbers, preserve formatting like %, $, ranges, and decimals.',
        },
        {
          role: 'user',
          content:
            `Session: ${sessionId}\n` +
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
  if (!raw) return { topic: 'unknown', numbers: [] };

  try {
    const parsed = JSON.parse(raw);
    const topic = typeof parsed?.topic === 'string' && parsed.topic.trim()
      ? parsed.topic.trim()
      : 'unknown';
    const numbers = Array.isArray(parsed?.numbers)
      ? parsed.numbers.map((n) => String(n))
      : [];
    return { topic, numbers };
  } catch {
    // fallback below
  }

  return {
    topic: 'unknown',
    numbers: raw.match(/-?\d+(?:[.,]\d+)?%?/g) ?? [],
  };
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

  analyzeWithContext({ sessionId: normalizedSessionId, latestText: text.trim() })
    .then(({ topic, numbers }) => {
      console.log(`[${ts}] [${normalizedSessionId}] [topic] ${topic}`);
      console.log(
        `[${ts}] [${normalizedSessionId}] [numbers] ${numbers.length ? numbers.join(', ') : '(none)'}`
      );
    })
    .catch((err) => {
      console.error(`[${ts}] [${normalizedSessionId}] [analysis:error] ${err.message}`);
    });

  res.json({ ok: true, sessionId: normalizedSessionId });
});

app.post('/transcript/reset', (req, res) => {
  const { sessionId = DEFAULT_SESSION_ID } = req.body ?? {};
  const normalizedSessionId =
    typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : DEFAULT_SESSION_ID;
  sessionStore.delete(normalizedSessionId);
  res.json({ ok: true, sessionId: normalizedSessionId });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
