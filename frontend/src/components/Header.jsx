import React from 'react';
import { RotateCcw, SkipForward, Keyboard, Activity } from 'lucide-react';

export default function Header({
  currentView = 'type',
  setCurrentView,
  category,
  setCategory,
  difficulty,
  setDifficulty,
  onReset,
  onNext,
  isTyping
}) {
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'zen', label: 'Zen' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'code', label: 'Code' },
    { id: 'drill', label: 'Drills' },
  ];

  const difficulties = [
    { id: 'all', label: 'All' },
    { id: 'easy', label: 'Easy' },
    { id: 'medium', label: 'Medium' },
    { id: 'hard', label: 'Hard' },
  ];

  return (
    <header className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 py-6 border-b border-zinc-800/60 transition-opacity duration-300">
      {/* Brand Logo & View Switcher */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentView && setCurrentView('type')}
          className="flex items-center gap-3 cursor-pointer group text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shadow-inner group-hover:border-emerald-500/40 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-zinc-100 uppercase font-mono group-hover:text-emerald-300 transition-colors">
              FLOW
            </h1>
            <p className="text-[10px] text-zinc-500 tracking-wider font-mono">ZEN SPEED TYPING</p>
          </div>
        </button>

        {/* Primary View Switcher Navigation */}
        {setCurrentView && (
          <div className="flex items-center bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 text-xs font-mono ml-2">
            <button
              onClick={() => setCurrentView('type')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                currentView === 'type'
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Type</span>
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode Filters (Visible in Type mode) */}
      {currentView === 'type' ? (
        <div
          className={`flex flex-wrap items-center gap-2 transition-opacity duration-300 ${
            isTyping ? 'opacity-30 hover:opacity-100' : 'opacity-100'
          }`}
        >
          {/* Category Pills */}
          <div className="flex items-center bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/80 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  category === cat.id
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Difficulty Pills */}
          <div className="flex items-center bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/80 text-xs">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  difficulty === diff.id
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={onReset}
              title="Restart current passage (Tab)"
              className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNext}
              title="Next passage"
              className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs font-mono text-zinc-500">
          Neural Progress & Telemetry Center
        </div>
      )}
    </header>
  );
}
