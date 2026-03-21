import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function SentimentMeter({ label, value, color, prevValue }) {
  const delta = value - prevValue;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <div className="flex items-center gap-1">
          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
          <span className="text-xs font-mono text-white">{value}%</span>
        </div>
      </div>
      <div className="h-2 bg-surface-900 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function SentimentBar({ sentimentHistory }) {
  const vcValues = sentimentHistory.vcInterest;
  const founderValues = sentimentHistory.founderConfidence;
  const vcCurrent = vcValues[vcValues.length - 1] || 50;
  const vcPrev = vcValues.length > 1 ? vcValues[vcValues.length - 2] : vcCurrent;
  const founderCurrent = founderValues[founderValues.length - 1] || 50;
  const founderPrev = founderValues.length > 1 ? founderValues[founderValues.length - 2] : founderCurrent;

  return (
    <div className="bg-surface-700/40 rounded-lg border border-white/5 p-3">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
        Conversation Sentiment
      </h4>
      <div className="flex flex-col gap-3">
        <SentimentMeter
          label="VC Interest"
          value={vcCurrent}
          prevValue={vcPrev}
          color="bg-gradient-to-r from-blue-500 to-blue-400"
        />
        <SentimentMeter
          label="Founder Confidence"
          value={founderCurrent}
          prevValue={founderPrev}
          color="bg-gradient-to-r from-emerald-500 to-emerald-400"
        />
      </div>
    </div>
  );
}
