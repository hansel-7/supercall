# SuperCall MVP (step 1)

Vite + React app: **live speech-to-text** only (Web Speech API — Chrome / Edge). No speaker labels, no file upload.

## Setup

```bash
cd mvp
npm install
npm run dev
```

Allow **microphone** when the browser prompts.

## Controls

- **Start listening** / **Stop** — toggles continuous recognition.
- **Clear transcript** — removes captured lines (in-progress phrase is cleared when you stop).
