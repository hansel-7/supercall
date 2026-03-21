import { Mic, MicOff } from 'lucide-react';

const avatarColors = {
  vc: 'from-blue-500 to-indigo-600',
  founder: 'from-emerald-500 to-teal-600',
};

export default function CallerTile({ name, role, company, speaker, isSpeaking, isMuted }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl bg-surface-700/60 backdrop-blur-sm border border-white/5 p-6 min-h-[280px]">
      <div className="relative mb-4">
        {isSpeaking && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${avatarColors[speaker]} opacity-30 animate-pulse-ring scale-125`}
          />
        )}
        <div
          className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${avatarColors[speaker]} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
        >
          {initials}
        </div>
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-surface-700 flex items-center justify-center">
            <Mic className="w-3 h-3 text-white" />
          </div>
        )}
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 border-2 border-surface-700 flex items-center justify-center">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <h3 className="text-white font-semibold text-lg">{name}</h3>
      <p className="text-gray-400 text-sm mt-0.5">{role}</p>
      <p className="text-gray-500 text-xs mt-0.5">{company}</p>

      {isSpeaking && (
        <div className="flex gap-1 mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 bg-green-400 rounded-full"
              style={{
                height: `${8 + Math.random() * 16}px`,
                animation: `pulse-ring 0.${3 + i}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
