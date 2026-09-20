import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import PassageInfo from './components/PassageInfo';
import TypingArea from './components/TypingArea';
import SessionComplete from './components/SessionComplete';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import SettingsPanel from './components/SettingsPanel';
import { useAuth } from './context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';
import {
  addQueueItems,
  deleteCustomPassage,
  getCustomPassages,
  getGoals,
  getSettings,
  makeLocalDrill,
  recordSession,
  resetSettings,
  saveCustomPassage,
  saveGoals,
  saveSettings,
  useFlowLocalVersion
} from './lib/flowLocal';

// Fallback passages in case backend is unreachable during dev
const FALLBACK_PASSAGES = [
  {
    id: 1,
    title: "The State of Flow",
    category: "zen",
    difficulty: "medium",
    source: "Mihaly Csikszentmihalyi",
    content: "The best moments in our lives are not the passive, receptive, relaxing times. The best moments usually occur if a person's body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile."
  },
  {
    id: 2,
    title: "Be Like Water",
    category: "zen",
    difficulty: "easy",
    source: "Bruce Lee",
    content: "Empty your mind, be formless, shapeless, like water. If you put water into a cup, it becomes the cup. You put water into a bottle and it becomes the bottle. You put it in a teapot, it becomes the teapot. Now, water can flow or it can crash. Be water, my friend."
  },
  {
    id: 3,
    title: "Drill: Fluid Transitions (th, ing)",
    category: "drill",
    difficulty: "medium",
    source: "Flow Drill Bank",
    focus: ["th", "the", "ing"],
    content: "Thinking clearly brings thrilling insights. Through everything we do, breathing deeply and practicing thoughtfully strengthens our rhythm and inner stillness."
  }
];

export default function App() {
  const { userId } = useAuth();
  useFlowLocalVersion();
  const settings = getSettings();
  const goals = getGoals();
  const customPassages = getCustomPassages();
  const settingsRef = useRef(settings);
  const [currentView, setCurrentView] = useState('type'); // 'type' | 'dashboard'
  const [passage, setPassage] = useState(null);
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [isZenTyping, setIsZenTyping] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const handleViewChange = useCallback((view) => {
    setIsZenTyping(false);
    setCurrentView(view);
  }, []);

  // Fetch passage from backend
  const fetchPassage = useCallback(async (cat = 'all', diff = 'all') => {
    setIsZenTyping(false);
    setLoading(true);
    const activeSettings = settingsRef.current;
    try {
      const params = new URLSearchParams();
      if (cat && cat !== 'all') params.append('category', cat);
      if (diff && diff !== 'all') params.append('difficulty', diff);
      if (activeSettings.passageLength !== 'any') params.append('length', activeSettings.passageLength);
      if (userId) params.append('userId', userId);

      const response = await fetch(`${API_BASE}/api/passage?${params.toString()}`, {
        headers: userId ? { 'x-user-id': userId } : {}
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.passage) {
        setPassage(data.passage);
      } else {
        throw new Error('No passage returned');
      }
    } catch (err) {
      console.warn('Could not fetch from backend API, using fallback passage:', err);
      // Fallback selection
      const filtered = FALLBACK_PASSAGES.filter(p => {
        if (cat !== 'all' && p.category !== cat) return false;
        if (diff !== 'all' && p.difficulty !== diff) return false;
        if (activeSettings.passageLength === 'short' && p.content.length >= 350) return false;
        if (activeSettings.passageLength === 'medium' && (p.content.length < 350 || p.content.length >= 800)) return false;
        if (activeSettings.passageLength === 'long' && p.content.length < 800) return false;
        return true;
      });
      const chosen = filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : FALLBACK_PASSAGES[0];
      setPassage(chosen);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    fetchPassage('all', 'all');
  }, [fetchPassage]);

  // Filter change handlers
  const handleCategoryChange = (newCat) => {
    setIsZenTyping(false);
    setCategory(newCat);
    setSessionStats(null);
    fetchPassage(newCat, difficulty);
  };

  const handleDifficultyChange = (newDiff) => {
    setIsZenTyping(false);
    setDifficulty(newDiff);
    setSessionStats(null);
    fetchPassage(category, newDiff);
  };

  // Flow completion & telemetry recording
  const handleSessionComplete = (stats) => {
    setIsZenTyping(false);
    setSessionStats(stats);
    setSessionCount(prev => prev + 1);
    recordSession({
      ...stats,
      replay: stats.replay || stats.keystrokes,
      passageTitle: stats.passage?.title,
      mode: stats.passage?.category === 'drill' ? 'drill' : 'passage'
    });
    addQueueItems(stats.weaknesses);

    // Asynchronously record session to backend
    fetch(`${API_BASE}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {})
      },
      body: JSON.stringify({
        userId,
        passageId: stats.passage?.id,
        passageTitle: stats.passage?.title,
        passageContent: stats.passage?.content,
        wpm: stats.wpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.accuracy,
        elapsedTimeMs: stats.elapsedTimeMs,
        totalChars: stats.totalChars,
        correctChars: stats.correctChars,
        errorCount: stats.errorCount,
        mode: stats.passage?.category === 'drill' ? 'drill' : 'passage',
        keystrokes: stats.keystrokes,
        weaknesses: stats.weaknesses
      })
    }).catch(err => {
      console.warn('[Session Sync] Could not save session to backend:', err.message);
    });
  };

  // Restart current passage
  const handleRestart = () => {
    setIsZenTyping(false);
    setSessionStats(null);
    setCurrentView('type');
  };

  // Next passage handler: if weaknesses exist, generate AI drill
  const handleNext = async () => {
    setIsZenTyping(false);
    const weaknesses = sessionStats?.weaknesses;
    setSessionStats(null);
    setCurrentView('type');

    if (weaknesses && weaknesses.length > 0) {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/drill`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'x-user-id': userId } : {})
          },
          body: JSON.stringify({ userId, weaknesses })
        });

        if (!response.ok) {
          throw new Error(`Drill API returned status ${response.status}`);
        }

        const data = await response.json();
        if (data.passage) {
          setPassage(data.passage);
          return;
        }
      } catch (err) {
        console.warn('Could not generate AI drill, falling back to a local targeted drill:', err);
      } finally {
        setLoading(false);
      }
    }

    if (weaknesses && weaknesses.length > 0) {
      setPassage(makeLocalDrill(weaknesses));
      setLoading(false);
      return;
    }

    // Default flow to a standard passage
    fetchPassage(category, difficulty);
  };

  // Explicit next standard passage (skip drill)
  const handleNextStandard = () => {
    setIsZenTyping(false);
    setSessionStats(null);
    setCurrentView('type');
    fetchPassage(category, difficulty);
  };

  // Launch AI drill for specific weaknesses directly from dashboard
  const handleStartDrill = async (targetWeaknesses = []) => {
    setIsZenTyping(false);
    setLoading(true);
    setSessionStats(null);
    setCurrentView('type');

    try {
      const response = await fetch(`${API_BASE}/api/drill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify({ userId, weaknesses: targetWeaknesses })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.passage) {
          setPassage(data.passage);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load target drill from dashboard:', err);
    } finally {
      setLoading(false);
    }

    setPassage(makeLocalDrill(targetWeaknesses));
    setLoading(false);
  };

  const handleSelectCustomPassage = (customPassage) => {
    setIsZenTyping(false);
    setSessionStats(null);
    setLoading(false);
    setPassage(customPassage);
    setSessionCount((count) => count + 1);
    setCurrentView('type');
    setSettingsOpen(false);
  };

  const handleSaveCustomPassage = (customPassage) => {
    saveCustomPassage(customPassage);
  };

  const handleDeleteCustomPassage = (id) => {
    deleteCustomPassage(id);
  };

  const handleSaveSettings = (nextSettings) => saveSettings(nextSettings);
  const handleSaveGoals = (nextGoals) => saveGoals(nextGoals);
  const handleResetSettings = () => resetSettings();

  const zenTypingActive = isZenTyping && currentView === 'type' && !loading && !sessionStats && Boolean(passage);

  return (
    <div className="app-shell flex flex-col justify-between">
      {/* Top Header */}
      <div
        className={`chrome-bar${zenTypingActive ? ' is-zen-hidden' : ''}`}
        aria-hidden={zenTypingActive}
        inert={zenTypingActive ? true : undefined}
      >
        <Header
          currentView={currentView}
          setCurrentView={handleViewChange}
          category={category}
          setCategory={handleCategoryChange}
          difficulty={difficulty}
          setDifficulty={handleDifficultyChange}
          onReset={handleRestart}
          onNext={handleNext}
          onSettings={() => setSettingsOpen(true)}
        />
      </div>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          goals={goals}
          customPassages={customPassages}
          onSaveSettings={handleSaveSettings}
          onSaveGoals={handleSaveGoals}
          onResetSettings={handleResetSettings}
          onSavePassage={handleSaveCustomPassage}
          onDeletePassage={handleDeleteCustomPassage}
          onSelectPassage={handleSelectCustomPassage}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="app-main flex-1 flex flex-col items-center">
        {currentView === 'dashboard' ? (
          <Dashboard
            onStartTyping={() => handleViewChange('type')}
            onStartDrill={handleStartDrill}
          />
        ) : loading ? (
          <div className="loading-state">
            <span>Finding your rhythm...</span>
          </div>
        ) : sessionStats ? (
          <SessionComplete
            stats={sessionStats}
            onRestart={handleRestart}
            onNext={handleNext}
            onNextStandard={handleNextStandard}
            onViewDashboard={() => handleViewChange('dashboard')}
            onStartQueueItem={(item) => handleStartDrill([item])}
          />
        ) : passage ? (
          <div className="typing-view">
            {!zenTypingActive && <PassageInfo passage={passage} />}
            <TypingArea
              key={`${passage.id || passage.title}-${sessionCount}`}
              passage={passage}
              onComplete={handleSessionComplete}
              onRestart={handleRestart}
              onTypingStateChange={setIsZenTyping}
              isZenMode={zenTypingActive}
              settings={settings}
              zenIdleDelay={settings.zenIdleDelay}
            />
          </div>
        ) : null}
      </main>

      {/* Zen Footer */}
      <div
        className={`chrome-bar${zenTypingActive ? ' is-zen-hidden' : ''}`}
        aria-hidden={zenTypingActive}
        inert={zenTypingActive ? true : undefined}
      >
        <Footer />
      </div>
    </div>
  );
}
