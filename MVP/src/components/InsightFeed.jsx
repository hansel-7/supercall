import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import InsightCard from './InsightCard';
import { Sparkles } from 'lucide-react';

export default function InsightFeed({ insights }) {
  const scrollRef = useRef(null);
  const lastSeenInsightRef = useRef('');

  useEffect(() => {
    const newest = insights.length > 0 ? insights[insights.length - 1] : null;
    const newestKey = newest
      ? `${String(newest.metricKey || newest.id || '')}:${String(newest.updatedAt || '')}`
      : '';
    const hasNewInsight = newestKey && newestKey !== lastSeenInsightRef.current;
    if (hasNewInsight && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      lastSeenInsightRef.current = newestKey;
    }
  }, [insights]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-scroll space-y-2 pr-1">
      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-full text-gray-500 gap-2">
          <Sparkles className="w-6 h-6" />
          <p className="text-sm">AI insights will appear as the call progresses...</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {insights.map((insight) => (
            <motion.div
              key={insight.metricKey || insight.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <InsightCard insight={insight} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
