import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { analyzeWeaknesses } from '../utils/weaknessAnalyzer';
import GhostRacer from './GhostRacer';

export default function TypingArea({ passage, onComplete, onRestart }) {
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFocused, setIsFocused] = useState(true);
  const [totalErrors, setTotalErrors] = useState(0);
  
  // Keystrokes record for telemetry/weakness analysis
  const keystrokesRef = useRef([]);
  const lastKeyTimeRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const targetText = passage?.content || '';

  // Reset session
  const resetSession = useCallback(() => {
    setTyped('');
    setStartTime(null);
    setEndTime(null);
    setElapsedSeconds(0);
    setTotalErrors(0);
    keystrokesRef.current = [];
    lastKeyTimeRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle timer tick
  useEffect(() => {
    if (startTime && !endTime) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((Date.now() - startTime) / 1000);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, endTime]);

  // Focus input automatically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Compute live metrics
  const { liveWpm, accuracy } = useMemo(() => {
    let correct = 0;

    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === targetText[i]) {
        correct++;
      }
    }

    const timeInMinutes = Math.max(elapsedSeconds / 60, 0.008);
    const wpm = elapsedSeconds > 0.5 ? Math.max(0, Math.round((correct / 5) / timeInMinutes)) : 0;
    const acc = typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100;

    return {
      liveWpm: wpm,
      accuracy: acc
    };
  }, [typed, targetText, elapsedSeconds]);

  // Keystroke handler
  const handleKeyDown = (e) => {
    // Quick restart on Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      resetSession();
      if (onRestart) onRestart();
      return;
    }

    // Ignore modifier combinations (Ctrl, Alt, Meta) except Backspace
    if (e.ctrlKey || e.altKey || e.metaKey) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        // Delete previous word
        setTyped((prev) => {
          const trimmed = prev.trimEnd();
          const lastSpace = trimmed.lastIndexOf(' ');
          return lastSpace === -1 ? '' : trimmed.slice(0, lastSpace + 1);
        });
      }
      return;
    }

    // Handle Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      setTyped((prev) => prev.slice(0, -1));
      return;
    }

    // Only process single printable characters
    if (e.key.length !== 1) {
      return;
    }

    e.preventDefault();

    const char = e.key;
    const currentIndex = typed.length;

    // Do not exceed target text length
    if (currentIndex >= targetText.length) {
      return;
    }

    const expectedChar = targetText[currentIndex];
    const isCorrect = char === expectedChar;
    const now = Date.now();

    // Start timer on first keystroke
    let activeStartTime = startTime;
    if (!startTime) {
      activeStartTime = now;
      setStartTime(now);
      lastKeyTimeRef.current = now;
    }

    const latency = lastKeyTimeRef.current ? now - lastKeyTimeRef.current : 0;
    lastKeyTimeRef.current = now;

    if (!isCorrect) {
      setTotalErrors((prev) => prev + 1);
    }

    // Record telemetry keystroke
    keystrokesRef.current.push({
      char,
      expected: expectedChar,
      isCorrect,
      timestamp: now,
      latency
    });

    const newTyped = typed + char;
    setTyped(newTyped);

    // Check for completion
    if (newTyped.length === targetText.length) {
      const finalEndTime = now;
      setEndTime(finalEndTime);
      const totalElapsedMs = finalEndTime - activeStartTime;
      const totalElapsedSec = totalElapsedMs / 1000;
      const finalMinutes = Math.max(totalElapsedSec / 60, 0.008);

      let finalCorrect = 0;
      for (let i = 0; i < newTyped.length; i++) {
        if (newTyped[i] === targetText[i]) finalCorrect++;
      }

      const finalWpm = Math.round((finalCorrect / 5) / finalMinutes);
      const finalRawWpm = Math.round((newTyped.length / 5) / finalMinutes);
      const finalAccuracy = Math.round((finalCorrect / newTyped.length) * 100);

      // Compute weakness analysis profile
      const weaknessProfile = analyzeWeaknesses(keystrokesRef.current, targetText);

      onComplete({
        wpm: finalWpm,
        rawWpm: finalRawWpm,
        accuracy: finalAccuracy,
        elapsedTimeMs: totalElapsedMs,
        totalChars: targetText.length,
        correctChars: finalCorrect,
        errorCount: totalErrors + (isCorrect ? 0 : 1),
        keystrokes: keystrokesRef.current,
        weaknesses: weaknessProfile.topWeaknesses,
        weaknessSummary: weaknessProfile.summary,
        passage
      });
    }
  };

  // Split target text into words with character indices
  const words = useMemo(() => {
    const wordList = [];
    let globalIndex = 0;

    const rawWords = targetText.split(' ');
    rawWords.forEach((word, wIdx) => {
      const chars = [];
      for (let i = 0; i < word.length; i++) {
        chars.push({
          char: word[i],
          index: globalIndex
        });
        globalIndex++;
      }

      // Add space if not the last word
      let space = null;
      if (wIdx < rawWords.length - 1) {
        space = {
          char: ' ',
          index: globalIndex
        };
        globalIndex++;
      }

      wordList.push({ chars, space, wordIndex: wIdx });
    });

    return wordList;
  }, [targetText]);

  const currentIndex = typed.length;

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      {/* Hidden input to capture keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="absolute -top-[9999px] left-0 opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* Live Minimal HUD */}
      <div className="flex items-center justify-between px-2 mb-6 text-sm">
        <div className="flex items-center gap-6">
          {/* WPM Display */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-zinc-100 tracking-tight">
              {liveWpm}
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              WPM
            </span>
          </div>

          {/* Accuracy Display */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono font-medium text-zinc-300">
              {accuracy}%
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              ACC
            </span>
          </div>

          {/* Time Display */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono font-medium text-zinc-300">
              {Math.floor(elapsedSeconds)}s
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              TIME
            </span>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400/80 transition-all duration-150 rounded-full"
              style={{
                width: `${targetText.length > 0 ? (typed.length / targetText.length) * 100 : 0}%`
              }}
            />
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {typed.length}/{targetText.length}
          </span>
        </div>
      </div>

      <div 
        className="relative select-none focus:outline-none"
        onClick={() => inputRef.current?.focus()}
        tabIndex={-1}
      >
        {/* Unfocused Overlay Notice */}
        {!isFocused && (
          <div className="absolute inset-0 z-20 backdrop-blur-[2px] bg-black/40 flex items-center justify-center rounded-2xl cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 text-zinc-300 text-sm font-medium shadow-xl">
              <AlertCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
              Click or press any key to focus
            </div>
          </div>
        )}

        {/* Typing Canvas */}
        <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 shadow-2xl backdrop-blur-sm min-h-[180px] flex flex-wrap content-start leading-relaxed text-2xl font-mono tracking-wide">
          {words.map(({ chars, space, wordIndex }) => (
            <div key={wordIndex} className="inline-flex items-center whitespace-nowrap mr-3 my-1">
              {chars.map(({ char, index }) => {
                const isTyped = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isCorrect = isTyped && typed[index] === char;
                const isIncorrect = isTyped && typed[index] !== char;

                let charClass = 'text-zinc-600 transition-colors duration-75';
                if (isCorrect) {
                  charClass = 'text-zinc-100 font-medium';
                } else if (isIncorrect) {
                  charClass = 'text-rose-400 bg-rose-500/10 rounded-xs border-b border-rose-500/60';
                }

                return (
                  <span key={index} className="relative inline-block">
                    {/* Caret before current char */}
                    {isCurrent && isFocused && (
                      <span className="absolute -left-[1.5px] top-[10%] bottom-[10%] w-[2.5px] bg-emerald-400 rounded-full animate-caret shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10 pointer-events-none" />
                    )}
                    <span className={charClass}>{char}</span>
                  </span>
                );
              })}

              {/* Space character after word */}
              {space && (
                <span key={space.index} className="relative inline-block">
                  {space.index === currentIndex && isFocused && (
                    <span className="absolute -left-[1.5px] top-[10%] bottom-[10%] w-[2.5px] bg-emerald-400 rounded-full animate-caret shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10 pointer-events-none" />
                  )}
                  {space.index < currentIndex ? (
                    typed[space.index] === ' ' ? (
                      <span className="text-zinc-600">&nbsp;</span>
                    ) : (
                      <span className="text-rose-400 bg-rose-500/20 underline decoration-rose-500 rounded-xs">
                        _
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-700">&nbsp;</span>
                  )}
                </span>
              )}
            </div>
          ))}

          {/* Caret at very end of text if reached */}
          {currentIndex === targetText.length && isFocused && (
            <span className="inline-block w-[2.5px] h-7 bg-emerald-400 rounded-full animate-caret shadow-[0_0_8px_rgba(52,211,153,0.8)] my-1 align-middle" />
          )}
        </div>
      </div>

      {/* Ghost Racer Subtle Progress Line */}
      <GhostRacer
        targetText={targetText}
        userTypedLength={typed.length}
        userStartTime={startTime}
        isUserCompleted={Boolean(endTime || (targetText.length > 0 && typed.length === targetText.length))}
        userWpm={liveWpm}
        className="mt-4 px-1"
      />

      {/* Subtle bottom control hint */}
      <div className="flex items-center justify-between mt-3 px-2 text-xs text-zinc-500 font-mono">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">Tab</kbd> restart</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">Ctrl+Backspace</kbd> delete word</span>
        </div>
        <button
          onClick={resetSession}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>reset</span>
        </button>
      </div>
    </div>
  );
}
