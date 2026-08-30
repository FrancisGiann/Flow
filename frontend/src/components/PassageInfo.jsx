import React from 'react';
import { BookOpen, Sparkles, Target } from 'lucide-react';

export default function PassageInfo({ passage }) {
  if (!passage) return null;

  const isDrill = passage.category === 'drill' || Boolean(passage.focus);

  const getDifficultyClass = (diff) => `passage-difficulty is-${diff?.toLowerCase() || 'medium'}`;

  return (
    <div className="passage-info">
      <div className="flex items-center gap-2 flex-wrap">
        {isDrill ? (
          <Sparkles className="w-4 h-4" />
        ) : (
          <BookOpen className="w-4 h-4" />
        )}
        <span className="passage-title">{passage.title}</span>
        {passage.source && (
          <>
            <span aria-hidden="true">—</span>
            <span className="passage-source">{passage.source}</span>
          </>
        )}
      </div>

      <div className="passage-meta">
        {/* Focus tokens for AI drills */}
        {Array.isArray(passage.focus) && passage.focus.length > 0 && (
          <div className="passage-focus">
            <Target className="w-3.5 h-3.5" />
            <span>Focus</span>
            <span className="font-semibold">
              {passage.focus.map(f => (f === ' ' ? '␣' : f)).join(', ')}
            </span>
          </div>
        )}

        {passage.category && (
          <span
            className={`passage-kind ${isDrill ? 'is-drill' : ''}`}
          >
            {passage.category}
          </span>
        )}

        {passage.difficulty && (
          <span
            className={getDifficultyClass(passage.difficulty)}
          >
            {passage.difficulty}
          </span>
        )}

        <span className="passage-length">
          {passage.content ? `${passage.content.length} chars` : ''}
        </span>
      </div>
    </div>
  );
}
