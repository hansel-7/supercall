/**
 * Pre-generates TTS audio for every line in callScript.js and saves them
 * to public/audio/step-N.mp3. Also writes public/audio/script-hash.txt so
 * the app knows whether the cached files are still valid.
 *
 * Usage:  node scripts/generate-audio.mjs
 * Re-run whenever the conversation script changes.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Read API key from .env without requiring dotenv as a dependency
function readEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf-8');
    const entry = raw.split('\n').find((l) => l.startsWith('VITE_OPENAI_API_KEY='));
    return entry ? entry.split('=')[1].trim() : null;
  } catch {
    return null;
  }
}

const API_KEY = readEnv();
if (!API_KEY) {
  console.error('Error: VITE_OPENAI_API_KEY not found in .env');
  process.exit(1);
}

// Import call script — plain JS array, no browser APIs
const { callScript } = await import('../src/data/callScript.js');

const VOICES = { vc: 'sage', founder: 'onyx' };
const OUT_DIR = resolve(ROOT, 'public', 'audio');
mkdirSync(OUT_DIR, { recursive: true });

async function fetchSpeech(text, speaker) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice: VOICES[speaker],
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`TTS API ${res.status}: ${msg}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// djb2-style hash — matches the algorithm used in useTTS.js so the browser
// can detect whether the committed audio files are still valid.
function scriptHash() {
  const str = callScript.map((s) => `${s.speaker}:${s.text}`).join('|');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

console.log(`Generating ${callScript.length} audio clips → public/audio/\n`);

for (let i = 0; i < callScript.length; i++) {
  const step = callScript[i];
  const label = `[${String(i + 1).padStart(2, '0')}/${callScript.length}]`;
  const preview = step.text.slice(0, 60).replace(/\n/g, ' ');
  process.stdout.write(`${label} ${step.speaker.padEnd(7)} "${preview}..." `);

  try {
    const audio = await fetchSpeech(step.text, step.speaker);
    writeFileSync(resolve(OUT_DIR, `step-${i}.mp3`), audio);
    console.log(`✓ (${(audio.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

const hash = scriptHash();
// Both files contain the same hash — script-hash.txt is human-readable;
// script-hash-browser.txt is the one the browser fetches to validate the cache.
writeFileSync(resolve(OUT_DIR, 'script-hash.txt'), hash);
writeFileSync(resolve(OUT_DIR, 'script-hash-browser.txt'), hash);
console.log(`\nDone. Script hash: ${hash}`);
console.log('Commit the public/audio/ folder to keep audio in the repo.');
