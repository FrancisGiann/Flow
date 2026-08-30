import React, { useEffect } from 'react';
import { RotateCcw, ArrowRight, Zap, Target, Clock, CheckCircle2, Sparkles, Brain, Activity } from 'lucide-react';

export default function SessionComplete({ stats, onRestart, onNext, onNextStandard, onViewDashboard }) {
  const {
    wpm = 0,
    rawWpm = 0,
    accuracy = 100,
    elapsedTimeMs = 0,
    totalChars = 0,
    correctChars = 0,
    errorCount = 0,
    weaknesses = [],
    passage
  } = stats || {};

  const seconds = (elapsedTimeMs / 1000).toFixed(1);
  const hasWeaknesses = Array.isArray(weaknesses) && weaknesses.length > 0;

  // Keyboard shortcut listener for Enter and Tab
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        onRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onRestart]);

  // Determine zen feedback message based on performance
  const getFeedback = () => {
    if (accuracy >= 98 && wpm >= 80) return { title: 'Transcendent Flow', desc: 'Flawless precision meets effortless velocity.' };
    if (accuracy >= 95 && wpm >= 60) return { title: 'Zen Mastery', desc: 'Calm mind, steady rhythm, exceptional accuracy.' };
    if (accuracy >= 90) return { title: 'Focused Presence', desc: 'Good consistency. Smooth rhythm creates sustainable speed.' };
    return { title: 'Mindful Practice', desc: 'Slow down slightly to let muscle memory crystallize.' };
  };

  const feedback = getFeedback();

  const getWeaknessBadgeColor = (type) => {
    switch (type) {
      case 'trigram':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'bigram':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'char':
      default:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Main Result Card */}
      <div className="p-8 md:p-10 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-2xl backdrop-blur-md">
        {/* Header feedback */}
        <div className="flex items-center justify-between border-b border-zinc-800/70 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 font-sans tracking-wide">
                {feedback.title}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">{feedback.desc}</p>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
              Passage
            </span>
            <p className="text-sm font-medium text-zinc-300 truncate max-w-[200px]">
              {passage?.title || 'Practice Text'}
            </p>
          </div>
        </div>

        {/* Hero Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Net WPM */}
          <div className="p-5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 flex flex-col">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-mono uppercase tracking-wider">Net WPM</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-4xl font-extrabold font-mono text-zinc-100 tracking-tight">
              {wpm}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 font-mono">
              Raw: {rawWpm} wpm
            </span>
          </div>

          {/* Accuracy */}
          <div className="p-5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 flex flex-col">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-mono uppercase tracking-wider">Accuracy</span>
              <Target className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-4xl font-extrabold font-mono text-zinc-100 tracking-tight">
              {accuracy}%
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 font-mono">
              {errorCount === 0 ? 'Flawless run' : `${errorCount} mistake${errorCount > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Time */}
          <div className="p-5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 flex flex-col">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-mono uppercase tracking-wider">Time</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-4xl font-extrabold font-mono text-zinc-100 tracking-tight">
              {seconds}s
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 font-mono">
              {Math.round((totalChars / Math.max(elapsedTimeMs / 1000, 1)) * 60)} cpm
            </span>
          </div>

          {/* Characters */}
          <div className="p-5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 flex flex-col">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-mono uppercase tracking-wider">Characters</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-4xl font-extrabold font-mono text-zinc-100 tracking-tight">
              {correctChars}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 font-mono">
              {totalChars} total chars
            </span>
          </div>
        </div>

        {/* Weakness Profile / Focus Spots Card */}
        {hasWeaknesses && (
          <div className="mb-8 p-5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                  Identified Focus Areas ({weaknesses.length})
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                AI Drill Ready
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {weaknesses.map((w, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${getWeaknessBadgeColor(
                    w.type
                  )}`}
                >
                  <span className="font-bold text-sm bg-black/30 px-1.5 py-0.5 rounded">
                    {w.token === ' ' ? '␣' : w.token}
                  </span>
                  <span className="text-[10px] uppercase opacity-75">
                    {w.type}
                  </span>
                  {w.errors > 0 ? (
                    <span className="text-rose-400 text-[11px] font-semibold">
                      {w.errors} err
                    </span>
                  ) : w.avgLatencyMs ? (
                    <span className="text-zinc-400 text-[11px]">
                      {w.avgLatencyMs}ms
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2.5">
              Clicking Next will generate a custom AI drill passage over-representing these patterns.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {hasWeaknesses ? (
            <button
              onClick={onNext}
              autoFocus
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-sm flex items-center justify-center gap-2 border border-emerald-500/20 transition-all cursor-pointer shadow-lg shadow-emerald-500/5"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Start AI Drill</span>
              <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono ml-1">
                Enter
              </kbd>
            </button>
          ) : (
            <button
              onClick={onNext}
              autoFocus
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 shadow-sm border border-white/5 transition-all cursor-pointer"
            >
              <span>Next Passage</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
              <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400 font-mono ml-1">
                Enter
              </kbd>
            </button>
          )}

          {hasWeaknesses && onNextStandard && (
            <button
              onClick={onNextStandard}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm flex items-center justify-center gap-2 border border-zinc-700/60 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Standard Passage</span>
            </button>
          )}

          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 border border-zinc-700/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Passage</span>
            <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono ml-1">
              Tab
            </kbd>
          </button>

          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 border border-zinc-800 transition-colors cursor-pointer"
              title="Open Progress & Telemetry Dashboard"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
