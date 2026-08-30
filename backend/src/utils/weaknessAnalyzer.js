/**
 * Weakness Analyzer Utility for Flow Backend
 * Aggregates keystroke telemetry into a weakness profile:
 * - Single keys (e.g. 'p', 'q', '{')
 * - Bigrams (e.g. 'th', 'he', 'qu')
 * - Trigrams (e.g. 'ing', 'the', 'ion')
 */

function analyzeWeaknesses(keystrokes = [], targetText = '') {
  if (!keystrokes || keystrokes.length === 0 || !targetText) {
    return {
      topWeaknesses: [],
      summary: {
        totalKeystrokes: 0,
        baselineLatencyMs: 0,
        totalErrors: 0,
        charStats: {},
        bigramStats: {},
        trigramStats: {}
      }
    };
  }

  const charStats = {};
  const bigramStats = {};
  const trigramStats = {};

  // 1. Single character analysis
  const validLatencies = [];

  for (let i = 0; i < keystrokes.length; i++) {
    const ks = keystrokes[i];
    const expected = (ks.expected || targetText[i] || '').toLowerCase();
    if (!expected) continue;

    const latency = Math.min(Math.max(ks.latency || 0, 0), 4000);
    if (ks.isCorrect && latency > 0) {
      validLatencies.push(latency);
    }

    if (!charStats[expected]) {
      charStats[expected] = {
        token: expected,
        type: 'char',
        attempts: 0,
        errors: 0,
        totalLatency: 0,
        latencies: []
      };
    }

    charStats[expected].attempts += 1;
    if (!ks.isCorrect) {
      charStats[expected].errors += 1;
    }
    if (latency > 0) {
      charStats[expected].totalLatency += latency;
      charStats[expected].latencies.push(latency);
    }
  }

  // Baseline latency (median)
  let baselineLatencyMs = 200;
  if (validLatencies.length > 0) {
    const sorted = [...validLatencies].sort((a, b) => a - b);
    baselineLatencyMs = sorted[Math.floor(sorted.length / 2)];
  }

  // 2. Bigram analysis
  const normalizedTarget = targetText.toLowerCase();
  for (let i = 1; i < keystrokes.length && i < normalizedTarget.length; i++) {
    const bigram = normalizedTarget.slice(i - 1, i + 1);
    if (bigram === '  ') continue;

    const ksPrev = keystrokes[i - 1];
    const ksCurr = keystrokes[i];
    const transitionLatency = Math.min(Math.max(ksCurr.latency || 0, 0), 4000);
    const hasError = !ksPrev.isCorrect || !ksCurr.isCorrect;

    if (!bigramStats[bigram]) {
      bigramStats[bigram] = {
        token: bigram,
        type: 'bigram',
        attempts: 0,
        errors: 0,
        totalLatency: 0,
        latencies: []
      };
    }

    bigramStats[bigram].attempts += 1;
    if (hasError) {
      bigramStats[bigram].errors += 1;
    }
    if (transitionLatency > 0) {
      bigramStats[bigram].totalLatency += transitionLatency;
      bigramStats[bigram].latencies.push(transitionLatency);
    }
  }

  // 3. Trigram analysis
  for (let i = 2; i < keystrokes.length && i < normalizedTarget.length; i++) {
    const trigram = normalizedTarget.slice(i - 2, i + 1);
    if (trigram.includes('  ')) continue;

    const ks0 = keystrokes[i - 2];
    const ks1 = keystrokes[i - 1];
    const ks2 = keystrokes[i];
    const avgTransition = ((ks1.latency || 0) + (ks2.latency || 0)) / 2;
    const hasError = !ks0.isCorrect || !ks1.isCorrect || !ks2.isCorrect;

    if (!trigramStats[trigram]) {
      trigramStats[trigram] = {
        token: trigram,
        type: 'trigram',
        attempts: 0,
        errors: 0,
        totalLatency: 0,
        latencies: []
      };
    }

    trigramStats[trigram].attempts += 1;
    if (hasError) {
      trigramStats[trigram].errors += 1;
    }
    if (avgTransition > 0) {
      trigramStats[trigram].totalLatency += avgTransition;
      trigramStats[trigram].latencies.push(avgTransition);
    }
  }

  const scoreToken = (item) => {
    const avgLatency = item.attempts > 0 ? Math.round(item.totalLatency / item.attempts) : 0;
    item.avgLatencyMs = avgLatency;
    item.errorRate = item.attempts > 0 ? Number((item.errors / item.attempts).toFixed(2)) : 0;

    let score = 0;
    if (item.errors > 0) {
      score += item.errors * 250;
      score += item.errorRate * 350;
    }

    const latencyDelta = Math.max(0, avgLatency - baselineLatencyMs);
    if (latencyDelta > 40) {
      score += (latencyDelta / 15) * Math.min(item.attempts, 4);
    }

    item.score = Math.round(score);
    return item;
  };

  const scoredChars = Object.values(charStats).map(scoreToken);
  const scoredBigrams = Object.values(bigramStats).map(scoreToken);
  const scoredTrigrams = Object.values(trigramStats).map(scoreToken);

  const allCandidates = [...scoredChars, ...scoredBigrams, ...scoredTrigrams].filter((item) => {
    if (item.token.trim() === '') return false;
    const isSlow = item.avgLatencyMs > baselineLatencyMs * 1.35 && item.attempts >= 2 && item.avgLatencyMs - baselineLatencyMs >= 50;
    return item.errors > 0 || isSlow;
  });

  allCandidates.sort((a, b) => b.score - a.score);

  const selected = [];
  const seenTokens = new Set();

  for (const candidate of allCandidates) {
    if (selected.length >= 5) break;
    if (seenTokens.has(candidate.token)) continue;

    selected.push({
      token: candidate.token,
      type: candidate.type,
      errors: candidate.errors,
      attempts: candidate.attempts,
      errorRate: candidate.errorRate,
      avgLatencyMs: candidate.avgLatencyMs,
      score: candidate.score
    });
    seenTokens.add(candidate.token);
  }

  return {
    topWeaknesses: selected,
    summary: {
      totalKeystrokes: keystrokes.length,
      baselineLatencyMs,
      totalErrors: keystrokes.filter(k => !k.isCorrect).length,
      charStats,
      bigramStats,
      trigramStats
    }
  };
}

module.exports = { analyzeWeaknesses };
