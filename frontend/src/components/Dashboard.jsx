import React, { useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
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
import { addQueueItems } from '../lib/flowLocal';
import GoalProgress from './GoalProgress';
import PracticeQueue from './PracticeQueue';
import KeyboardHeatmap from './KeyboardHeatmap';

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
      const sessionsRes = await fetch(`${API_BASE}/api/sessions${uidParam}`, { headers });
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : { sessions: [] };
      const loadedSessions = sessionsData.sessions || [];
      setSessions(loadedSessions);

      // 2. Fetch weaknesses
      const weaknessesRes = await fetch(`${API_BASE}/api/weaknesses${uidParam}`, { headers });
      const weaknessesData = weaknessesRes.ok ? await weaknessesRes.json() : { weaknesses: [] };
      const loadedWeaknesses = weaknessesData.weaknesses || [];
      setWeaknesses(loadedWeaknesses);
      addQueueItems(loadedWeaknesses);

      // 3. Fetch aggregated stats
      const statsRes = await fetch(`${API_BASE}/api/stats${uidParam}`, { headers });
      const statsData = statsRes.ok ? await statsRes.json() : null;
      setStats(statsData);

      // 4. Fetch AI progress narration
      const narrationRes = await fetch(`${API_BASE}/api/progress-narration${uidParam}`, { headers });
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
      const response = await fetch(`${API_BASE}/api/progress-narration${uidParam}`, { headers });
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
      <div className="loading-state">
        <p className="text-sm">Synthesizing telemetry & neural insights...</p>
      </div>
    );
  }

  const hasSessions = sessions && sessions.length > 0;

  return (
    <div className="dashboard">
      {/* Top Banner & Quick Navigation */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-heading">
            <Activity className="w-6 h-6" />
            <span>PROGRESS & TELEMETRY</span>
          </h2>
          <p className="dashboard-subtitle">
            Real-time biometric typing flow, AI trend narration, and muscle memory stats.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartTyping}
            className="action-primary"
          >
            <Keyboard className="w-4 h-4" />
            <span>Resume Typing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Account / Cloud Sync Bar */}
      {!user?.email || isAnonymous ? (
        <div className="dashboard-account">
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
                className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors cursor-pointer self-start sm:self-auto"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono text-zinc-500">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono text-zinc-500">
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
            <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>
              Signed in as <strong className="text-zinc-200 font-semibold">{user.email}</strong>
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Sign out on this device"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign out</span>
          </button>
        </div>
      )}

      <div className="dashboard-practice-tools">
        <GoalProgress />
        <PracticeQueue onStart={(item) => onStartDrill?.([item])} />
      </div>

      <div className="dashboard-overview-grid">
      {/* AI Progress Narration Hero */}
      <div className="dashboard-coach">

        <div className="dashboard-coach-header">
          <div className="dashboard-section-heading">
            <Sparkles className="w-4 h-4" />
            <span className="dashboard-coach-label">
                AI Progress Coach
            </span>
            {narration?.source && (
                <span className="text-xs text-zinc-500 ml-2 font-mono">
                  ({narration.source})
                </span>
              )}
            </div>

          <button
            onClick={handleRefreshNarration}
            disabled={refreshingNarration}
            className="dashboard-refresh"
            title="Regenerate AI progress insight"
          >
            <RefreshCw className={`w-3 h-3 ${refreshingNarration ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshingNarration ? 'Analyzing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* AI Headline */}
        <h3>
          {narration?.headline || 'Stepping into Flow'}
        </h3>

        {/* Plain Language Narration */}
        <p className="dashboard-coach-copy">
          {narration?.narration ||
            'Complete a few typing passages to unlock deep neural feedback on your cadence, transition velocities, and keystroke consistency.'}
        </p>

        {/* Actionable Focus Box */}
        {narration?.focusRecommendation && (
          <div className="dashboard-tip">
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4 shrink-0" />
              <span>
                <strong>Coach Tip:</strong> {narration.focusRecommendation}
              </span>
            </div>

            {weaknesses.length > 0 && onStartDrill && (
              <button
                onClick={() => onStartDrill(weaknesses)}
                className="dashboard-action"
              >
                <Sparkles className="w-3 h-3" />
                <span>Launch Target Drill</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Stats Overview Grid */}
      <div className="dashboard-kpis">
        {/* Total Sessions */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Sessions
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {stats?.totalSessions || sessions.length || 0}
          </div>
          <span className="text-xs text-zinc-500 mt-1 font-mono">Recorded</span>
        </div>

        {/* Average WPM */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Avg Speed
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.avgWpm || 0} <span className="text-xs font-normal text-zinc-500">WPM</span>
          </div>
          <span className="text-xs text-zinc-500 mt-1 font-mono">Overall pace</span>
        </div>

        {/* Peak WPM */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Peak Speed
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {stats?.peakWpm || 0} <span className="text-xs font-normal text-zinc-500">WPM</span>
          </div>
          <span className="text-xs text-zinc-500 mt-1 font-mono">Personal best</span>
        </div>

        {/* Accuracy */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Accuracy
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {stats?.avgAccuracy || 100}%
          </div>
          <span className="text-xs text-zinc-500 mt-1 font-mono">Clean strike</span>
        </div>

        {/* Total Time */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Time Typed
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {formatTime(stats?.totalTimeMs)}
          </div>
          <span className="text-xs text-zinc-500 mt-1 font-mono">In flow</span>
        </div>

        {/* Characters Typed */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Characters
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {stats?.totalChars ? stats.totalChars.toLocaleString() : '0'}
          </div>
          <span className="text-xs text-zinc-500 mt-1 font-mono">Keystrokes</span>
        </div>
      </div>
      </div>

      {/* Speed & Rhythm Progression Chart */}
      {hasSessions && chartData.length > 1 && (
        <div className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <div className="dashboard-section-heading">
                <TrendingUp className="w-4 h-4" />
                <h4 className="dashboard-section-title">
                  Speed Progression (Last {chartData.length} Sessions)
                </h4>
              </div>
              <p className="dashboard-section-copy">
                Hover over data points to inspect individual session metrics.
              </p>
            </div>

            {selectedPoint && (
              <div className="dashboard-section-heading">
                <span className="history-accent">{selectedPoint.wpm} WPM</span>
                <span className="history-accent">{selectedPoint.accuracy}% ACC</span>
                <span className="history-muted truncate max-w-[150px]">{selectedPoint.title}</span>
              </div>
            )}
          </div>

          {/* SVG Line Chart */}
          <div className="dashboard-chart">
            <svg
              viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
              className="text-zinc-500"
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
                      stroke="var(--chart-grid)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={chartDimensions.padding - 6}
                      y={y + 3}
                      fill="var(--muted)"
                      fontSize="12"
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
                  <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--chart)" stopOpacity="0" />
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
                  stroke="var(--chart)"
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
                      className="transition-all duration-150"
                      fill="var(--surface)"
                      stroke="var(--chart)"
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
      <div className="dashboard-section">
        <div className="dashboard-section-head">
          <div className="dashboard-section-heading">
            <Brain className="w-5 h-5" />
            <div>
              <h4 className="dashboard-section-title">
                Keystroke & Bigram Weakness Matrix
              </h4>
              <p className="dashboard-section-copy">
                Identified hesitation spots, miskeys, and high-latency keystroke transitions.
              </p>
            </div>
          </div>

          {weaknesses.length > 0 && onStartDrill && (
            <button
              onClick={() => onStartDrill(weaknesses)}
              className="dashboard-action"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Practice All Weak Spots</span>
            </button>
          )}
        </div>

        <KeyboardHeatmap weaknesses={weaknesses} />

        {weaknesses.length > 0 ? (
          <div className="dashboard-weakness-grid">
            {weaknesses.map((w, idx) => (
              <div
                key={idx}
                className="dashboard-weakness"
              >
                <div className="flex items-center gap-3">
                  <div className="dashboard-weakness-token">
                    {w.token === ' ' ? '␣' : w.token}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="dashboard-weakness-name">
                        "{w.token === ' ' ? 'space' : w.token}"
                      </span>
                      <span className="dashboard-weakness-meta">
                        ({w.type})
                      </span>
                    </div>
                    <div className="dashboard-weakness-meta">
                      {w.errors > 0 && <span>{w.errors} errors</span>}
                      {w.avgLatencyMs > 0 && <span>{Math.round(w.avgLatencyMs)}ms latency</span>}
                    </div>
                  </div>
                </div>

                {onStartDrill && (
                  <button
                    onClick={() => onStartDrill([w])}
                    className="dashboard-drill-one"
                    type="button"
                    title={`Drill "${w.token}"`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <ShieldCheck className="w-8 h-8" />
            <strong>
              No prominent weak spots detected yet!
            </strong>
            <span>
              As you practice more passages, Flow will automatically identify any hesitant key transitions and build custom AI drills.
            </span>
          </div>
        )}
      </div>

      {/* Session History Activity Table */}
      <div className="dashboard-section">
        <div className="dashboard-section-head">
          <div className="dashboard-section-heading">
            <History className="w-4 h-4" />
            <h4 className="dashboard-section-title">
              Recent Session History
            </h4>
          </div>
          <span className="dashboard-section-copy">
            {sessions.length} sessions logged
          </span>
        </div>

        {sessions.length > 0 ? (
          <div className="dashboard-history">
            <table>
              <thead>
                <tr>
                  <th className="py-2.5 px-3">Passage</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Errors</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 15).map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td className="history-title">
                      {s.passageTitle || 'Zen Passage'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="history-muted">
                        {s.mode || 'passage'}
                      </span>
                    </td>
                    <td className="history-accent">
                      {s.wpm} <span className="history-muted">wpm</span>
                    </td>
                    <td className="history-muted">
                      <span className={s.accuracy >= 98 ? 'history-accent' : ''}>
                        {s.accuracy}%
                      </span>
                    </td>
                    <td className="history-muted">
                      {formatTime(s.elapsedTimeMs)}
                    </td>
                    <td className={s.errorCount === 0 ? 'history-clean' : 'history-error'}>
                      {s.errorCount === 0 ? (
                        <span>0</span>
                      ) : (
                        <span>{s.errorCount}</span>
                      )}
                    </td>
                    <td className="history-muted">
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
