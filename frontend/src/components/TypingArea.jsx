import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { analyzeWeaknesses } from '../utils/weaknessAnalyzer';
import GhostRacer from './GhostRacer';
import { playKeystroke } from '../lib/audioEngine';

const ZEN_IDLE_TIMEOUT_MS = 2500;

export default function TypingArea({
  passage,
  onComplete,
  onRestart,
  onNearEnd,
  onTypingStateChange,
  isZenMode = false,
  settings,
  zenIdleDelay = ZEN_IDLE_TIMEOUT_MS
}) {
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
  const zenIdleTimerRef = useRef(null);
  const mountedRef = useRef(false);

  const targetText = passage?.content || '';

  const clearZenIdleTimer = useCallback(() => {
    if (zenIdleTimerRef.current) {
      clearTimeout(zenIdleTimerRef.current);
      zenIdleTimerRef.current = null;
    }
  }, []);

  const exitZenTyping = useCallback(() => {
    clearZenIdleTimer();
    if (mountedRef.current) {
      onTypingStateChange?.(false);
    }
  }, [clearZenIdleTimer, onTypingStateChange]);

  const refreshZenTyping = useCallback(() => {
    if (!mountedRef.current) return;

    clearZenIdleTimer();
    onTypingStateChange?.(true);
    zenIdleTimerRef.current = setTimeout(() => {
      zenIdleTimerRef.current = null;
      if (mountedRef.current) {
        onTypingStateChange?.(false);
      }
    }, Math.max(1000, Number(zenIdleDelay) || ZEN_IDLE_TIMEOUT_MS));
  }, [clearZenIdleTimer, onTypingStateChange, zenIdleDelay]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearZenIdleTimer();
    };
  }, [clearZenIdleTimer]);

  // Reset session
  const resetSession = useCallback(() => {
    exitZenTyping();
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
  }, [exitZenTyping]);

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
        refreshZenTyping();
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
      refreshZenTyping();
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

    refreshZenTyping();
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

    if (settings?.soundTheme && settings.soundTheme !== 'none') {
      playKeystroke(settings.soundTheme);
    }

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

      exitZenTyping();
      onComplete({
        wpm: finalWpm,
        rawWpm: finalRawWpm,
        accuracy: finalAccuracy,
        elapsedTimeMs: totalElapsedMs,
        totalChars: targetText.length,
        correctChars: finalCorrect,
        errorCount: totalErrors + (isCorrect ? 0 : 1),
        keystrokes: keystrokesRef.current,
        replay: keystrokesRef.current,
        weaknesses: weaknessProfile.topWeaknesses,
        weaknessSummary: weaknessProfile.summary,
        passage
      });
    } else if (onNearEnd && newTyped.length >= targetText.length - 150) {
      onNearEnd();
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
    <div className={`typing-shell${isZenMode ? ' is-zen-active' : ''}`}>
      {/* Hidden input to capture keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="absolute -top-[9999px] left-0 opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          exitZenTyping();
        }}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* Live Minimal HUD */}
      <div className="typing-hud">
        <div className="hud-metrics">
          {/* WPM Display */}
          <div className="hud-metric">
            <span className="hud-value is-primary">
              {liveWpm}
            </span>
            <span className="hud-label">
              WPM
            </span>
          </div>

          {/* Accuracy Display */}
          <div className="hud-metric">
            <span className="hud-value">
              {accuracy}%
            </span>
            <span className="hud-label">
              ACC
            </span>
          </div>

          {/* Time Display */}
          <div className="hud-metric">
            <span className="hud-value">
              {Math.floor(elapsedSeconds)}s
            </span>
            <span className="hud-label">
              TIME
            </span>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="progress-wrap">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${targetText.length > 0 ? (typed.length / targetText.length) * 100 : 0}%`
              }}
            />
          </div>
          <span className="progress-count">
            {typed.length}/{targetText.length}
          </span>
        </div>
      </div>

      <div
        className="typing-focus select-none focus:outline-none"
        onClick={() => inputRef.current?.focus()}
        tabIndex={-1}
      >
        {/* Unfocused Overlay Notice */}
        {!isFocused && (
          <div className="focus-overlay">
            <div className="focus-callout">
              <AlertCircle className="w-4 h-4" />
              Click or press any key to focus
            </div>
          </div>
        )}

        {/* Typing Canvas */}
        <div className="typing-surface">
          <div
            className="typing-copy"
            style={{
              fontSize: `${settings?.typingFontSize || 22}px`,
              lineHeight: settings?.lineHeight || 1.8
            }}
          >
          {words.map(({ chars, space, wordIndex }) => {
            const wordStart = chars[0]?.index ?? space?.index;
            const wordEnd = space?.index ?? chars[chars.length - 1]?.index;
            const isActiveWord = currentIndex >= wordStart && currentIndex <= wordEnd;
            return (
            <span key={wordIndex} className={`typing-word ${isActiveWord ? 'is-active' : ''}`}>
              {chars.map(({ char, index }) => {
                const isTyped = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isCorrect = isTyped && typed[index] === char;
                const isIncorrect = isTyped && typed[index] !== char;

                let charClass = 'char-pending';
                if (isCorrect) {
                  charClass = 'char-correct';
                  if (settings?.zenModeType === 'fade') charClass += ' opacity-0 transition-opacity duration-1000';
                } else if (isIncorrect) {
                  charClass = 'char-error';
                }

                if (!isTyped && settings?.zenModeType === 'blind') {
                  charClass += ' blur-sm opacity-20';
                }

                return (
                  <span key={index} className="relative inline-block">
                    {/* Caret before current char */}
                    {isCurrent && isFocused && (
                      <span className="typing-caret animate-caret" />
                    )}
                    <span className={charClass}>{char}</span>
                  </span>
                );
              })}

              {/* Space character after word */}
              {space && (
                <span key={space.index} className="relative inline-block">
                  {space.index === currentIndex && isFocused && (
                    <span className="typing-caret animate-caret" />
                  )}
                  {space.index < currentIndex ? (
                    typed[space.index] === ' ' ? (
                      <span className="char-space">&nbsp;</span>
                    ) : (
                      <span className="char-space is-error">
                        _
                      </span>
                    )
                  ) : (
                    <span className="char-space">&nbsp;</span>
                  )}
                </span>
              )}
              <span className="word-breathline" aria-hidden="true" />
            </span>
            );
          })}

          {/* Caret at very end of text if reached */}
          {currentIndex === targetText.length && isFocused && (
            <span className="typing-caret is-end animate-caret" />
          )}
          </div>
        </div>
      </div>

      {/* Ghost Racer Subtle Progress Line */}
      <GhostRacer
        key={settings?.ghostDefaultWpm || 65}
        targetText={targetText}
        userTypedLength={typed.length}
        userStartTime={startTime}
        isUserCompleted={Boolean(endTime || (targetText.length > 0 && typed.length === targetText.length))}
        userWpm={liveWpm}
        defaultSkillWpm={settings?.ghostDefaultWpm}
        isZenMode={isZenMode}
        className=""
      />

      {/* Subtle bottom control hint */}
      {!isZenMode && (
        <div className="typing-footer quiet-appear">
          <div className="typing-shortcuts">
            <span><kbd className="kbd">Tab</kbd> restart</span>
            <span><kbd className="kbd">Ctrl+Backspace</kbd> delete word</span>
          </div>
          <button
            onClick={resetSession}
            className="reset-button"
          >
            <RotateCcw className="w-3 h-3" />
            <span>reset</span>
          </button>
        </div>
      )}
    </div>
  );
}
