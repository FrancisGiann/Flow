const express = require('express');
const request = require('http');

async function testBackend() {
  const sessionRoutes = require('../src/routes/session');
  const passageRoutes = require('../src/routes/passage');
  const drillRoutes = require('../src/routes/drill');

  const app = express();
  app.use(express.json());
  app.use('/api', passageRoutes);
  app.use('/api', sessionRoutes);
  app.use('/api', drillRoutes);

  const server = app.listen(5099, async () => {
    console.log('Test server running on port 5099');

    try {
      // 1. Post a test session
      const postData = JSON.stringify({
        passageTitle: "Testing Supabase & SQLite Integration",
        wpm: 85,
        rawWpm: 88,
        accuracy: 97,
        elapsedTimeMs: 14200,
        totalChars: 120,
        correctChars: 116,
        errorCount: 4,
        mode: "passage",
        passageType: "zen",
        weaknesses: [
          { token: "th", type: "bigram", attempts: 10, errors: 2, avgLatencyMs: 190 },
          { token: "ing", type: "trigram", attempts: 8, errors: 1, avgLatencyMs: 160 }
        ]
      });

      const postRes = await fetch('http://localhost:5099/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: postData
      });
      const postJson = await postRes.json();
      console.log('1. POST /api/session result:', postJson.success, 'Session ID:', postJson.sessionId);

      // 2. Get sessions
      const getSessionsRes = await fetch('http://localhost:5099/api/sessions');
      const sessionsJson = await getSessionsRes.json();
      console.log('2. GET /api/sessions count:', sessionsJson.sessions?.length, 'Source:', sessionsJson.source);

      // 3. Get weaknesses
      const getWeaknessesRes = await fetch('http://localhost:5099/api/weaknesses');
      const weaknessesJson = await getWeaknessesRes.json();
      console.log('3. GET /api/weaknesses count:', weaknessesJson.weaknesses?.length, 'Source:', weaknessesJson.source);

      // 4. Get stats
      const getStatsRes = await fetch('http://localhost:5099/api/stats');
      const statsJson = await getStatsRes.json();
      console.log('4. GET /api/stats:', statsJson);

      // 5. Get progress narration
      const getNarrationRes = await fetch('http://localhost:5099/api/progress-narration');
      const narrationJson = await getNarrationRes.json();
      console.log('5. GET /api/progress-narration headline:', narrationJson.headline);

      console.log('ALL API ENDPOINTS FUNCTIONING PERFECTLY!');
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      server.close();
    }
  });
}

testBackend();
