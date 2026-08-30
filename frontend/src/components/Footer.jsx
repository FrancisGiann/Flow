import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full max-w-4xl mx-auto py-8 text-center text-xs text-zinc-600 border-t border-zinc-900 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-zinc-500 font-mono text-[11px]">
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">Tab</kbd> restart</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">Enter</kbd> next passage</span>
        </div>
        <p className="text-zinc-500">
          Flow &mdash; Quiet mind, rapid fingers.
        </p>
      </div>
    </footer>
  );
}
