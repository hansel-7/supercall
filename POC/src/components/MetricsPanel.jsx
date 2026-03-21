import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

function directionIcon(prev, current) {
  const parseNum = (s) => parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
  const p = parseNum(prev);
  const c = parseNum(current);
  if (c > p) return <TrendingUp className="w-3 h-3 text-green-400" />;
  if (c < p) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return null;
}

export default function MetricsPanel({ metrics }) {
  const revealed = metrics.filter((m) => m.current !== null);

  if (revealed.length === 0) return null;

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3">
      {/* Column headers */}
      <div />
      <span className="text-[9px] font-medium text-gray-600 uppercase tracking-wider text-right pb-1.5">
        Last Call
      </span>
      <span className="text-[9px] font-medium text-gray-600 uppercase tracking-wider text-right pb-1.5">
        This Call
      </span>
      <div className="col-span-3 border-t border-white/5 mb-1" />

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
            <span className="text-xs font-mono text-gray-500 text-right py-1 self-center">
              {m.prev}
            </span>
            <div className="flex items-center justify-end gap-1 py-1 self-center">
              <motion.div
                key={m.current}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-1"
              >
                {directionIcon(m.prev, m.current)}
                <span className="text-sm font-mono font-semibold text-white">
                  {m.current}
                </span>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
