import React, { useEffect } from 'react';
import { RotateCcw, ArrowRight, Zap, Target, Clock, CheckCircle2, Sparkles, Brain, Activity } from 'lucide-react';
import GoalProgress from './GoalProgress';
import PracticeQueue from './PracticeQueue';
import ReplayAnalysis from './ReplayAnalysis';

export default function SessionComplete({ stats, onRestart, onNext, onNextStandard, onViewDashboard, onStartQueueItem }) {
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

  return (
    <div className="completion-shell">
      {/* Main Result Card */}
      <div className="completion-card">
        {/* Header feedback */}
        <div className="completion-header">
          <div className="feedback-lockup">
            <div className="feedback-icon">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="feedback-title">
                {feedback.title}
              </h2>
              <p className="feedback-description">{feedback.desc}</p>
            </div>
          </div>

          <div className="completion-passage">
            <span className="completion-passage-label">
              Passage
            </span>
            <p className="completion-passage-title">
              {passage?.title || 'Practice Text'}
            </p>
          </div>
        </div>

        {/* Hero Metrics Row */}
        <div className="result-metrics">
          {/* Net WPM */}
          <div className="result-metric">
            <div className="result-label">
              <span>Net WPM</span>
              <Zap className="w-4 h-4" />
            </div>
            <div className="result-value">
              {wpm}
            </div>
            <span className="result-support">
              Raw: {rawWpm} wpm
            </span>
          </div>

          {/* Accuracy */}
          <div className="result-metric">
            <div className="result-label">
              <span>Accuracy</span>
              <Target className="w-4 h-4" />
            </div>
            <div className="result-value">
              {accuracy}%
            </div>
            <span className="result-support">
              {errorCount === 0 ? 'Flawless run' : `${errorCount} mistake${errorCount > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Time */}
          <div className="result-metric">
            <div className="result-label">
              <span>Time</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="result-value">
              {seconds}s
            </div>
            <span className="result-support">
              {Math.round((totalChars / Math.max(elapsedTimeMs / 1000, 1)) * 60)} cpm
            </span>
          </div>

          {/* Characters */}
          <div className="result-metric">
            <div className="result-label">
              <span>Characters</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="result-value">
              {correctChars}
            </div>
            <span className="result-support">
              {totalChars} total chars
            </span>
          </div>
        </div>

        {/* Weakness Profile / Focus Spots Card */}
        {hasWeaknesses && (
          <div className="weakness-panel">
            <div className="weakness-heading">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>
                  Identified Focus Areas ({weaknesses.length})
                </span>
              </div>
              <span>
                AI Drill Ready
              </span>
            </div>

            <div className="weakness-chips">
              {weaknesses.map((w, idx) => (
                <div
                  key={idx}
                  className="weakness-chip"
                >
                  <span className="weakness-chip-token">
                    {w.token === ' ' ? '␣' : w.token}
                  </span>
                  <span className="weakness-chip-type">
                    {w.type}
                  </span>
                  {w.errors > 0 ? (
                    <span className="weakness-chip-error">
                      {w.errors} err
                    </span>
                  ) : w.avgLatencyMs ? (
                    <span className="weakness-chip-type">
                      {w.avgLatencyMs}ms
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="weakness-note">
              Clicking Next will generate a custom AI drill passage over-representing these patterns.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="completion-actions">
          {hasWeaknesses ? (
            <button
              onClick={onNext}
              autoFocus
              className="action-primary"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start AI Drill</span>
              <kbd className="kbd hidden sm:inline-block">
                Enter
              </kbd>
            </button>
          ) : (
            <button
              onClick={onNext}
              autoFocus
              className="action-primary"
            >
              <span>Next Passage</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
              <kbd className="kbd hidden sm:inline-block">
                Enter
              </kbd>
            </button>
          )}

          {hasWeaknesses && onNextStandard && (
            <button
              onClick={onNextStandard}
            className="action-secondary"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Standard Passage</span>
            </button>
          )}

          <button
            onClick={onRestart}
            className="action-secondary"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Passage</span>
            <kbd className="kbd hidden sm:inline-block">
              Tab
            </kbd>
          </button>

          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="action-tertiary"
              title="Open Progress & Telemetry Dashboard"
            >
              <Activity className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          )}
        </div>

        <div className="completion-followup">
          <GoalProgress compact />
          <ReplayAnalysis replay={stats?.replay || stats?.keystrokes} />
          <PracticeQueue onStart={onStartQueueItem} />
        </div>
      </div>
    </div>
  );
}
