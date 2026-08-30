import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bot } from 'lucide-react';

const SPEED_PRESETS = [
  { label: 'Relaxed', wpm: 45 },
  { label: 'Flow', wpm: 65 },
  { label: 'Swift', wpm: 85 },
  { label: 'Master', wpm: 105 },
  { label: 'Blitz', wpm: 125 }
];

export default function GhostRacer({
  targetText = '',
  userTypedLength = 0,
  userStartTime = null,
  isUserCompleted = false,
  _userWpm = 0,
  defaultSkillWpm = 65,
  className = ''
}) {
  // Load persisted user settings
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('flow_ghost_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [targetWpm, setTargetWpm] = useState(() => {
    try {
      const saved = localStorage.getItem('flow_ghost_wpm');
      return saved ? Number(saved) : defaultSkillWpm;
    } catch {
      return defaultSkillWpm;
    }
  });

  const [ghostIndex, setGhostIndex] = useState(0);
  const [ghostState, setGhostState] = useState('idle'); // 'idle' | 'typing' | 'typo' | 'finished'
  const [ghostFinishTime, setGhostFinishTime] = useState(null);
  const [userFinishTime, setUserFinishTime] = useState(null);

  const ghostTimerRef = useRef(null);
  const ghostIndexRef = useRef(0);
  const isTypingRef = useRef(false);

  // Sync ref with effect
  useEffect(() => {
    ghostIndexRef.current = ghostIndex;
  }, [ghostIndex]);

  // Persist settings
  const toggleEnabled = () => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('flow_ghost_enabled', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const cycleSpeed = () => {
    const currentIdx = SPEED_PRESETS.findIndex((p) => p.wpm === targetWpm);
    const nextIdx = (currentIdx + 1) % SPEED_PRESETS.length;
    const nextWpm = SPEED_PRESETS[nextIdx].wpm;
    setTargetWpm(nextWpm);
    try {
      localStorage.setItem('flow_ghost_wpm', String(nextWpm));
    } catch {}
  };

  // Reset ghost when user resets or passage changes
  useEffect(() => {
    if (!userStartTime || userTypedLength === 0) {
      setGhostIndex(0);
      ghostIndexRef.current = 0;
      setGhostState('idle');
      setGhostFinishTime(null);
      setUserFinishTime(null);
      isTypingRef.current = false;
      if (ghostTimerRef.current) {
        clearTimeout(ghostTimerRef.current);
        ghostTimerRef.current = null;
      }
    }
  }, [userStartTime, userTypedLength, targetText]);

  // Track user finish time
  useEffect(() => {
    if (isUserCompleted && !userFinishTime) {
      setUserFinishTime(Date.now());
    }
  }, [isUserCompleted, userFinishTime]);

  // Simulated Opponent Typing Loop
  useEffect(() => {
    if (!isEnabled || !userStartTime || !targetText || targetText.length === 0) {
      return;
    }

    if (ghostIndex >= targetText.length) {
      if (ghostState !== 'finished') {
        setGhostState('finished');
        if (!ghostFinishTime) {
          setGhostFinishTime(Date.now());
        }
      }
      return;
    }

    isTypingRef.current = true;
    setGhostState('typing');

    const scheduleNextKeystroke = () => {
      if (!isTypingRef.current) return;

      const currentIndex = ghostIndexRef.current;
      if (currentIndex >= targetText.length) {
        setGhostState('finished');
        setGhostFinishTime(Date.now());
        return;
      }

      // Base timing calculation: chars per second = (WPM * 5) / 60
      // Base delay per character in ms = 12000 / targetWpm
      let baseDelay = 12000 / targetWpm;

      // 1. Reactive Pacing (Rubber-banding):
      // If user is pulling ahead, ghost speeds up to stay competitive.
      // If user is trailing significantly, ghost eases off slightly.
      const leadDelta = userTypedLength - currentIndex;
      let reactiveMultiplier = 1.0;
      if (leadDelta > 3) {
        // User is ahead: ghost speeds up by up to 22%
        reactiveMultiplier = Math.max(0.78, 1 - Math.min(leadDelta * 0.025, 0.22));
      } else if (leadDelta < -8) {
        // Ghost is far ahead: ease off slightly to keep user motivated
        reactiveMultiplier = 1.08;
      }

      // 2. Realistic Per-Character Timing Variance:
      // Real human keystroke latency follows a log-normal distribution
      // ±22% random Gaussian-like jitter
      const jitter = (Math.random() - 0.5) * 0.44;
      let charDelay = baseDelay * (1 + jitter) * reactiveMultiplier;

      // 3. Cognitive Pauses at Word Boundaries and Punctuation:
      const currentChar = targetText[currentIndex];
      if (currentChar === ' ') {
        charDelay += 35 + Math.random() * 45; // Space pause
      } else if (['.', ',', '!', '?', ';', ':'].includes(currentChar)) {
        charDelay += 55 + Math.random() * 70; // Punctuation pause
      }

      // Clamp delay to realistic human bounds (40ms to 450ms)
      charDelay = Math.max(40, Math.min(charDelay, 450));

      // 4. Occasional Simulated Typos & Self-Correction:
      // ~3% chance of typo per character
      const typoChance = 0.03;
      const willMakeTypo = Math.random() < typoChance && currentIndex < targetText.length - 2;

      if (willMakeTypo) {
        // Simulate typo sequence:
        // Type wrong char -> brief hesitation -> backspace -> type correct char
        const reactionDelay = 130 + Math.random() * 90;
        const backspaceDelay = 60 + Math.random() * 40;
        const retypeDelay = baseDelay * 0.9;

        ghostTimerRef.current = setTimeout(() => {
          if (!isTypingRef.current) return;
          setGhostState('typo');

          // Pause during error realization and backspacing
          ghostTimerRef.current = setTimeout(() => {
            if (!isTypingRef.current) return;

            ghostTimerRef.current = setTimeout(() => {
              if (!isTypingRef.current) return;

              // Successfully typed correct char after correction
              const nextIndex = ghostIndexRef.current + 1;
              ghostIndexRef.current = nextIndex;
              setGhostIndex(nextIndex);
              setGhostState('typing');

              // Schedule next char
              scheduleNextKeystroke();
            }, retypeDelay);
          }, backspaceDelay);
        }, reactionDelay);

        return;
      }

      // Standard keystroke progression
      ghostTimerRef.current = setTimeout(() => {
        if (!isTypingRef.current) return;
        const nextIndex = ghostIndexRef.current + 1;
        ghostIndexRef.current = nextIndex;
        setGhostIndex(nextIndex);

        if (nextIndex < targetText.length) {
          scheduleNextKeystroke();
        } else {
          setGhostState('finished');
          setGhostFinishTime(Date.now());
        }
      }, charDelay);
    };

    scheduleNextKeystroke();

    return () => {
      isTypingRef.current = false;
      if (ghostTimerRef.current) {
        clearTimeout(ghostTimerRef.current);
        ghostTimerRef.current = null;
      }
    };
  }, [isEnabled, userStartTime, targetWpm, targetText, userTypedLength]);

  // Compute race percentages
  const totalLength = targetText.length || 1;
  const userPercent = Math.min(100, Math.round((userTypedLength / totalLength) * 100));
  const ghostPercent = Math.min(100, Math.round((ghostIndex / totalLength) * 100));

  // Determine current lead/status
  const raceStatus = useMemo(() => {
    if (!isEnabled) return null;
    if (!userStartTime) {
      return { text: `Target: ${targetWpm} WPM`, type: 'neutral' };
    }

    if (isUserCompleted && ghostState === 'finished') {
      if (userFinishTime && ghostFinishTime) {
        const diffSec = ((ghostFinishTime - userFinishTime) / 1000).toFixed(1);
        if (userFinishTime < ghostFinishTime) {
          return { text: `⚡ Won by ${diffSec}s`, type: 'win' };
        } else {
          return { text: `Ghost ahead by ${Math.abs(diffSec)}s`, type: 'loss' };
        }
      }
      return { text: userPercent >= ghostPercent ? 'You finished first!' : 'Ghost finished first', type: 'win' };
    }

    if (isUserCompleted && ghostPercent < 100) {
      return { text: '⚡ You won!', type: 'win' };
    }

    if (ghostPercent >= 100 && !isUserCompleted) {
      return { text: 'Ghost finished', type: 'loss' };
    }

    const delta = userTypedLength - ghostIndex;
    if (delta > 2) {
      return { text: `+${delta} chars`, type: 'lead' };
    } else if (delta < -2) {
      return { text: `${delta} chars`, type: 'behind' };
    } else {
      return { text: 'Tied', type: 'neutral' };
    }
  }, [
    isEnabled,
    userStartTime,
    isUserCompleted,
    ghostState,
    userFinishTime,
    ghostFinishTime,
    userPercent,
    ghostPercent,
    userTypedLength,
    ghostIndex,
    targetWpm
  ]);

  if (!isEnabled) {
    return (
      <div className={`w-full flex items-center justify-between py-1 text-[11px] text-zinc-600 font-mono ${className}`}>
        <button
          onClick={toggleEnabled}
          className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors cursor-pointer"
          title="Enable subtle Ghost Racer opponent"
        >
          <Bot className="w-3.5 h-3.5 opacity-50" />
          <span>Ghost Racer: Off</span>
        </button>
      </div>
    );
  }

  const speedPreset = SPEED_PRESETS.find((p) => p.wpm === targetWpm) || { label: 'Custom', wpm: targetWpm };

  return (
    <div className={`w-full flex flex-col gap-1.5 select-none py-1 transition-opacity duration-200 ${className}`}>
      {/* Ghost Racer Header Status & Setting Pill */}
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          {/* Speed Preset Pill */}
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shadow-xs"
            title="Click to cycle Ghost difficulty"
          >
            <Bot className="w-3 h-3 text-cyan-400/80" />
            <span className="text-zinc-300 font-medium">Ghost</span>
            <span className="text-zinc-500">·</span>
            <span className="text-cyan-400 font-semibold">{targetWpm} WPM</span>
            <span className="text-[10px] text-zinc-500">({speedPreset.label})</span>
          </button>

          {/* Quick toggle button */}
          <button
            onClick={toggleEnabled}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors underline decoration-zinc-800"
            title="Disable Ghost Racer"
          >
            hide
          </button>
        </div>

        {/* Live Race Delta Status */}
        {raceStatus && (
          <div className="flex items-center gap-1.5">
            {raceStatus.type === 'win' && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                {raceStatus.text}
              </span>
            )}
            {raceStatus.type === 'lead' && (
              <span className="text-emerald-400/90 font-medium text-[11px]">
                {raceStatus.text}
              </span>
            )}
            {raceStatus.type === 'loss' && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px]">
                {raceStatus.text}
              </span>
            )}
            {raceStatus.type === 'behind' && (
              <span className="text-zinc-500 text-[11px]">
                {raceStatus.text}
              </span>
            )}
            {raceStatus.type === 'neutral' && (
              <span className="text-zinc-500 text-[10px]">
                {raceStatus.text}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle Zen Dual-Progress Track */}
      <div className="relative w-full h-1.5 bg-zinc-900/90 rounded-full border border-zinc-800/60 overflow-visible">
        {/* User Progress Fill (Subtle Emerald) */}
        <div
          className="absolute top-0 left-0 h-full bg-emerald-500/70 rounded-full transition-all duration-100 ease-out"
          style={{ width: `${userPercent}%` }}
        />

        {/* Ghost Marker Pip (Subtle Cyan Pip with soft glow) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400/80 shadow-[0_0_6px_rgba(34,211,238,0.6)] border border-cyan-200/40 pointer-events-none transition-all duration-150 ease-out"
          style={{ left: `${ghostPercent}%` }}
          title={`Ghost: ${ghostPercent}%`}
        />
      </div>
    </div>
  );
}
