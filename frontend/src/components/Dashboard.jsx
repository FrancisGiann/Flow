import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Target,
  TrendingUp,
  Brain,
  ArrowRight,
  RefreshCw,
  Activity,
  History,
  Keyboard,
  ShieldCheck,
  Cloud,
  Mail,
  LogOut,
  LogIn,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ onStartTyping, onStartDrill }) {
  const { user, userId, isAnonymous, isConfigured, upgradeAccount, signInWithOtp, signOut } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [stats, setStats] = useState(null);
  const [narration, setNarration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingNarration, setRefreshingNarration] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Authentication UI state
  const [authMode, setAuthMode] = useState('idle'); // 'idle' | 'upgrade' | 'login'
  const [emailInput, setEmailInput] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  // Fetch all dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const uidParam = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const headers = userId ? { 'x-user-id': userId } : {};

      // 1. Fetch sessions
      const sessionsRes = await fetch(`/api/sessions${uidParam}`, { headers });
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : { sessions: [] };
      const loadedSessions = sessionsData.sessions || [];
      setSessions(loadedSessions);

      // 2. Fetch weaknesses
      const weaknessesRes = await fetch(`/api/weaknesses${uidParam}`, { headers });
      const weaknessesData = weaknessesRes.ok ? await weaknessesRes.json() : { weaknesses: [] };
      const loadedWeaknesses = weaknessesData.weaknesses || [];
      setWeaknesses(loadedWeaknesses);

      // 3. Fetch aggregated stats
      const statsRes = await fetch(`/api/stats${uidParam}`, { headers });
      const statsData = statsRes.ok ? await statsRes.json() : null;
      setStats(statsData);

      // 4. Fetch AI progress narration
      const narrationRes = await fetch(`/api/progress-narration${uidParam}`, { headers });
      const narrationData = narrationRes.ok ? await narrationRes.json() : null;
      setNarration(narrationData);
    } catch (err) {
      console.warn('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh AI narration explicitly
  const handleRefreshNarration = async () => {
    setRefreshingNarration(true);
    try {
      const uidParam = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const headers = userId ? { 'x-user-id': userId } : {};
      const response = await fetch(`/api/progress-narration${uidParam}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setNarration(data);
      }
    } catch (err) {
      console.warn('Failed to refresh AI narration:', err);
    } finally {
      setRefreshingNarration(false);
    }
  };

  // Handle anonymous account upgrade
  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setAuthMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (!isConfigured) {
      setAuthMessage({
        type: 'info',
        text: 'Supabase credentials are not configured yet in .env. Guest progress is stored locally.'
      });
      return;
    }

    setAuthSubmitting(true);
    setAuthMessage(null);

    try {
      const { error } = await upgradeAccount(emailInput.trim());
      if (error) {
        setAuthMessage({
          type: 'error',
          text: error.message || 'Failed to send confirmation link. Please verify your email and try again.'
        });
      } else {
        setAuthMessage({
          type: 'success',
          text: `Confirmation link sent to ${emailInput.trim()}! Click the link in your email to sync your stats across devices.`
        });
        setEmailInput('');
      }
    } catch (err) {
      setAuthMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred while saving your progress.'
      });
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Magic Link sign in for existing user or new device
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setAuthMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (!isConfigured) {
      setAuthMessage({
        type: 'info',
        text: 'Supabase credentials are not configured yet in .env. Guest progress is stored locally.'
      });
      return;
    }

    setAuthSubmitting(true);
    setAuthMessage(null);

    try {
      const { error } = await signInWithOtp(emailInput.trim());
      if (error) {
        setAuthMessage({
          type: 'error',
          text: error.message || 'Failed to send Magic Link. Please check the email and try again.'
        });
      } else {
        setAuthMessage({
          type: 'success',
          text: `Magic link sent to ${emailInput.trim()}! Check your inbox to sign in on this device.`
        });
        setEmailInput('');
      }
    } catch (err) {
      setAuthMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred while sending magic link.'
      });
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthMode('idle');
      setAuthMessage(null);
      loadDashboardData();
    } catch (err) {
      console.warn('Failed to sign out:', err);
    }
  };

  // Weakness type badge colors
  const getWeaknessBadgeColor = (type) => {
    switch (type) {
      case 'trigram':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'bigram':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'char':
      default:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
  };

  // Format total practice time
  const formatTime = (ms) => {
    if (!ms) return '0s';
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Format date nicely
  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  // Prepare chart coordinates from recent sessions (ordered chronologically oldest to newest for graph)
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    // Take up to 15 recent sessions, reverse so oldest is on left, newest on right
    const slice = [...sessions].slice(0, 15).reverse();
    return slice.map((s, idx) => ({
      index: idx,
      id: s.id,
      wpm: Number(s.wpm) || 0,
      rawWpm: Number(s.rawWpm) || 0,
      accuracy: Number(s.accuracy) || 100,
      title: s.passageTitle || 'Passage',
      mode: s.mode || 'passage',
      date: formatDate(s.createdAt)
    }));
  }, [sessions]);

  // Compute SVG polyline points for WPM
  const chartDimensions = { width: 680, height: 180, padding: 30 };
  const { polylinePoints, pointsList, minWpm, maxWpm } = useMemo(() => {
    if (chartData.length < 2) return { polylinePoints: '', pointsList: [], minWpm: 0, maxWpm: 100 };

    const wpms = chartData.map((d) => d.wpm);
    const rawMin = Math.min(...wpms);
    const rawMax = Math.max(...wpms);
    const min = Math.max(0, Math.floor(rawMin / 10) * 10 - 10);
    const max = Math.max(min + 20, Math.ceil(rawMax / 10) * 10 + 10);

    const usableWidth = chartDimensions.width - chartDimensions.padding * 2;
    const usableHeight = chartDimensions.height - chartDimensions.padding * 2;

    const points = chartData.map((d, i) => {
      const x = chartDimensions.padding + (i / (chartData.length - 1)) * usableWidth;
      const y = chartDimensions.height - chartDimensions.padding - ((d.wpm - min) / (max - min)) * usableHeight;
      return { x, y, data: d };
    });

    const polyString = points.map((p) => `${p.x},${p.y}`).join(' ');

    return {
      polylinePoints: polyString,
      pointsList: points,
      minWpm: min,
      maxWpm: max
    };
  }, [chartData, chartDimensions.width, chartDimensions.height, chartDimensions.padding]);

  if (loading && !stats) {
    return (
      <div className="w-full max-w-4xl mx-auto py-24 flex flex-col items-center justify-center gap-4 font-mono text-zinc-500">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        <p className="text-sm">Synthesizing telemetry & neural insights...</p>
      </div>
    );
  }

  const hasSessions = sessions && sessions.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-in fade-in duration-300 space-y-8">
      {/* Top Banner & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>PROGRESS & TELEMETRY</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time biometric typing flow, AI trend narration, and muscle memory stats.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartTyping}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
            <span>Resume Typing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Account / Cloud Sync Bar */}
      {!user?.email || isAnonymous ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 transition-all">
          {authMode === 'idle' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
              <div className="flex items-center gap-2 text-zinc-400">
                <Cloud className="w-4 h-4 text-emerald-400/80 shrink-0" />
                <span>Guest session active.</span>
                <button
                  onClick={() => {
                    setAuthMode('upgrade');
                    setAuthMessage(null);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/40 hover:decoration-emerald-400 transition-colors cursor-pointer font-medium"
                >
                  Save your progress — sync across devices
                </button>
              </div>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthMessage(null);
                }}
                className="text-zinc-500 hover:text-zinc-300 text-[11px] transition-colors cursor-pointer self-start sm:self-auto"
              >
                Log in to existing account
              </button>
            </div>
          )}

          {authMode === 'upgrade' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-300 flex items-center gap-1.5 font-medium">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  Save guest progress across devices (Magic Link)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('idle');
                    setAuthMessage(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleUpgradeSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your email to link account..."
                    required
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-700/70 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400 text-xs font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting || !emailInput.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {authSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Progress</span>
                </button>
              </form>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono text-zinc-500">
                <span>We'll send a passwordless link to preserve your typing history.</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthMessage(null);
                  }}
                  className="hover:text-zinc-300 cursor-pointer underline text-left sm:text-right"
                >
                  Switch to Log in
                </button>
              </div>
            </div>
          )}

          {authMode === 'login' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-300 flex items-center gap-1.5 font-medium">
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  Log in on this device (Magic Link)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('idle');
                    setAuthMessage(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleLoginSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your registered email..."
                    required
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-700/70 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting || !emailInput.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {authSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Send Magic Link</span>
                </button>
              </form>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono text-zinc-500">
                <span>A magic login link will be emailed to you immediately.</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('upgrade');
                    setAuthMessage(null);
                  }}
                  className="hover:text-zinc-300 cursor-pointer underline text-left sm:text-right"
                >
                  Need to link guest session?
                </button>
              </div>
            </div>
          )}

          {authMessage && (
            <div
              className={`mt-2.5 p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                authMessage.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                  : authMessage.type === 'info'
                  ? 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/50'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
              }`}
            >
              {authMessage.type === 'success' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : authMessage.type === 'info' ? (
                <Cloud className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span>{authMessage.text}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/70 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Signed in as <strong className="text-zinc-200 font-semibold">{user.email}</strong>
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-zinc-500 hover:text-zinc-300 text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Sign out on this device"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign out</span>
          </button>
        </div>
      )}

      {/* AI Progress Narration Hero Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950/80 border border-emerald-500/20 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                AI Progress Coach
              </span>
              {narration?.source && (
                <span className="text-[10px] text-zinc-500 ml-2 font-mono">
                  ({narration.source})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleRefreshNarration}
            disabled={refreshingNarration}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-mono border border-zinc-700/50 transition-colors cursor-pointer disabled:opacity-50"
            title="Regenerate AI progress insight"
          >
            <RefreshCw className={`w-3 h-3 ${refreshingNarration ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshingNarration ? 'Analyzing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* AI Headline */}
        <h3 className="text-xl md:text-2xl font-bold text-zinc-100 font-sans tracking-tight mb-3">
          {narration?.headline || 'Stepping into Flow'}
        </h3>

        {/* Plain Language Narration */}
        <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-sans mb-4">
          {narration?.narration ||
            'Complete a few typing passages to unlock deep neural feedback on your cadence, transition velocities, and keystroke consistency.'}
        </p>

        {/* Actionable Focus Box */}
        {narration?.focusRecommendation && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-emerald-200">Coach Tip:</strong> {narration.focusRecommendation}
              </span>
            </div>

            {weaknesses.length > 0 && onStartDrill && (
              <button
                onClick={() => onStartDrill(weaknesses)}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 font-mono text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3" />
                <span>Launch Target Drill</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* Total Sessions */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Sessions
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {stats?.totalSessions || sessions.length || 0}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Recorded</span>
        </div>

        {/* Average WPM */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Avg Speed
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.avgWpm || 0} <span className="text-xs font-normal text-zinc-500">WPM</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Overall pace</span>
        </div>

        {/* Peak WPM */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Peak Speed
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {stats?.peakWpm || 0} <span className="text-xs font-normal text-zinc-500">WPM</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Personal best</span>
        </div>

        {/* Accuracy */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Accuracy
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {stats?.avgAccuracy || 100}%
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Clean strike</span>
        </div>

        {/* Total Time */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Time Typed
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {formatTime(stats?.totalTimeMs)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">In flow</span>
        </div>

        {/* Characters Typed */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Characters
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {stats?.totalChars ? stats.totalChars.toLocaleString() : '0'}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Keystrokes</span>
        </div>
      </div>

      {/* Speed & Rhythm Progression Chart */}
      {hasSessions && chartData.length > 1 && (
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider">
                  Speed Progression (Last {chartData.length} Sessions)
                </h4>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Hover over data points to inspect individual session metrics.
              </p>
            </div>

            {selectedPoint && (
              <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center gap-3">
                <span className="text-emerald-400 font-bold">{selectedPoint.wpm} WPM</span>
                <span className="text-cyan-300">{selectedPoint.accuracy}% ACC</span>
                <span className="text-zinc-400 truncate max-w-[150px]">{selectedPoint.title}</span>
              </div>
            )}
          </div>

          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
              className="w-full h-44 text-zinc-500"
            >
              {/* Horizontal Grid lines */}
              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = chartDimensions.padding + pct * (chartDimensions.height - chartDimensions.padding * 2);
                const wpmLabel = Math.round(maxWpm - pct * (maxWpm - minWpm));
                return (
                  <g key={i}>
                    <line
                      x1={chartDimensions.padding}
                      y1={y}
                      x2={chartDimensions.width - chartDimensions.padding}
                      y2={y}
                      stroke="#27272a"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={chartDimensions.padding - 6}
                      y={y + 3}
                      fill="#71717a"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {wpmLabel}
                    </text>
                  </g>
                );
              })}

              {/* Gradient defs */}
              <defs>
                <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              {polylinePoints && (
                <polygon
                  points={`${chartDimensions.padding},${chartDimensions.height - chartDimensions.padding} ${polylinePoints} ${chartDimensions.width - chartDimensions.padding},${chartDimensions.height - chartDimensions.padding}`}
                  fill="url(#wpmGradient)"
                />
              )}

              {/* Polyline */}
              {polylinePoints && (
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {/* Data points */}
              {pointsList.map((pt, idx) => {
                const isSelected = selectedPoint?.id === pt.data.id;
                return (
                  <g
                    key={idx}
                    className="cursor-pointer group"
                    onMouseEnter={() => setSelectedPoint(pt.data)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 6 : 4}
                      className="fill-zinc-950 stroke-emerald-400 transition-all duration-150"
                      strokeWidth={isSelected ? '3' : '2'}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Weakness Matrix & Targeted AI Drills */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-purple-400" />
            <div>
              <h4 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider">
                Keystroke & Bigram Weakness Matrix
              </h4>
              <p className="text-xs text-zinc-500">
                Identified hesitation spots, miskeys, and high-latency keystroke transitions.
              </p>
            </div>
          </div>

          {weaknesses.length > 0 && onStartDrill && (
            <button
              onClick={() => onStartDrill(weaknesses)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Practice All Weak Spots</span>
            </button>
          )}
        </div>

        {weaknesses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {weaknesses.map((w, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${getWeaknessBadgeColor(
                  w.type
                )}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-mono font-bold text-base text-zinc-100 shadow-inner">
                    {w.token === ' ' ? '␣' : w.token}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-zinc-200 font-mono">
                        "{w.token === ' ' ? 'space' : w.token}"
                      </span>
                      <span className="text-[10px] uppercase opacity-75 font-mono">
                        ({w.type})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] mt-0.5 opacity-80 font-mono">
                      {w.errors > 0 && <span>{w.errors} errors</span>}
                      {w.avgLatencyMs > 0 && <span>{Math.round(w.avgLatencyMs)}ms latency</span>}
                    </div>
                  </div>
                </div>

                {onStartDrill && (
                  <button
                    onClick={() => onStartDrill([w])}
                    className="p-1.5 rounded-lg bg-black/30 hover:bg-black/60 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title={`Drill "${w.token}"`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-center flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400/80" />
            <p className="text-sm text-zinc-300 font-medium font-sans">
              No prominent weak spots detected yet!
            </p>
            <p className="text-xs text-zinc-500 max-w-md">
              As you practice more passages, Flow will automatically identify any hesitant key transitions and build custom AI drills.
            </p>
          </div>
        )}
      </div>

      {/* Session History Activity Table */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider">
              Recent Session History
            </h4>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {sessions.length} sessions logged
          </span>
        </div>

        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Passage</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Errors</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {sessions.slice(0, 15).map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-zinc-200 max-w-[200px] truncate">
                      {s.passageTitle || 'Zen Passage'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          s.mode === 'drill'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {s.mode || 'passage'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {s.wpm} <span className="text-zinc-500 font-normal">wpm</span>
                    </td>
                    <td className="py-3 px-3 text-zinc-300">
                      <span className={s.accuracy >= 98 ? 'text-cyan-300 font-semibold' : ''}>
                        {s.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {formatTime(s.elapsedTimeMs)}
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {s.errorCount === 0 ? (
                        <span className="text-emerald-400">0</span>
                      ) : (
                        <span className="text-rose-400">{s.errorCount}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-500">
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono">
            No typing sessions recorded yet. Complete a passage to view your telemetry logs!
          </div>
        )}
      </div>
    </div>
  );
}
