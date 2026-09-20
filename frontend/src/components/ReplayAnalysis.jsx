import React, { useMemo, useState } from 'react';
import { AlertCircle, Clock3, Play } from 'lucide-react';

export default function ReplayAnalysis({ replay = [] }) {
  const [selectedSegment, setSelectedSegment] = useState(0);
  const events = useMemo(() => (Array.isArray(replay) ? replay : []), [replay]);

  const analysis = useMemo(() => {
    if (!events.length) return { segments: [], medianLatency: 0, pauses: [], errors: 0 };
    const sortedLatencies = events.map((event) => Number(event.latency) || 0).filter(Boolean).sort((a, b) => a - b);
    const medianLatency = sortedLatencies[Math.floor(sortedLatencies.length / 2)] || 0;
    const pauseThreshold = Math.max(700, medianLatency * 2.2);
    const segmentSize = Math.max(1, Math.ceil(events.length / 8));
    const segments = [];
    for (let index = 0; index < events.length; index += segmentSize) {
      const slice = events.slice(index, index + segmentSize);
      const pauses = slice.filter((event) => (Number(event.latency) || 0) >= pauseThreshold).length;
      const errors = slice.filter((event) => event.isCorrect === false).length;
      const average = Math.round(slice.reduce((sum, event) => sum + (Number(event.latency) || 0), 0) / slice.length);
      segments.push({ index: segments.length, start: index + 1, end: index + slice.length, average, pauses, errors, text: slice.map((event) => event.char || '').join('') });
    }
    return { segments, medianLatency, pauses: events.filter((event) => (Number(event.latency) || 0) >= pauseThreshold).slice(0, 3), errors: events.filter((event) => event.isCorrect === false).length };
  }, [events]);

  if (!events.length) {
    return <section className="replay-panel" aria-labelledby="replay-title"><div className="dashboard-section-head"><div><h3 id="replay-title" className="dashboard-section-title"><Play className="w-4 h-4" />Replay analysis</h3><p className="dashboard-section-copy">No keystroke replay was recorded for this run.</p></div></div></section>;
  }

  const selected = analysis.segments[selectedSegment] || analysis.segments[0];

  return (
    <section className="replay-panel" aria-labelledby="replay-title">
      <div className="dashboard-section-head">
        <div><h3 id="replay-title" className="dashboard-section-title"><Play className="w-4 h-4" />Replay analysis</h3><p className="dashboard-section-copy">Select a passage segment to inspect pauses and errors beyond the final score.</p></div>
        <span className="replay-summary">{analysis.errors} errors · median {analysis.medianLatency || 0}ms</span>
      </div>
      <div className="replay-legend"><span><i className="replay-key replay-key-normal" />steady</span><span><i className="replay-key replay-key-pause" />pause</span><span><i className="replay-key replay-key-error" />error</span></div>
      <div className="replay-segments" aria-label="Replay passage segments">
        {analysis.segments.map((segment) => <button type="button" key={segment.index} className={`replay-segment ${segment.index === selected.index ? 'is-selected' : ''} ${segment.errors ? 'has-error' : ''} ${segment.pauses ? 'has-pause' : ''}`} onClick={() => setSelectedSegment(segment.index)} aria-label={`Segment ${segment.index + 1}, characters ${segment.start} to ${segment.end}, ${segment.errors} errors, ${segment.pauses} pauses`}><span>{segment.index + 1}</span></button>)}
      </div>
      <div className="replay-detail"><strong>Chars {selected.start}–{selected.end}</strong><code>{selected.text || '·'}</code><span><Clock3 className="w-4 h-4" />{selected.average}ms average</span>{selected.pauses > 0 && <span className="replay-callout pause"><Clock3 className="w-4 h-4" />{selected.pauses} pronounced pause{selected.pauses === 1 ? '' : 's'}</span>}{selected.errors > 0 && <span className="replay-callout error"><AlertCircle className="w-4 h-4" />{selected.errors} mistyped character{selected.errors === 1 ? '' : 's'}</span>}</div>
    </section>
  );
}
