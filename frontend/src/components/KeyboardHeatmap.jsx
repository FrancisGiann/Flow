import React, { useMemo } from 'react';

const QWERTY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

export default function KeyboardHeatmap({ weaknesses = [] }) {
  // Aggregate weakness data per single character
  const heatMap = useMemo(() => {
    const map = {};
    weaknesses.forEach((w) => {
      const chars = w.token.split('');
      chars.forEach((char) => {
        const c = char.toLowerCase();
        if (!map[c]) {
          map[c] = { errors: 0, count: 0 };
        }
        map[c].errors += w.errors || 0;
        map[c].count += 1;
      });
    });
    return map;
  }, [weaknesses]);

  // Find max errors to normalize heat color
  const maxErrors = useMemo(() => {
    let max = 0;
    for (const key in heatMap) {
      if (heatMap[key].errors > max) {
        max = heatMap[key].errors;
      }
    }
    return max;
  }, [heatMap]);

  return (
    <div className="flex flex-col items-center gap-1.5 p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-xl my-6 overflow-hidden">
      {QWERTY_ROWS.map((row, rIdx) => (
        <div key={rIdx} className={`flex gap-1.5 ${rIdx === 1 ? 'ml-4' : rIdx === 2 ? 'ml-10' : ''}`}>
          {row.map((char) => {
            const data = heatMap[char];
            const hasErrors = data && data.errors > 0;
            const intensity = hasErrors ? data.errors / maxErrors : 0;
            
            // Color shifts from subtle to deep red based on error count
            const bgClass = hasErrors 
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
              : 'bg-zinc-800/40 text-zinc-500 border-zinc-700/50';

            return (
              <div 
                key={char} 
                className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md border text-xs sm:text-sm font-mono uppercase transition-colors ${bgClass}`}
                style={hasErrors ? { backgroundColor: `rgba(225, 29, 72, ${0.1 + intensity * 0.6})` } : {}}
                title={hasErrors ? `${char}: ${data.errors} errors` : char}
              >
                {char}
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-3 text-xs text-zinc-500 font-mono text-center max-w-sm">
        Heatmap displays individual key weaknesses extracted from your session data.
      </div>
    </div>
  );
}
