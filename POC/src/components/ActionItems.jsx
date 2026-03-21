import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Circle, CheckCircle2 } from 'lucide-react';

export default function ActionItems({ items }) {
  if (items.length === 0) return null;

  return (
    <div className="bg-surface-700/40 rounded-lg border border-white/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="w-4 h-4 text-amber-400" />
        <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">
          Detected Action Items
        </h4>
        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
          {items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2 group"
            >
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className={`text-xs ${item.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {item.text}
                </p>
                {item.detail && (
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.detail}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
