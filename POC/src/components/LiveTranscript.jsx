import { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

const speakerStyles = {
  vc: { label: 'Sarah (VC)', color: 'text-blue-400', dot: 'bg-blue-400' },
  founder: { label: 'Alex (Founder)', color: 'text-emerald-400', dot: 'bg-emerald-400' },
};

// Reveals text word by word; once complete, stays static.
function WordReveal({ text, isActive, wordIntervalMs = 95 }) {
  const words = text.split(' ');
  const [visibleCount, setVisibleCount] = useState(isActive ? 0 : words.length);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      setVisibleCount(words.length);
      return;
    }

    setVisibleCount(0);
    let count = 0;
    intervalRef.current = setInterval(() => {
      count += 1;
      setVisibleCount(count);
      if (count >= words.length) {
        clearInterval(intervalRef.current);
      }
    }, wordIntervalMs);

    return () => clearInterval(intervalRef.current);
  // Only re-run when the text itself changes (new entry becomes active)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, isActive]);

  const shown = words.slice(0, visibleCount).join(' ');
  const isDone = visibleCount >= words.length;

  return (
    <span>
      {shown}
      {!isDone && (
        <span className="inline-block w-0.5 h-3.5 bg-white/70 ml-0.5 align-middle animate-pulse" />
      )}
    </span>
  );
}

export default function LiveTranscript({ transcript }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm gap-2">
        <MessageSquare className="w-4 h-4" />
        <span>Call transcript will appear here...</span>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto space-y-3 pr-1">
      {transcript.map((entry, idx) => {
        const style = speakerStyles[entry.speaker];
        const isLatest = idx === transcript.length - 1;
        return (
          <div
            key={idx}
            className={`transition-opacity duration-300 ${isLatest ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              <span className={`text-xs font-medium ${style.color}`}>{style.label}</span>
            </div>
            <p className={`text-sm pl-3.5 ${isLatest ? 'text-white font-medium' : 'text-gray-400'}`}>
              <WordReveal
                text={entry.text}
                isActive={isLatest}
                wordIntervalMs={95}
              />
            </p>
          </div>
        );
      })}
    </div>
  );
}
