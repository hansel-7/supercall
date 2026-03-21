import { useCallback, useRef, useState } from 'react';

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'audio/webm';
}

function triggerDownload(blob, mimeType) {
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const name = `recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Records mic via MediaRecorder. On stop, auto-saves the blob as a file.
 */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not available');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const mime = getSupportedMimeType();
    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime });
      if (blob.size > 0) {
        triggerDownload(blob, rec.mimeType || mime);
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    rec.start();
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') {
      setRecording(false);
      return;
    }
    rec.requestData();
    rec.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  return { start, stop, recording };
}
