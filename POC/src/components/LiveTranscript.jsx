import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

const speakerStyles = {
  vc: { label: 'Sarah (VC)', color: 'text-blue-400', dot: 'bg-blue-400' },
  founder: { label: 'Alex (Founder)', color: 'text-emerald-400', dot: 'bg-emerald-400' },
};

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
            className={`transition-opacity duration-500 ${isLatest ? 'opacity-100' : 'opacity-70'}`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              <span className={`text-xs font-medium ${style.color}`}>{style.label}</span>
            </div>
            <p className={`text-sm text-gray-300 pl-3.5 ${isLatest ? 'font-medium text-white' : ''}`}>
              {entry.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
