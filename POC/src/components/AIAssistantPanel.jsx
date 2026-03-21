import { Brain, Zap } from 'lucide-react';
import InsightFeed from './InsightFeed';
import SentimentBar from './SentimentBar';
import HistoricalContext from './HistoricalContext';
import ActionItems from './ActionItems';

export default function AIAssistantPanel({
  insights,
  sentimentHistory,
  actionItems,
  isCallActive,
  isPlaying,
}) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">SuperCall AI</h2>
            <p className="text-[10px] text-gray-500">Real-time Call Intelligence</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
            isPlaying
              ? 'bg-green-500/20 text-green-400'
              : isCallActive
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          <Zap className="w-3 h-3" />
          {isPlaying ? 'Analyzing' : isCallActive ? 'Paused' : 'Standby'}
        </div>
      </div>

      <SentimentBar sentimentHistory={sentimentHistory} />

      <HistoricalContext />

      <ActionItems items={actionItems} />

      <div className="flex-1 min-h-0 bg-surface-800/40 rounded-xl border border-white/5 p-3 flex flex-col">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Live Insights
          </span>
          {insights.length > 0 && (
            <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
              {insights.length}
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <InsightFeed insights={insights} />
        </div>
      </div>
    </div>
  );
}
