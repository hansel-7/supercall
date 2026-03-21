import express from 'express';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

async function extractKeyMetrics(text) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

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
            'Extract every numeric value from the text. Return JSON only in the shape {"numbers":["..."]}. Include percentages, currency, decimals, and ranges exactly as written.',
        },
        {
          role: 'user',
          content: text,
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
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.numbers)) {
      return parsed.numbers.map((n) => String(n));
    }
  } catch {
    // fallback below
  }

  return raw.match(/-?\d+(?:[.,]\d+)?%?/g) ?? [];
}

app.post('/transcript', (req, res) => {
  const { type, text, at } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ ok: false, error: 'text is required' });
    return;
  }

  const ts = at ? new Date(at).toISOString() : new Date().toISOString();
  console.log(`[${ts}] [${type || 'chunk'}] ${text}`);
  extractKeyMetrics(text)
    .then((numbers) => {
      console.log(`[${ts}] [numbers] ${numbers.length ? numbers.join(', ') : '(none)'}`);
    })
    .catch((err) => {
      console.error(`[${ts}] [numbers:error] ${err.message}`);
    });

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
