import { TrendingUp, AlertTriangle, Lightbulb, History, HelpCircle } from 'lucide-react';

const typeConfig = {
  metric: {
    icon: TrendingUp,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
    highlightColor: 'text-blue-300 font-semibold',
    label: 'Metric',
  },
  alert: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    highlightColor: 'text-amber-300 font-semibold',
    label: 'Alert',
  },
  fact: {
    icon: History,
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    highlightColor: 'text-purple-300 font-semibold',
    label: 'Context',
  },
  risk: {
    icon: AlertTriangle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300',
    highlightColor: 'text-red-300 font-semibold',
    label: 'Risk',
  },
  obstacle: {
    icon: AlertTriangle,
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300',
    highlightColor: 'text-orange-300 font-semibold',
    label: 'Obstacle',
  },
  next_step: {
    icon: Lightbulb,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    highlightColor: 'text-emerald-300 font-semibold',
    label: 'Next Step',
  },
  question: {
    icon: HelpCircle,
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-400/40',
    iconColor: 'text-cyan-400',
    badge: 'bg-cyan-500/25 text-cyan-300',
    highlightColor: 'text-cyan-300 font-semibold',
    label: 'Follow-up Q',
  },
  suggestion: {
    icon: Lightbulb,
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    iconColor: 'text-green-400',
    badge: 'bg-green-500/20 text-green-300',
    highlightColor: 'text-green-300 font-semibold',
    label: 'Suggestion',
  },
  context: {
    icon: History,
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    highlightColor: 'text-purple-300 font-semibold',
    label: 'Context',
  },
  vc_question: {
    icon: HelpCircle,
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-400/40',
    iconColor: 'text-cyan-400',
    badge: 'bg-cyan-500/25 text-cyan-300',
    highlightColor: 'text-cyan-300 font-semibold',
    label: 'Follow-up Q',
  },
};

function renderBody(text, phrases, highlightClass) {
  if (!phrases || phrases.length === 0) return text;
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => {
    const isMatch = sorted.some((p) => p.toLowerCase() === part.toLowerCase());
    return isMatch
      ? <span key={i} className={highlightClass}>{part}</span>
      : part;
  });
}

export default function InsightCard({ insight }) {
  const category = String(insight?.formatHint?.category || insight?.classification?.category || insight?.category || '')
    .trim()
    .toLowerCase();
  const variant = String(insight?.formatHint?.variant || insight?.type || '').trim().toLowerCase();
  const config = typeConfig[category] || typeConfig[variant] || typeConfig.context;
  const badgeLabel = String(insight?.formatHint?.badgeLabel || config.label || '').trim() || config.label;
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-3 transition-all hover:brightness-110`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 ${config.iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white truncate">{insight.title}</h4>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.badge} flex-shrink-0`}>
              {badgeLabel}
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {renderBody(insight.body, insight.highlight, config.highlightColor)}
          </p>
        </div>
      </div>
    </div>
  );
}
