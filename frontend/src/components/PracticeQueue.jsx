import React from 'react';
import { ArrowRight, ListChecks, X } from 'lucide-react';
import { clearQueue, getQueue, removeQueueItem, useFlowLocalVersion } from '../lib/flowLocal';

export default function PracticeQueue({ onStart }) {
  useFlowLocalVersion();
  const queue = getQueue();
  if (!queue.length) return null;

  const next = queue[0];

  return (
    <section className="practice-queue" aria-labelledby="practice-queue-title">
      <div className="dashboard-section-head">
        <div>
          <h3 id="practice-queue-title" className="dashboard-section-title"><ListChecks className="w-4 h-4" />Adaptive practice queue</h3>
          <p className="dashboard-section-copy">Targeted patterns from your recent sessions, kept local and user-controlled.</p>
        </div>
        <button type="button" className="dashboard-refresh" onClick={clearQueue}><X className="w-4 h-4" />Clear queue</button>
      </div>
      <div className="queue-next">
        <div>
          <span className="queue-kicker">Next focus</span>
          <strong>{next.token === ' ' ? 'space rhythm' : next.token}</strong>
          <span>{next.type} · {next.errors || 0} errors{next.avgLatencyMs ? ` · ${next.avgLatencyMs}ms average` : ''}</span>
        </div>
        <div className="queue-next-actions">
          <button type="button" className="action-primary" onClick={() => { removeQueueItem(next.id); onStart?.(next); }}><span>Practice focus</span><ArrowRight className="w-4 h-4" /></button>
          <button type="button" className="action-tertiary" onClick={() => removeQueueItem(next.id)}><span>Skip</span><X className="w-4 h-4" /></button>
        </div>
      </div>
      {queue.length > 1 && <div className="queue-list" aria-label="Queued focus areas">
        {queue.slice(1, 5).map((item) => <div className="queue-row" key={item.id}><span>{item.token === ' ' ? 'space' : item.token}</span><small>{item.type}</small><button type="button" className="icon-button" onClick={() => removeQueueItem(item.id)} aria-label={`Skip ${item.token} focus`}><X className="w-4 h-4" /></button></div>)}
      </div>}
    </section>
  );
}
