import { useSyncExternalStore } from 'react';

const VERSION = 'v1';
const KEYS = {
  settings: `flow_settings_${VERSION}`,
  passages: `flow_custom_passages_${VERSION}`,
  queue: `flow_practice_queue_${VERSION}`,
  goals: `flow_goals_${VERSION}`,
  sessions: `flow_local_sessions_${VERSION}`,
  replays: `flow_session_replays_${VERSION}`
};

const LIMITS = {
  customPassages: 24,
  queue: 24,
  sessions: 90,
  replays: 24,
  replayEvents: 360
};

export const DEFAULT_SETTINGS = {
  typingFontSize: 22,
  lineHeight: 1.8,
  zenIdleDelay: 2500,
  ghostDefaultWpm: 65,
  passageLength: 'any',
  soundEnabled: false,
  soundTheme: 'none',
  zenModeType: 'standard'
};

export const DEFAULT_GOALS = {
  dailyMinutes: 15,
  targetWpm: null,
  targetAccuracy: null
};

let revision = 0;
const listeners = new Set();

const notify = () => {
  revision += 1;
  listeners.forEach((listener) => listener());
};

const getStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const readJson = (key, fallback) => {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const parsed = JSON.parse(storage.getItem(key) || 'null');
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    notify();
    return true;
  } catch {
    return false;
  }
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const cleanText = (value, maxLength) => String(value ?? '')
  .replace(/\r\n?/g, '\n')
  .slice(0, maxLength);

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => revision;

export const useFlowLocalVersion = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (Object.values(KEYS).includes(event.key)) notify();
  });
}

export function getSettings() {
  const stored = readJson(KEYS.settings, {});
  return {
    typingFontSize: clampNumber(stored.typingFontSize, 16, 32, DEFAULT_SETTINGS.typingFontSize),
    lineHeight: clampNumber(stored.lineHeight, 1.35, 2.3, DEFAULT_SETTINGS.lineHeight),
    zenIdleDelay: clampNumber(stored.zenIdleDelay, 1000, 10000, DEFAULT_SETTINGS.zenIdleDelay),
    ghostDefaultWpm: clampNumber(stored.ghostDefaultWpm, 25, 180, DEFAULT_SETTINGS.ghostDefaultWpm),
    passageLength: ['any', 'short', 'medium', 'long'].includes(stored.passageLength) ? stored.passageLength : DEFAULT_SETTINGS.passageLength,
    soundEnabled: stored.soundEnabled === true,
    soundTheme: ['none', 'wood', 'water', 'thock'].includes(stored.soundTheme) ? stored.soundTheme : DEFAULT_SETTINGS.soundTheme,
    zenModeType: ['standard', 'fade', 'blind'].includes(stored.zenModeType) ? stored.zenModeType : DEFAULT_SETTINGS.zenModeType
  };
}

export function saveSettings(nextSettings) {
  const current = getSettings();
  const input = nextSettings && typeof nextSettings === 'object' ? nextSettings : {};
  const next = {
    ...current,
    ...input,
    typingFontSize: clampNumber(input.typingFontSize, 16, 32, current.typingFontSize),
    lineHeight: clampNumber(input.lineHeight, 1.35, 2.3, current.lineHeight),
    zenIdleDelay: clampNumber(input.zenIdleDelay, 1000, 10000, current.zenIdleDelay),
    ghostDefaultWpm: clampNumber(input.ghostDefaultWpm, 25, 180, current.ghostDefaultWpm),
    passageLength: ['any', 'short', 'medium', 'long'].includes(input.passageLength) ? input.passageLength : current.passageLength,
    soundEnabled: input.soundEnabled === true,
    soundTheme: ['none', 'wood', 'water', 'thock'].includes(input.soundTheme) ? input.soundTheme : current.soundTheme,
    zenModeType: ['standard', 'fade', 'blind'].includes(input.zenModeType) ? input.zenModeType : current.zenModeType
  };
  writeJson(KEYS.settings, next);
  try {
    getStorage()?.setItem('flow_ghost_wpm', String(next.ghostDefaultWpm));
  } catch {}
  return next;
}

export function resetSettings() {
  return saveSettings(DEFAULT_SETTINGS);
}

export function getGoals() {
  const stored = readJson(KEYS.goals, {});
  return {
    dailyMinutes: Math.round(clampNumber(stored.dailyMinutes, 1, 240, DEFAULT_GOALS.dailyMinutes)),
    targetWpm: stored.targetWpm === null || stored.targetWpm === '' || stored.targetWpm === undefined ? null : Math.round(clampNumber(stored.targetWpm, 10, 250, 0)),
    targetAccuracy: stored.targetAccuracy === null || stored.targetAccuracy === '' || stored.targetAccuracy === undefined ? null : Math.round(clampNumber(stored.targetAccuracy, 50, 100, 0))
  };
}

export function saveGoals(nextGoals) {
  const current = getGoals();
  const input = nextGoals && typeof nextGoals === 'object' ? nextGoals : {};
  const next = {
    dailyMinutes: Math.round(clampNumber(input.dailyMinutes, 1, 240, current.dailyMinutes)),
    targetWpm: input.targetWpm === null || input.targetWpm === '' ? null : Math.round(clampNumber(input.targetWpm, 10, 250, current.targetWpm || 10)),
    targetAccuracy: input.targetAccuracy === null || input.targetAccuracy === '' ? null : Math.round(clampNumber(input.targetAccuracy, 50, 100, current.targetAccuracy || 50))
  };
  writeJson(KEYS.goals, next);
  return next;
}

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const normalizeWeakness = (weakness) => {
  const token = cleanText(weakness?.token, 20).trim();
  if (!token) return null;
  return {
    token,
    type: cleanText(weakness?.type, 40) || 'pattern',
    errors: Math.max(0, Math.round(Number(weakness?.errors) || 0)),
    avgLatencyMs: Math.max(0, Math.round(Number(weakness?.avgLatencyMs) || 0))
  };
};

export function getQueue() {
  const stored = readJson(KEYS.queue, []);
  if (!Array.isArray(stored)) return [];
  return stored.slice(0, LIMITS.queue).map((item) => {
    const source = item && typeof item === 'object' ? item : {};
    return {
      id: cleanText(source.id, 100) || `queue-${cleanText(source.token, 20)}`,
      token: cleanText(source.token, 20),
      type: cleanText(source.type, 40) || 'pattern',
      errors: Math.max(0, Math.round(Number(source.errors) || 0)),
      avgLatencyMs: Math.max(0, Math.round(Number(source.avgLatencyMs) || 0)),
      createdAt: cleanText(source.createdAt, 40) || new Date().toISOString()
    };
  }).filter((item) => item.token);
}

export function addQueueItems(weaknesses = []) {
  const current = getQueue();
  const seen = new Set(current.map((item) => `${item.token}|${item.type}`));
  const additions = [];
  const incoming = Array.isArray(weaknesses) ? weaknesses : [];
  incoming.map(normalizeWeakness).filter(Boolean).forEach((weakness) => {
    const key = `${weakness.token}|${weakness.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    additions.push({ ...weakness, id: makeId('queue'), createdAt: new Date().toISOString() });
  });
  if (!additions.length) return current;
  const next = [...current, ...additions].slice(0, LIMITS.queue);
  writeJson(KEYS.queue, next);
  return next;
}

export function removeQueueItem(id) {
  const next = getQueue().filter((item) => item.id !== id);
  writeJson(KEYS.queue, next);
  return next;
}

export function clearQueue() {
  writeJson(KEYS.queue, []);
  return [];
}

export function getCustomPassages() {
  const stored = readJson(KEYS.passages, []);
  if (!Array.isArray(stored)) return [];
  return stored.slice(0, LIMITS.customPassages).map((passage) => {
    const source = passage && typeof passage === 'object' ? passage : {};
    return {
      id: cleanText(source.id, 100),
      title: cleanText(source.title, 80) || 'Custom passage',
      source: cleanText(source.source, 80) || 'Local passage',
      category: source.mode === 'code' ? 'code' : 'custom',
      mode: source.mode === 'code' ? 'code' : 'plain',
      difficulty: ['easy', 'medium', 'hard'].includes(source.difficulty) ? source.difficulty : 'medium',
      content: cleanText(source.content, 5000)
    };
  }).filter((passage) => passage.id && passage.content.length >= 20);
}

export function validateCustomPassage(input = {}) {
  const rawContent = String(input.content ?? '').replace(/\r\n?/g, '\n');
  if (rawContent.length > 5000) return { ok: false, error: 'Keep custom passages under 5,000 characters.' };
  const content = rawContent.trim();
  if (content.length < 20) return { ok: false, error: 'Use at least 20 characters so the passage can measure a rhythm.' };
  return {
    ok: true,
    passage: {
      id: makeId('custom'),
      title: cleanText(input.title, 80).trim() || 'Custom passage',
      source: cleanText(input.source, 80).trim() || 'Local passage',
      category: input.mode === 'code' ? 'code' : 'custom',
      mode: input.mode === 'code' ? 'code' : 'plain',
      difficulty: ['easy', 'medium', 'hard'].includes(input.difficulty) ? input.difficulty : 'medium',
      content
    }
  };
}

export function saveCustomPassage(input) {
  const validation = validateCustomPassage(input);
  if (!validation.ok) return validation;
  const next = [validation.passage, ...getCustomPassages()].slice(0, LIMITS.customPassages);
  writeJson(KEYS.passages, next);
  return { ok: true, passage: validation.passage, passages: next };
}

export function deleteCustomPassage(id) {
  const next = getCustomPassages().filter((passage) => passage.id !== id);
  writeJson(KEYS.passages, next);
  return next;
}

const normalizeReplay = (events = []) => (Array.isArray(events) ? events : []).slice(-LIMITS.replayEvents).map((event) => ({
  char: cleanText(event?.char, 2),
  expected: cleanText(event?.expected, 2),
  isCorrect: event?.isCorrect === true,
  timestamp: Number.isFinite(Number(event?.timestamp)) ? Number(event.timestamp) : 0,
  latency: Math.max(0, Math.round(Number(event?.latency) || 0))
}));

export function getLocalSessions() {
  const stored = readJson(KEYS.sessions, []);
  return Array.isArray(stored) ? stored.slice(0, LIMITS.sessions).filter((session) => session && typeof session === 'object') : [];
}

export function getReplay(id) {
  const stored = readJson(KEYS.replays, []);
  if (!Array.isArray(stored)) return null;
  return stored.find((replay) => replay && replay.id === id) || null;
}

export function recordSession(summary = {}) {
  const id = cleanText(summary.id, 100) || makeId('session');
  const completedAt = summary.completedAt || new Date().toISOString();
  const normalized = {
    id,
    completedAt,
    dateKey: dateKey(new Date(completedAt)),
    wpm: Math.max(0, Math.round(Number(summary.wpm) || 0)),
    accuracy: Math.min(100, Math.max(0, Math.round(Number(summary.accuracy) || 0))),
    elapsedTimeMs: Math.max(0, Math.round(Number(summary.elapsedTimeMs) || 0)),
    passageTitle: cleanText(summary.passageTitle, 120) || 'Practice passage',
    mode: cleanText(summary.mode, 30) || 'passage',
    weaknesses: (Array.isArray(summary.weaknesses) ? summary.weaknesses : []).map(normalizeWeakness).filter(Boolean).slice(0, 8)
  };
  const sessions = [normalized, ...getLocalSessions().filter((session) => session.id !== id)].slice(0, LIMITS.sessions);
  const replay = { id, completedAt, passageTitle: normalized.passageTitle, events: normalizeReplay(summary.replay || summary.keystrokes) };
  const storedReplays = readJson(KEYS.replays, []);
  const previousReplays = Array.isArray(storedReplays) ? storedReplays : [];
  const replays = [replay, ...previousReplays.filter((item) => item?.id !== id)].slice(0, LIMITS.replays);
  writeJson(KEYS.sessions, sessions);
  writeJson(KEYS.replays, replays);
  addQueueItems(normalized.weaknesses);
  return normalized;
}

export function getGoalProgress(now = new Date()) {
  const today = dateKey(now);
  const sessions = getLocalSessions();
  const todaySessions = sessions.filter((session) => session.dateKey === today);
  const minutes = todaySessions.reduce((total, session) => total + session.elapsedTimeMs / 60000, 0);
  const goals = getGoals();
  const dateSet = new Set(sessions.map((session) => session.dateKey));
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (dateSet.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    goals,
    todayMinutes: minutes,
    todaySessions: todaySessions.length,
    minutesPercent: Math.min(100, Math.round((minutes / Math.max(goals.dailyMinutes, 1)) * 100)),
    streak
  };
}

export function makeLocalDrill(weaknesses = []) {
  const incoming = Array.isArray(weaknesses) ? weaknesses : [];
  const tokens = incoming.map(normalizeWeakness).filter(Boolean).slice(0, 3);
  const focus = tokens.length ? tokens.map((item) => item.token) : ['th'];
  const seed = focus.join(' ');
  const content = `Steady practice builds flow. Keep the ${seed} pattern clean, then repeat the rhythm with patience and precision.`;
  return {
    id: makeId('local-drill'),
    title: `Targeted drill: ${seed}`,
    source: 'Local adaptive queue',
    category: 'drill',
    difficulty: 'medium',
    focus,
    content
  };
}

export const FLOW_STORAGE_KEYS = KEYS;
