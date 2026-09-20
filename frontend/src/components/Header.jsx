import React, { useEffect, useState } from 'react';
import { RotateCcw, SkipForward, Keyboard, Activity, Moon, Sun, Settings, Leaf, Stars, Flower2, Waves } from 'lucide-react';

export default function Header({
  currentView = 'type',
  setCurrentView,
  category,
  setCategory,
  difficulty,
  setDifficulty,
  onReset,
  onNext,
  onSettings
}) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const saved = window.localStorage.getItem('flow_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [hasExplicitTheme, setHasExplicitTheme] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = window.localStorage.getItem('flow_theme');
      return saved === 'light' || saved === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f1e8' : '#111715');
    if (hasExplicitTheme) {
      try {
        window.localStorage.setItem('flow_theme', theme);
      } catch {}
    }
  }, [theme, hasExplicitTheme]);

  const themes = ['light', 'dark', 'matcha', 'midnight', 'sakura', 'sand'];

  const toggleTheme = () => {
    setHasExplicitTheme(true);
    setTheme((current) => {
      const idx = themes.indexOf(current);
      return themes[(idx + 1) % themes.length];
    });
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'zen', label: 'Zen' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'code', label: 'Code' },
    { id: 'drill', label: 'Drills' },
    { id: 'infinite', label: 'Infinite' },
  ];

  const difficulties = [
    { id: 'all', label: 'All' },
    { id: 'easy', label: 'Easy' },
    { id: 'medium', label: 'Medium' },
    { id: 'hard', label: 'Hard' },
  ];

  return (
    <header className="app-header flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand Logo & View Switcher */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentView && setCurrentView('type')}
          className="brand-button flex items-center gap-3 cursor-pointer group text-left border-0 bg-transparent"
        >
          <img 
            src="/logo.jpg" 
            alt="Flow Logo" 
            className="w-8 h-8 rounded-lg shadow-sm border border-zinc-800/50 group-hover:border-emerald-500/50 transition-colors"
          />
          <div>
            <h1 className="brand-name uppercase font-mono group-hover:text-[var(--accent)] transition-colors">
              FLOW
            </h1>
            <p className="brand-tagline">ZEN SPEED TYPING</p>
          </div>
        </button>

        {/* Primary View Switcher Navigation */}
        {setCurrentView && (
          <div className="nav-switcher font-mono ml-2">
            <button
              onClick={() => setCurrentView('type')}
              className={`nav-link ${
                currentView === 'type'
                  ? 'is-active'
                  : ''
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Type</span>
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`nav-link ${
                currentView === 'dashboard'
                  ? 'is-active'
                  : ''
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
        <div className="header-actions flex flex-wrap items-center gap-2">
          {/* Category Pills */}
          <div className="filter-group">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`filter-button ${
                  category === cat.id
                    ? 'is-active'
                    : ''
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Difficulty Pills */}
          <div className="filter-group">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={`filter-button ${
                  difficulty === diff.id
                    ? 'is-active'
                    : ''
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
              aria-label="Restart current passage"
              className="icon-button"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              title="Next passage"
              aria-label="Next passage"
              className="icon-button"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="header-actions">
          <span className="brand-tagline">Progress &amp; telemetry</span>
        </div>
      )}

      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Switch theme"
        title={`Switch theme (Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)})`}
      >
        {theme === 'light' && <Sun className="w-4 h-4" />}
        {theme === 'dark' && <Moon className="w-4 h-4" />}
        {theme === 'matcha' && <Leaf className="w-4 h-4" />}
        {theme === 'midnight' && <Stars className="w-4 h-4" />}
        {theme === 'sakura' && <Flower2 className="w-4 h-4" />}
        {theme === 'sand' && <Waves className="w-4 h-4" />}
      </button>
      {onSettings && (
        <button
          type="button"
          className="icon-button"
          onClick={onSettings}
          aria-label="Open practice settings"
          title="Practice settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </header>
  );
}
