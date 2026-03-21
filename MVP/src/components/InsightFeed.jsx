import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import InsightCard from './InsightCard';
import { Sparkles } from 'lucide-react';

export default function InsightFeed({ insights }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [insights]);

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
        <Sparkles className="w-6 h-6" />
        <p className="text-sm">AI insights will appear as the call progresses...</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto space-y-2 pr-1">
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
    </div>
  );
}
