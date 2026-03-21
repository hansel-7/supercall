import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function LiveTranscriptStream({ lines, interim }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines, interim]);

  const empty = lines.length === 0 && !interim;

  if (empty) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-gray-500 text-sm gap-2 px-4">
        <MessageSquare className="w-4 h-4 flex-shrink-0" />
        <span>Speak to see text appear here…</span>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto space-y-3 pr-1">
      {lines.map((entry, idx) => {
        const isLatest = idx === lines.length - 1 && !interim;
        return (
          <div
            key={entry.id}
            className={`transition-opacity duration-300 ${isLatest ? 'opacity-100' : 'opacity-75'}`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
              <span className="text-[10px] font-medium text-gray-500">{formatTime(entry.at)}</span>
            </div>
            <p className={`text-sm text-gray-200 pl-3.5 leading-relaxed ${isLatest ? 'text-white font-medium' : ''}`}>
              {entry.text}
            </p>
          </div>
        );
      })}
      {interim && (
        <div className="opacity-90">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
            <span className="text-[10px] font-medium text-gray-500">In progress</span>
          </div>
          <p className="text-sm text-gray-400 pl-3.5 italic leading-relaxed">{interim}</p>
        </div>
      )}
    </div>
  );
}
