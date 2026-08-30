const express = require('express');
const router = express.Router();
const { analyzeWeaknesses } = require('../utils/weaknessAnalyzer');
const { supabase, isConfigured: isSupabaseConfigured, DEFAULT_USER_ID } = require('../db/supabaseClient');

let db = null;
try {
  db = require('../db/db');
} catch (err) {
  console.warn('[Session Route] SQLite database not initialized, running in pure in-memory mode:', err.message);
}

// In-memory sessions storage (fallback / fast access)
const inMemorySessions = [];

// POST /api/session - Record typing session and weakness telemetry
router.post('/session', async (req, res) => {
  try {
    const {
      userId = DEFAULT_USER_ID,
      passageId,
      passageTitle,
      passageType,
      wpm = 0,
      rawWpm = 0,
      accuracy = 100,
      elapsedTimeMs = 0,
      totalChars = 0,
      correctChars = 0,
      errorCount = 0,
      mode = 'passage',
      keystrokes = [],
      weaknesses = []
    } = req.body;

    // Compute or refine weaknesses if keystrokes are provided
    let computedWeaknesses = weaknesses;
    if ((!computedWeaknesses || computedWeaknesses.length === 0) && keystrokes.length > 0) {
      const analysis = analyzeWeaknesses(keystrokes, req.body.passageContent || '');
      computedWeaknesses = analysis.topWeaknesses;
    }

    const sessionId = Date.now();
    const sessionRecord = {
      id: sessionId,
      userId,
      passageId,
      passageTitle: passageTitle || 'Zen Passage',
      passageType: passageType || (mode === 'drill' ? 'drill' : 'zen'),
      wpm: Number(wpm),
      rawWpm: Number(rawWpm),
      accuracy: Number(accuracy),
      elapsedTimeMs: Number(elapsedTimeMs),
      totalChars: Number(totalChars),
      correctChars: Number(correctChars),
      errorCount: Number(errorCount),
      mode,
      weaknesses: computedWeaknesses,
      keystrokesCount: keystrokes.length,
      createdAt: new Date().toISOString()
    };

    // 1. Store in-memory
    inMemorySessions.unshift(sessionRecord);
    if (inMemorySessions.length > 100) {
      inMemorySessions.pop();
    }

    // 2. Persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        // Ensure user exists in users table if table is present
        if (userId && userId !== DEFAULT_USER_ID) {
          try {
            await supabase.from('users').upsert({ id: userId }, { onConflict: 'id' });
          } catch (uErr) {
            // Ignore if users table RLS or triggers handle it
          }
        }

        const { data: supabaseSession, error: sessionErr } = await supabase
          .from('sessions')
          .insert({
            user_id: userId,
            passage_id: passageId ? String(passageId) : null,
            passage_title: sessionRecord.passageTitle,
            passage_type: sessionRecord.passageType,
            wpm: sessionRecord.wpm,
            raw_wpm: sessionRecord.rawWpm,
            accuracy: sessionRecord.accuracy,
            elapsed_time_ms: sessionRecord.elapsedTimeMs,
            total_chars: sessionRecord.totalChars,
            correct_chars: sessionRecord.correctChars,
            error_count: sessionRecord.errorCount,
            mode: sessionRecord.mode,
            timestamp: sessionRecord.createdAt
          })
          .select()
          .single();

        if (sessionErr) {
          console.warn('[Supabase] Could not insert session record:', sessionErr.message);
        } else if (supabaseSession) {
          sessionRecord.supabaseId = supabaseSession.id;
        }

        // Upsert weaknesses to Supabase
        if (computedWeaknesses.length > 0) {
          for (const w of computedWeaknesses) {
            const pattern = typeof w === 'string' ? w : w.token;
            if (!pattern) continue;

            const attempts = Number(w.attempts || 1);
            const errors = Number(w.errors || 0);
            const errorRate = w.errorRate !== undefined
              ? Number(w.errorRate)
              : (attempts > 0 ? Number((errors / attempts).toFixed(2)) : (errors > 0 ? 1 : 0));
            const avgLatency = Number(w.avgLatencyMs || w.avg_latency || 0);

            const { error: weakErr } = await supabase
              .from('weaknesses')
              .upsert({
                user_id: userId,
                pattern: pattern,
                token_type: w.type || 'char',
                total_attempts: attempts,
                error_count: errors,
                error_rate: errorRate,
                avg_latency: avgLatency,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id,pattern' });

            if (weakErr) {
              console.warn(`[Supabase] Could not upsert weakness "${pattern}":`, weakErr.message);
            }
          }
        }
      } catch (sbEx) {
        console.warn('[Supabase] Exception writing session/weakness telemetry:', sbEx.message);
      }
    }

    // 3. Persist to SQLite if db is ready
    if (db) {
      try {
        const insertSession = db.prepare(`
          INSERT INTO typing_sessions (
            passage_id, passage_title, wpm, raw_wpm, accuracy,
            elapsed_time_ms, total_chars, correct_chars, error_count, mode
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = insertSession.run(
          passageId || null,
          passageTitle || null,
          wpm,
          rawWpm,
          accuracy,
          elapsedTimeMs,
          totalChars,
          correctChars,
          errorCount,
          mode
        );

        sessionRecord.dbId = info.lastInsertRowid;

        // Update weakness_stats table
        if (computedWeaknesses.length > 0) {
          const upsertWeakness = db.prepare(`
            INSERT INTO weakness_stats (token, token_type, total_attempts, error_count, avg_latency_ms, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(token) DO UPDATE SET
              total_attempts = total_attempts + excluded.total_attempts,
              error_count = error_count + excluded.error_count,
              avg_latency_ms = (avg_latency_ms + excluded.avg_latency_ms) / 2,
              updated_at = CURRENT_TIMESTAMP
          `);

          const insertWeaknessesTx = db.transaction((items) => {
            for (const item of items) {
              upsertWeakness.run(
                item.token,
                item.type || 'char',
                item.attempts || 1,
                item.errors || 0,
                item.avgLatencyMs || 0
              );
            }
          });

          insertWeaknessesTx(computedWeaknesses);
        }
      } catch (dbErr) {
        console.warn('[Session DB] Failed to persist session into SQLite (in-memory preserved):', dbErr.message);
      }
    }

    const weaknessTokens = computedWeaknesses.map(w => (typeof w === 'string' ? w : w.token)).join(', ');
    console.log(`[Session Log] Saved session #${sessionRecord.id} | WPM: ${wpm} | Acc: ${accuracy}% | Weak spots: ${weaknessTokens || 'None'}`);

    return res.status(201).json({
      success: true,
      sessionId: sessionRecord.id,
      weaknesses: computedWeaknesses,
      stats: {
        wpm,
        rawWpm,
        accuracy,
        elapsedTimeMs,
        totalChars,
        correctChars,
        errorCount
      }
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return res.status(500).json({ error: 'Failed to record session' });
  }
});

// GET /api/sessions - Get recent sessions
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];

    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('sessions')
          .select('*');

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query
          .order('timestamp', { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          const sessions = data.map(row => ({
            id: row.id,
            passageId: row.passage_id,
            passageTitle: row.passage_title || 'Zen Passage',
            passageType: row.passage_type,
            wpm: Number(row.wpm) || 0,
            rawWpm: Number(row.raw_wpm || row.wpm) || 0,
            accuracy: Number(row.accuracy) || 100,
            elapsedTimeMs: Number(row.elapsed_time_ms) || 0,
            totalChars: Number(row.total_chars) || 0,
            correctChars: Number(row.correct_chars) || 0,
            errorCount: Number(row.error_count) || 0,
            mode: row.mode || 'passage',
            createdAt: row.timestamp || row.created_at
          }));
          return res.json({ sessions, source: 'supabase' });
        }
      } catch (sbErr) {
        console.warn('[Supabase] Fallback from sessions query:', sbErr.message);
      }
    }

    // 2. Try SQLite
    if (db) {
      try {
        const rows = db.prepare(`
          SELECT 
            id, passage_id as passageId, passage_title as passageTitle,
            wpm, raw_wpm as rawWpm, accuracy, elapsed_time_ms as elapsedTimeMs,
            total_chars as totalChars, correct_chars as correctChars,
            error_count as errorCount, mode, created_at as createdAt
          FROM typing_sessions
          ORDER BY id DESC
          LIMIT 50
        `).all();

        if (rows && rows.length > 0) {
          return res.json({ sessions: rows, source: 'sqlite' });
        }
      } catch (dbErr) {
        console.warn('[Session DB] Fallback to in-memory for /api/sessions:', dbErr.message);
      }
    }

    // 3. Fallback to in-memory
    return res.json({ sessions: inMemorySessions.slice(0, 50), source: 'in-memory' });
  } catch (error) {
    console.error('Error retrieving sessions:', error);
    return res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

// GET /api/weaknesses - Get aggregated weakness statistics
router.get('/weaknesses', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];

    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('weaknesses')
          .select('*');

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query
          .order('error_count', { ascending: false })
          .order('avg_latency', { ascending: false })
          .limit(15);

        if (!error && data && data.length > 0) {
          const weaknesses = data.map(w => ({
            token: w.pattern,
            type: w.token_type || 'char',
            attempts: Number(w.total_attempts) || 1,
            errors: Number(w.error_count) || 0,
            avgLatencyMs: Number(w.avg_latency) || 0,
            errorRate: Number(w.error_rate) || 0,
            updatedAt: w.updated_at
          }));
          return res.json({ weaknesses, source: 'supabase' });
        }
      } catch (sbErr) {
        console.warn('[Supabase] Fallback from weaknesses query:', sbErr.message);
      }
    }

    // 2. Try SQLite
    if (db) {
      try {
        const rows = db.prepare(`
          SELECT token, token_type as type, total_attempts as attempts,
                 error_count as errors, avg_latency_ms as avgLatencyMs,
                 ROUND(CAST(error_count AS FLOAT) / MAX(total_attempts, 1), 2) as errorRate,
                 updated_at as updatedAt
          FROM weakness_stats
          WHERE total_attempts > 0
          ORDER BY error_count DESC, avg_latency_ms DESC
          LIMIT 15
        `).all();

        if (rows && rows.length > 0) {
          return res.json({ weaknesses: rows, source: 'sqlite' });
        }
      } catch (dbErr) {
        console.warn('[Weakness DB] Fallback to in-memory for /api/weaknesses:', dbErr.message);
      }
    }

    // 3. In-memory fallback
    const aggregated = {};
    for (const session of inMemorySessions) {
      if (userId && session.userId && session.userId !== userId) continue;
      if (Array.isArray(session.weaknesses)) {
        for (const w of session.weaknesses) {
          const key = typeof w === 'string' ? w : w.token;
          if (!key) continue;
          if (!aggregated[key]) {
            aggregated[key] = {
              token: key,
              type: w.type || 'char',
              attempts: 0,
              errors: 0,
              avgLatencyMs: 0
            };
          }
          aggregated[key].attempts += (w.attempts || 1);
          aggregated[key].errors += (w.errors || 1);
          if (w.avgLatencyMs) {
            aggregated[key].avgLatencyMs = aggregated[key].avgLatencyMs
              ? (aggregated[key].avgLatencyMs + w.avgLatencyMs) / 2
              : w.avgLatencyMs;
          }
        }
      }
    }

    const list = Object.values(aggregated)
      .map(item => ({
        ...item,
        errorRate: item.attempts > 0 ? Number((item.errors / item.attempts).toFixed(2)) : 0
      }))
      .sort((a, b) => (b.errors || 0) - (a.errors || 0))
      .slice(0, 15);

    return res.json({ weaknesses: list, source: 'in-memory' });
  } catch (error) {
    console.error('Error retrieving weaknesses:', error);
    return res.status(500).json({ error: 'Failed to retrieve weaknesses' });
  }
});

// GET /api/stats - Aggregated user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    let sessions = [];

    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('sessions')
          .select('wpm, raw_wpm, accuracy, elapsed_time_ms, total_chars, correct_chars, error_count, mode, created_at, timestamp');

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          sessions = data.map(row => ({
            wpm: Number(row.wpm) || 0,
            rawWpm: Number(row.raw_wpm || row.wpm) || 0,
            accuracy: Number(row.accuracy) || 100,
            elapsedTimeMs: Number(row.elapsed_time_ms) || 0,
            totalChars: Number(row.total_chars) || 0,
            correctChars: Number(row.correct_chars) || 0,
            errorCount: Number(row.error_count) || 0,
            mode: row.mode || 'passage',
            createdAt: row.timestamp || row.created_at
          }));
        }
      } catch (sbErr) {
        console.warn('[Supabase] Fallback from stats query:', sbErr.message);
      }
    }

    // 2. Try SQLite if no sessions from Supabase
    if (sessions.length === 0 && db) {
      try {
        sessions = db.prepare(`
          SELECT wpm, raw_wpm as rawWpm, accuracy, elapsed_time_ms as elapsedTimeMs,
                 total_chars as totalChars, correct_chars as correctChars,
                 error_count as errorCount, mode, created_at as createdAt
          FROM typing_sessions
          ORDER BY id DESC
        `).all();
      } catch (dbErr) {
        console.warn('[Stats DB] Fallback to in-memory:', dbErr.message);
      }
    }

    // 3. Try In-memory if still empty
    if (sessions.length === 0) {
      sessions = inMemorySessions;
    }

    if (sessions.length === 0) {
      return res.json({
        totalSessions: 0,
        avgWpm: 0,
        peakWpm: 0,
        avgAccuracy: 100,
        totalTimeMs: 0,
        totalChars: 0,
        totalErrors: 0
      });
    }

    const totalSessions = sessions.length;
    const totalTimeMs = sessions.reduce((sum, s) => sum + (Number(s.elapsedTimeMs) || 0), 0);
    const totalChars = sessions.reduce((sum, s) => sum + (Number(s.totalChars) || 0), 0);
    const totalErrors = sessions.reduce((sum, s) => sum + (Number(s.errorCount) || 0), 0);
    const avgWpm = Math.round(sessions.reduce((sum, s) => sum + (Number(s.wpm) || 0), 0) / totalSessions);
    const peakWpm = Math.max(...sessions.map(s => Number(s.wpm) || 0));
    const avgAccuracy = Math.round(sessions.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0) / totalSessions);

    return res.json({
      totalSessions,
      avgWpm,
      peakWpm,
      avgAccuracy,
      totalTimeMs,
      totalChars,
      totalErrors
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    return res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

// GET /api/progress-narration - AI summary of trends and rhythm
router.get('/progress-narration', async (req, res) => {
  try {
    const { generateProgressNarration } = require('../services/ai');
    const userId = req.query.userId || req.headers['x-user-id'];
    
    // Retrieve latest sessions
    let sessions = [];

    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('sessions')
          .select('wpm, raw_wpm, accuracy, elapsed_time_ms, total_chars, correct_chars, error_count, mode, timestamp, created_at');

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query
          .order('timestamp', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          sessions = data.map(row => ({
            wpm: Number(row.wpm) || 0,
            rawWpm: Number(row.raw_wpm || row.wpm) || 0,
            accuracy: Number(row.accuracy) || 100,
            elapsedTimeMs: Number(row.elapsed_time_ms) || 0,
            totalChars: Number(row.total_chars) || 0,
            correctChars: Number(row.correct_chars) || 0,
            errorCount: Number(row.error_count) || 0,
            mode: row.mode || 'passage',
            createdAt: row.timestamp || row.created_at
          }));
        }
      } catch (sbErr) {
        console.warn('[Supabase] Fallback in narration sessions:', sbErr.message);
      }
    }

    // 2. Try SQLite
    if (sessions.length === 0 && db) {
      try {
        sessions = db.prepare(`
          SELECT wpm, raw_wpm as rawWpm, accuracy, elapsed_time_ms as elapsedTimeMs,
                 total_chars as totalChars, correct_chars as correctChars,
                 error_count as errorCount, mode, created_at as createdAt
          FROM typing_sessions
          ORDER BY id DESC
          LIMIT 20
        `).all();
      } catch (dbErr) {
        console.warn('[Narration DB] Fallback to in-memory:', dbErr.message);
      }
    }

    // 3. Try In-memory
    if (sessions.length === 0) {
      const filtered = inMemorySessions.filter(s => !userId || !s.userId || s.userId === userId);
      sessions = (filtered.length > 0 ? filtered : inMemorySessions).slice(0, 20);
    }

    // Retrieve weaknesses
    let weaknesses = [];

    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let weakQuery = supabase
          .from('weaknesses')
          .select('pattern, token_type, error_count, avg_latency, error_rate');

        if (userId) {
          weakQuery = weakQuery.eq('user_id', userId);
        }

        const { data, error } = await weakQuery
          .order('error_count', { ascending: false })
          .order('avg_latency', { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          weaknesses = data.map(w => ({
            token: w.pattern,
            type: w.token_type || 'char',
            errors: Number(w.error_count) || 0,
            avgLatencyMs: Number(w.avg_latency) || 0,
            errorRate: Number(w.error_rate) || 0
          }));
        }
      } catch (sbErr) {
        console.warn('[Supabase] Fallback in narration weaknesses:', sbErr.message);
      }
    }

    // 2. Try SQLite
    if (weaknesses.length === 0 && db) {
      try {
        weaknesses = db.prepare(`
          SELECT token, token_type as type, error_count as errors, avg_latency_ms as avgLatencyMs
          FROM weakness_stats
          WHERE total_attempts > 0
          ORDER BY error_count DESC, avg_latency_ms DESC
          LIMIT 6
        `).all();
      } catch (dbErr) {
        // continue
      }
    }

    // 3. Try In-memory
    if (weaknesses.length === 0 && sessions.length > 0) {
      const map = {};
      for (const s of sessions) {
        if (Array.isArray(s.weaknesses)) {
          for (const w of s.weaknesses) {
            const key = typeof w === 'string' ? w : w.token;
            if (key) map[key] = w;
          }
        }
      }
      weaknesses = Object.values(map).slice(0, 6);
    }

    const narration = await generateProgressNarration({ sessions, weaknesses });

    return res.json({
      ...narration,
      statsSummary: {
        sessionCount: sessions.length,
        avgWpm: sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (Number(s.wpm) || 0), 0) / sessions.length) : 0,
        avgAccuracy: sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (Number(s.accuracy) || 0), 0) / sessions.length) : 100
      }
    });
  } catch (error) {
    console.error('Error generating progress narration:', error);
    const { generateFallbackNarration } = require('../services/ai');
    const fallback = generateFallbackNarration([], []);
    return res.json(fallback);
  }
});

// POST /api/progress-narration - Generate narration for client-provided sessions
router.post('/progress-narration', async (req, res) => {
  try {
    const { generateProgressNarration } = require('../services/ai');
    const { sessions = [], weaknesses = [] } = req.body;
    const narration = await generateProgressNarration({ sessions, weaknesses });
    return res.json(narration);
  } catch (error) {
    console.error('Error in POST /api/progress-narration:', error);
    const { generateFallbackNarration } = require('../services/ai');
    const fallback = generateFallbackNarration(req.body?.sessions || [], req.body?.weaknesses || []);
    return res.json(fallback);
  }
});

module.exports = router;
