import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { previousCalls, keyMetrics } from '../data/historicalData';

function MetricDelta({ label, current, change }) {
  if (!change) return null;
  const isUp = change.direction === 'up';
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono text-white">{current}</span>
        <span className={`text-[10px] font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {change.delta}
        </span>
      </div>
    </div>
  );
}

export default function HistoricalContext() {
  const [isExpanded, setIsExpanded] = useState(false);
  const lastCall = previousCalls[0];

  return (
    <div className="bg-surface-700/40 rounded-lg border border-white/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-medium text-gray-300">Previous Call Context</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5">
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white">{lastCall.type}</span>
              <span className="text-[10px] text-gray-500">
                {lastCall.date} · {lastCall.duration}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{lastCall.summary}</p>
          </div>

          <div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              Key Metrics Since Last Call
            </span>
            <div className="mt-1 divide-y divide-white/5">
              <MetricDelta label="ARR" current={keyMetrics.current.arr} change={keyMetrics.changes.arr} />
              <MetricDelta label="NRR" current={keyMetrics.current.nrr} change={keyMetrics.changes.nrr} />
              <MetricDelta label="ACV" current={keyMetrics.current.acv} change={keyMetrics.changes.acv} />
              <MetricDelta label="Burn Rate" current={keyMetrics.current.burnRate} change={keyMetrics.changes.burnRate} />
              <MetricDelta label="Runway" current={keyMetrics.current.runway} change={keyMetrics.changes.runway} />
            </div>
          </div>

          <div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              Action Items from Last Call
            </span>
            <div className="mt-1 space-y-1">
              {lastCall.actionItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${item.completed ? 'text-green-400' : 'text-gray-500'}`} />
                  <span className={`text-xs ${item.completed ? 'text-gray-400 line-through' : 'text-gray-300'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
