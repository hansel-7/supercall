const VOICES = {
  vc: 'shimmer',
  founder: 'echo',
};

const INSTRUCTIONS = {
  vc: 'You are Sarah Chen, a seasoned venture capital partner conducting a due diligence follow-up call. Speak at a brisk, confident pace — like someone who values efficiency. Be direct, analytical, and inquisitive.',
  founder: 'You are Alex Rivera, a confident and passionate startup founder pitching to investors. Speak at a quick, energetic pace. Be enthusiastic and persuasive. Deliver numbers and metrics crisply.',
};

export async function fetchSpeech(text, speaker, apiKey) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: text,
      voice: VOICES[speaker],
      response_format: 'mp3',
      instructions: INSTRUCTIONS[speaker],
      speed: 1.25,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`TTS API ${response.status}: ${errorText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
