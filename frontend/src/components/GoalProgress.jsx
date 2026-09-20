import React from 'react';
import { Flame, Target } from 'lucide-react';
import { getGoalProgress, useFlowLocalVersion } from '../lib/flowLocal';

export default function GoalProgress({ compact = false }) {
  useFlowLocalVersion();
  const progress = getGoalProgress();
  const { goals } = progress;

  return (
    <section className={`goal-progress${compact ? ' is-compact' : ''}`} aria-labelledby={compact ? 'completion-goal-title' : 'goal-progress-title'}>
      <div className="goal-progress-head">
        <h3 id={compact ? 'completion-goal-title' : 'goal-progress-title'}><Target className="w-4 h-4" />Daily practice</h3>
        <span className="goal-streak"><Flame className="w-4 h-4" />{progress.streak} day streak</span>
      </div>
      <div className="goal-progress-row"><span>{progress.todayMinutes.toFixed(1)} / {goals.dailyMinutes} min</span><strong>{progress.minutesPercent}%</strong></div>
      <div className="goal-track" aria-label={`${progress.minutesPercent}% of daily practice goal`} role="img"><span style={{ width: `${progress.minutesPercent}%` }} /></div>
      {(goals.targetWpm || goals.targetAccuracy) && <p className="goal-note">{goals.targetWpm ? `${goals.targetWpm} WPM` : ''}{goals.targetWpm && goals.targetAccuracy ? ' · ' : ''}{goals.targetAccuracy ? `${goals.targetAccuracy}% accuracy` : ''} targets</p>}
    </section>
  );
}
