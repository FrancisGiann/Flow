import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import PassageInfo from './components/PassageInfo';
import TypingArea from './components/TypingArea';
import SessionComplete from './components/SessionComplete';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import { useAuth } from './context/AuthContext';

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
  const [currentView, setCurrentView] = useState('type'); // 'type' | 'dashboard'
  const [passage, setPassage] = useState(null);
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);

  // Fetch passage from backend
  const fetchPassage = useCallback(async (cat = category, diff = difficulty) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat && cat !== 'all') params.append('category', cat);
      if (diff && diff !== 'all') params.append('difficulty', diff);
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/passage?${params.toString()}`, {
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
        return true;
      });
      const chosen = filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : FALLBACK_PASSAGES[0];
      setPassage(chosen);
    } finally {
      setLoading(false);
    }
  }, [category, difficulty, userId]);

  // Initial load
  useEffect(() => {
    fetchPassage('all', 'all');
  }, [fetchPassage]);

  // Filter change handlers
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setSessionStats(null);
    fetchPassage(newCat, difficulty);
  };

  const handleDifficultyChange = (newDiff) => {
    setDifficulty(newDiff);
    setSessionStats(null);
    fetchPassage(category, newDiff);
  };

  // Flow completion & telemetry recording
  const handleSessionComplete = (stats) => {
    setSessionStats(stats);
    setSessionCount(prev => prev + 1);

    // Asynchronously record session to backend
    fetch('/api/session', {
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
    setSessionStats(null);
    setCurrentView('type');
  };

  // Next passage handler: if weaknesses exist, generate AI drill
  const handleNext = async () => {
    const weaknesses = sessionStats?.weaknesses;
    setSessionStats(null);
    setCurrentView('type');

    if (weaknesses && weaknesses.length > 0) {
      setLoading(true);
      try {
        const response = await fetch('/api/drill', {
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
        console.warn('Could not generate AI drill, falling back to standard passage:', err);
      } finally {
        setLoading(false);
      }
    }

    // Fallback or default flow to standard passage
    fetchPassage(category, difficulty);
  };

  // Explicit next standard passage (skip drill)
  const handleNextStandard = () => {
    setSessionStats(null);
    setCurrentView('type');
    fetchPassage(category, difficulty);
  };

  // Launch AI drill for specific weaknesses directly from dashboard
  const handleStartDrill = async (targetWeaknesses = []) => {
    setLoading(true);
    setSessionStats(null);
    setCurrentView('type');

    try {
      const response = await fetch('/api/drill', {
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

    fetchPassage('drill', difficulty);
  };

  return (
    <div className="min-h-screen zen-bg text-[#c9cdd4] flex flex-col justify-between px-4 sm:px-8 py-6 selection:bg-zinc-800 selection:text-emerald-300">
      {/* Top Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        category={category}
        setCategory={handleCategoryChange}
        difficulty={difficulty}
        setDifficulty={handleDifficultyChange}
        onReset={handleRestart}
        onNext={handleNext}
        isTyping={Boolean(!sessionStats && passage && currentView === 'type')}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto py-8 w-full max-w-4xl mx-auto">
        {currentView === 'dashboard' ? (
          <Dashboard
            onStartTyping={() => setCurrentView('type')}
            onStartDrill={handleStartDrill}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-500 font-mono text-sm animate-pulse">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <span>Finding your rhythm...</span>
          </div>
        ) : sessionStats ? (
          <SessionComplete
            stats={sessionStats}
            onRestart={handleRestart}
            onNext={handleNext}
            onNextStandard={handleNextStandard}
            onViewDashboard={() => setCurrentView('dashboard')}
          />
        ) : passage ? (
          <div className="w-full flex flex-col">
            <PassageInfo passage={passage} isTyping={false} />
            <TypingArea
              key={`${passage.id || passage.title}-${sessionCount}`}
              passage={passage}
              onComplete={handleSessionComplete}
              onRestart={handleRestart}
            />
          </div>
        ) : null}
      </main>

      {/* Zen Footer */}
      <Footer />
    </div>
  );
}

