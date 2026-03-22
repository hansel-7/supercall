import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart2,
  Calendar,
  Clock,
  HelpCircle,
  History,
  Lightbulb,
  Phone,
  Sparkles,
  TrendingUp,
  X,
  AlertTriangle,
} from 'lucide-react';

function formatDateTime(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return {
    date: d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

const insightTypeConfig = {
  vc_question: {
    icon: HelpCircle,
    color: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300',
    label: 'Follow-up Q',
  },
  context: {
    icon: History,
    color: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    label: 'Context',
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    label: 'Alert',
  },
  suggestion: {
    icon: Lightbulb,
    color: 'text-green-400',
    badge: 'bg-green-500/20 text-green-300',
    label: 'Suggestion',
  },
};

function SummaryInsightsPanel({ insights }) {
  if (!insights.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No insights captured in this session.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-4 space-y-3">
      {insights.map((insight) => {
        const type = String(insight?.type || '').trim().toLowerCase();
        const config = insightTypeConfig[type] || insightTypeConfig.context;
        const Icon = config.icon;
        return (
          <div key={insight.metricKey || insight.id} className="border border-white/10 rounded-lg p-3 bg-surface-900/35">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
                {insight?.formatHint?.badgeLabel || config.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-white">{insight.title}</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{insight.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function SummaryMetricsPanel({ metrics }) {
  if (!metrics.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No metrics detected in this session.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest pb-2">Metric</span>
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest text-right pb-2">Value</span>
        <div className="col-span-2 border-t border-white/10 mb-1" />
        {metrics.map((m) => (
          <div key={m.key} className="contents">
            <span className="text-xs text-gray-300 py-2.5">{m.label}</span>
            <div className="py-2.5 text-right">
              <span className="inline-flex items-center gap-1 text-sm font-mono font-semibold text-white">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                {m.current}
              </span>
            </div>
            <div className="col-span-2 border-t border-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'insights', label: 'Insights', icon: Sparkles, activeColor: 'text-cyan-400' },
  { id: 'metrics', label: 'Metrics', icon: BarChart2, activeColor: 'text-blue-400' },
];

export default function CallSummaryModal({
  isVisible,
  onClose,
  insights,
  metrics,
  callStartedAt,
  callEndedAt,
}) {
  const [activeTab, setActiveTab] = useState('insights');

  const meta = useMemo(() => {
    const start = callStartedAt ? new Date(callStartedAt) : null;
    const end = callEndedAt ? new Date(callEndedAt) : new Date();
    const { date, time } = formatDateTime(start || end);
    const durationMs = start ? Math.max(0, end.getTime() - start.getTime()) : 0;
    return {
      date,
      time,
      duration: formatDurationMs(durationMs),
    };
  }, [callStartedAt, callEndedAt]);

  const tabCountById = {
    insights: insights.length,
    metrics: metrics.length,
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-surface-900/60 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close call summary modal backdrop"
          />

          <motion.div
            className="relative w-full max-w-4xl h-[86vh] bg-surface-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Call Summary</h2>
                <p className="text-[11px] text-gray-500">Session insights and metrics snapshot</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label="Close call summary modal"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/5 border-b border-white/5 bg-surface-900/40">
              <div className="flex items-center gap-2.5 px-4 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Date</p>
                  <p className="text-xs font-medium text-gray-200 mt-0.5">{meta.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Start</p>
                  <p className="text-xs font-medium text-gray-200 mt-0.5">{meta.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Duration</p>
                  <p className="text-xs font-medium text-gray-200 mt-0.5">{meta.duration}</p>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-stretch border-b border-white/5 bg-surface-900/20 px-4 sm:px-5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                const count = tabCountById[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-semibold transition-colors ${
                      isActive ? tab.activeColor : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="call-summary-tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-current rounded-full"
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  className="h-full"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  {activeTab === 'insights' ? (
                    <SummaryInsightsPanel insights={insights} />
                  ) : (
                    <SummaryMetricsPanel metrics={metrics} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
