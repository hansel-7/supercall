import { AnimatePresence, motion } from 'framer-motion';
import InsightCard from './InsightCard';
import { Sparkles } from 'lucide-react';

export default function InsightFeed({ insights }) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
        <Sparkles className="w-6 h-6" />
        <p className="text-sm">AI insights will appear as the call progresses...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-end overflow-hidden gap-2">
      <AnimatePresence mode="popLayout">
        {insights.map((insight, idx) => (
          <motion.div
            key={insight.id + '-' + idx}
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <InsightCard insight={insight} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
