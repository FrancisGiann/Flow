import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="site-footer-shortcuts">
          <span><kbd className="kbd">Tab</kbd> restart</span>
          <span><kbd className="kbd">Enter</kbd> next passage</span>
        </div>
        <p className="text-zinc-500">
          Flow &mdash; Quiet mind, rapid fingers.
        </p>
      </div>
    </footer>
  );
}
