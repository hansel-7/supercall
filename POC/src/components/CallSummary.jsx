import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  Phone,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  Zap,
  AlertTriangle,
  Lightbulb,
  History,
  HelpCircle,
  BarChart2,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDate(date) {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function directionIcon(prev, current) {
  const parse = (s) => parseFloat((s ?? '').replace(/[^0-9.]/g, '')) || 0;
  const p = parse(prev);
  const c = parse(current);
  if (c > p) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (c < p) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return null;
}

const insightTypeConfig = {
  vc_question: { icon: HelpCircle,    color: 'text-cyan-400',   badge: 'bg-cyan-500/20 text-cyan-300',     label: 'Follow-up Q'  },
  context:     { icon: History,       color: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', label: 'Context'      },
  alert:       { icon: AlertTriangle, color: 'text-amber-400',  badge: 'bg-amber-500/20 text-amber-300',   label: 'Alert'        },
  suggestion:  { icon: Lightbulb,     color: 'text-green-400',  badge: 'bg-green-500/20 text-green-300',   label: 'Suggestion'   },
  metric:      { icon: TrendingUp,    color: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-300',     label: 'Metric'       },
};

const TYPE_ORDER = ['vc_question', 'alert', 'suggestion', 'context', 'metric'];

function groupInsights(insights) {
  const map = {};
  TYPE_ORDER.forEach((t) => { map[t] = []; });
  insights.forEach((ins) => {
    const key = ins.type in map ? ins.type : 'context';
    map[key].push(ins);
  });
  return TYPE_ORDER.map((t) => ({ type: t, items: map[t] })).filter((g) => g.items.length > 0);
}

// ─── tab content panels ──────────────────────────────────────────────────────

function MetricsPanel({ metrics }) {
  return (
    <div className="px-6 py-5 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-white mb-1">Key Metrics</h3>
      <p className="text-xs text-gray-500 mb-4">Compared against last call values.</p>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-8 gap-y-0">
        <div />
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest text-right pb-2">
          Last Call
        </span>
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest text-right pb-2">
          This Call
        </span>
        <div className="col-span-3 border-t border-white/5 mb-2" />

        {metrics.map((m) => (
          <div key={m.key} className="contents group">
            <span className="text-sm text-gray-400 py-2.5 self-center leading-tight">{m.label}</span>
            <span className="text-sm font-mono text-gray-400 text-right py-2.5 self-center">{m.prev}</span>
            <div className="flex items-center justify-end gap-1.5 py-2.5 self-center">
              {m.current ? (
                <>
                  {directionIcon(m.prev, m.current)}
                  <span className="text-base font-mono font-bold text-white">{m.current}</span>
                </>
              ) : (
                <span className="text-sm font-mono text-gray-600 italic">n/d</span>
              )}
            </div>
            <div className="col-span-3 border-t border-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionItemsPanel({ actionItems }) {
  if (actionItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
        <ClipboardList className="w-10 h-10 opacity-30" />
        <p className="text-sm">No action items detected.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-white mb-1">Action Items</h3>
      <p className="text-xs text-gray-500 mb-4">{actionItems.length} items detected during this call.</p>

      <div className="space-y-2.5 pl-2">
        {actionItems.map((item) => {
          const title = item.text
            .replace(/^Action Item:\s*/i, '')
            .replace(/^Action:\s*/i, '');
          return (
            <div
              key={item.id}
              className="border-l-2 border-amber-500/30 pl-4 py-0.5 hover:border-amber-500/60 transition-colors"
            >
              <p className="text-sm font-medium text-gray-300 leading-snug">{title}</p>
              {item.detail && (
                <p className="text-xs text-gray-500 leading-relaxed mt-1">{item.detail}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightsPanel({ insights }) {
  const groups = groupInsights(insights);

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
        <Sparkles className="w-10 h-10 opacity-30" />
        <p className="text-sm">No insights captured.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-white mb-1">Live Insights</h3>
      <p className="text-xs text-gray-500 mb-4">{insights.length} insights surfaced during this call.</p>

      <div className="space-y-8">
        {groups.map(({ type, items }) => {
          const cfg = insightTypeConfig[type] ?? insightTypeConfig.context;
          const Icon = cfg.icon;
          return (
            <div key={type}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <span className="text-xs text-gray-600 ml-auto">{items.length}</span>
              </div>

              {/* Group items */}
              <div className="space-y-2.5 pl-2">
                {items.map((ins) => (
                  <div
                    key={ins.id}
                    className="border-l-2 border-white/10 pl-4 py-0.5 hover:border-white/20 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-300 leading-snug">{ins.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mt-1">{ins.body}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'metrics',    label: 'Key Metrics',   icon: BarChart2,     activeColor: 'text-blue-400',   activeBorder: 'border-blue-400',   activeBg: 'bg-blue-500/10'  },
  { id: 'actions',    label: 'Action Items',  icon: ClipboardList, activeColor: 'text-amber-400',  activeBorder: 'border-amber-400',  activeBg: 'bg-amber-500/10' },
  { id: 'insights',   label: 'Live Insights', icon: Sparkles,      activeColor: 'text-cyan-400',   activeBorder: 'border-cyan-400',   activeBg: 'bg-cyan-500/10'  },
];

export default function CallSummary({
  isVisible,
  onClose,
  onRestart,
  metrics,
  insights,
  actionItems,
  callDuration,
  callStartTime,
  totalSteps,
}) {
  const [activeTab, setActiveTab] = useState('metrics');

  const tabCounts = {
    metrics:  metrics.length,
    actions:  actionItems.length,
    insights: insights.length,
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center p-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop — semi-transparent so call screen remains visible */}
          <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-[55vw] h-[88vh] bg-surface-800/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
            initial={{ y: 32, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Call Summary</h2>
                <p className="text-[11px] text-gray-500">NovaPay × Meridian Ventures — Series A Follow-up</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={onRestart}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> New Call
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Call Info Strip ── */}
            <div className="flex-shrink-0 grid grid-cols-4 divide-x divide-white/5 border-b border-white/5 bg-surface-900/40">
              {[
                { icon: Calendar, label: 'Date',         value: formatDate(callStartTime)       },
                { icon: Clock,    label: 'Start Time',   value: formatTime(callStartTime)       },
                { icon: Phone,    label: 'Duration',     value: formatDuration(callDuration)    },
                { icon: Users,    label: 'Participants', value: 'Sarah Chen · Alex Rivera'      },
              ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest">{label}</p>
                    <p className="text-xs font-medium text-gray-200 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Horizontal tab bar ── */}
            <div className="flex-shrink-0 flex items-stretch gap-0 border-b border-white/5 bg-surface-900/20 px-5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id];
                return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors
                        ${isActive ? `${tab.activeColor}` : 'text-gray-500 hover:text-gray-300'}
                      `}
                    >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`
                        text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-0.5
                        ${isActive ? `${tab.activeBg} ${tab.activeColor}` : 'bg-white/5 text-gray-600'}
                      `}>
                        {count}
                      </span>
                    )}
                    {/* Active underline */}
                    {isActive && (
                      <motion.div
                        layoutId="tab-underline"
                        className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${tab.activeBorder} border-0`}
                        style={{ background: 'currentColor' }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Content area ── */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  className="h-full overflow-hidden"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {activeTab === 'metrics'  && <MetricsPanel    metrics={metrics}          />}
                  {activeTab === 'actions'  && <ActionItemsPanel actionItems={actionItems} />}
                  {activeTab === 'insights' && <InsightsPanel    insights={insights}        />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-2 border-t border-white/5 bg-surface-900/20">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] text-gray-500">
                  SuperCall AI · {totalSteps} turns · {insights.length} insights · {actionItems.length} actions
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-gray-700" />
                <span className="text-[10px] text-gray-600">Auto-generated post-call report</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
