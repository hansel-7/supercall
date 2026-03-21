import { motion, AnimatePresence } from 'framer-motion';

export default function MetricsPanel({ metrics }) {
  const revealed = metrics.filter((m) => m.current !== null);

  if (revealed.length === 0) return null;

  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3">
      <div className="col-span-2 border-t border-white/5 mb-1" />

      <AnimatePresence>
        {revealed.map((m) => (
          <motion.div
            key={m.key}
            className="contents"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <span className="text-xs text-gray-400 py-1 leading-tight self-center">
              {m.label}
            </span>
            <motion.div
              key={m.current}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-right py-1 self-center"
            >
              <span className="text-sm font-mono font-semibold text-white">
                {m.current}
              </span>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
