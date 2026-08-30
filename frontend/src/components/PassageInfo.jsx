import React from 'react';
import { BookOpen, Sparkles, Target } from 'lucide-react';

export default function PassageInfo({ passage, isTyping }) {
  if (!passage) return null;

  const isDrill = passage.category === 'drill' || Boolean(passage.focus);

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'hard':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'medium':
      default:
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    }
  };

  return (
    <div
      className={`w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 py-3 transition-opacity duration-300 ${
        isTyping ? 'opacity-20 hover:opacity-80' : 'opacity-80'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {isDrill ? (
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        ) : (
          <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
        )}
        <span className="font-medium text-zinc-200">{passage.title}</span>
        {passage.source && (
          <>
            <span className="text-zinc-600">—</span>
            <span className="italic text-zinc-400">{passage.source}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Focus tokens for AI drills */}
        {Array.isArray(passage.focus) && passage.focus.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/50 border border-purple-800/40 text-purple-300 font-mono text-[10px]">
            <Target className="w-3 h-3 text-purple-400" />
            <span>Focus:</span>
            <span className="font-semibold text-purple-200">
              {passage.focus.map(f => (f === ' ' ? '␣' : f)).join(', ')}
            </span>
          </div>
        )}

        {passage.category && (
          <span
            className={`uppercase text-[10px] tracking-wider px-2 py-0.5 rounded border font-mono ${
              isDrill
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-bold'
                : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400'
            }`}
          >
            {passage.category}
          </span>
        )}

        {passage.difficulty && (
          <span
            className={`uppercase text-[10px] tracking-wider px-2 py-0.5 rounded border font-mono ${getDifficultyColor(
              passage.difficulty
            )}`}
          >
            {passage.difficulty}
          </span>
        )}

        <span className="font-mono text-zinc-500">
          {passage.content ? `${passage.content.length} chars` : ''}
        </span>
      </div>
    </div>
  );
}
