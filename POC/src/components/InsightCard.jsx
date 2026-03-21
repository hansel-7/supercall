import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Lightbulb, History } from 'lucide-react';

const typeConfig = {
  metric: {
    icon: TrendingUp,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
    label: 'Metric',
  },
  alert: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    label: 'Alert',
  },
  suggestion: {
    icon: Lightbulb,
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    iconColor: 'text-green-400',
    badge: 'bg-green-500/20 text-green-300',
    label: 'Suggestion',
  },
  context: {
    icon: History,
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    label: 'Context',
  },
};

export default function InsightCard({ insight }) {
  const config = typeConfig[insight.type] || typeConfig.context;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`${config.bg} ${config.border} border rounded-lg p-3 transition-all hover:brightness-110`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 ${config.iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white truncate">{insight.title}</h4>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.badge} flex-shrink-0`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </motion.div>
  );
}
