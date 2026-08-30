const { findBestFallbackDrill, fallbackDrills } = require('../data/fallbackDrills');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODELS = ["z-ai/glm-5.2:free", "google/gemma-4-31b-it:free"];

/**
 * Clean and parse JSON response from LLM
 */
function extractJsonFromResponse(rawText) {
  if (!rawText) return null;

  try {
    // 1. Try direct parse
    return JSON.parse(rawText.trim());
  } catch {
    // 2. Try removing markdown code blocks ```json ... ```
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // continue
      }
    }

    // 3. Try finding first { and last }
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
      } catch {
        // continue
      }
    }
  }

  return null;
}

/**
 * Generate an AI typing drill passage tailored to specific user weaknesses.
 * @param {Array} weaknesses - Array of weakness objects or string tokens (e.g. [{ token: 'th', type: 'bigram', errors: 2, avgLatencyMs: 340 }])
 * @returns {Promise<Object>} Formatted passage object ready for typing
 */
async function generateDrill(weaknesses = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // If no API key is set, immediately return high-quality curated fallback drill
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_openrouter_api_key_here') {
    console.warn('[AI Drill] OPENROUTER_API_KEY is not configured. Using curated fallback drill.');
    const matched = findBestFallbackDrill(weaknesses);
    return {
      ...matched,
      isAiGenerated: false
    };
  }

  // Format weaknesses for prompt
  const tokensList = Array.isArray(weaknesses)
    ? weaknesses.map(w => {
        if (typeof w === 'string') return `"${w}"`;
        const details = [];
        if (w.errors) details.push(`${w.errors} error${w.errors > 1 ? 's' : ''}`);
        if (w.avgLatencyMs) details.push(`${w.avgLatencyMs}ms avg latency`);
        return `"${w.token}" (${w.type || 'token'}${details.length ? ': ' + details.join(', ') : ''})`;
      })
    : [];

  const focusSummary = tokensList.length > 0
    ? tokensList.join(', ')
    : 'fluid keystroke transitions and steady speed';

  const systemPrompt = `You are an expert typing coach for Flow, a zen speed-typing application.
Your goal is to generate custom typing drills designed to reinforce muscle memory and rhythmic flow for targeted weak keystrokes, bigrams, and trigrams.`;

  const userPrompt = `The user needs a targeted typing drill focusing on these identified weak spots:
${focusSummary}

Instructions:
1. Compose a cohesive, natural English passage of 35 to 55 words (roughly 30-45 seconds of typing).
2. Heavily over-represent words containing the targeted keys, bigrams, and trigrams in natural, philosophical, zen, or craft-themed sentences.
3. DO NOT use gibberish, repetitive nonsense lists (e.g., avoid "th th th ing ing"), or broken grammar. All words must be real, meaningful words.
4. Output strictly valid JSON matching this schema:
{
  "title": "Short poetic or descriptive drill title (e.g. AI Drill: Fluid Transitions)",
  "content": "The drill text to type...",
  "focus": ["target1", "target2"]
}`;

  // Attempt request with OpenRouter models
  for (const modelName of AI_MODELS) {
    try {
      console.log(`[AI Drill] Requesting drill generation via OpenRouter model: ${modelName}`);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Flow Zen Typing',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          models: AI_MODELS, // OpenRouter fallback support
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        }),
        signal: AbortSignal.timeout(12000) // 12 second timeout
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`[AI Drill] OpenRouter request to ${modelName} failed with status ${response.status}:`, errorBody);
        continue; // Try next model or fallback
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        console.warn(`[AI Drill] Empty response from model ${modelName}`);
        continue;
      }

      const parsed = extractJsonFromResponse(rawContent);

      if (parsed && parsed.content && typeof parsed.content === 'string' && parsed.content.trim().length >= 30) {
        const cleanedContent = parsed.content.trim().replace(/\s+/g, ' ');
        const focusTokens = Array.isArray(parsed.focus) && parsed.focus.length > 0
          ? parsed.focus
          : (Array.isArray(weaknesses) ? weaknesses.map(w => (typeof w === 'string' ? w : w.token)) : []);

        console.log(`[AI Drill] Successfully generated drill via ${modelName}: "${parsed.title || 'AI Drill'}"`);

        return {
          id: `ai-drill-${Date.now()}`,
          title: parsed.title || 'AI Drill: Target Flow',
          category: 'drill',
          difficulty: 'medium',
          source: `Flow AI (${modelName.split('/')[1] || 'AI Coach'})`,
          content: cleanedContent,
          focus: focusTokens,
          isAiGenerated: true
        };
      } else {
        console.warn(`[AI Drill] Could not extract valid drill JSON from response:`, rawContent);
      }
    } catch (err) {
      console.warn(`[AI Drill] Error generating drill with model ${modelName}:`, err.message);
    }
  }

  // If all AI attempts fail, use curated fallback
  console.log('[AI Drill] Falling back to curated drill bank.');
  const fallback = findBestFallbackDrill(weaknesses);
  return {
    ...fallback,
    isAiGenerated: false
  };
}

/**
 * Generate intelligent procedural progress narration based on telemetry metrics
 */
function generateFallbackNarration(sessions = [], weaknesses = []) {
  if (!sessions || sessions.length === 0) {
    return {
      headline: 'Begin Your Practice',
      narration: 'Every journey of mastery begins with a single mindful keystroke. Take your time, breathe smoothly, and let your hands find their natural cadence.',
      focusRecommendation: 'Focus on clean accuracy and comfortable hand posture before chasing speed.',
      isAiGenerated: false
    };
  }

  const wpms = sessions.map(s => Number(s.wpm) || 0);
  const accuracies = sessions.map(s => Number(s.accuracy) || 0);
  const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
  const peakWpm = Math.max(...wpms);
  const latestWpm = wpms[0] || avgWpm;
  const avgAccuracy = Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length);
  
  // Compute trend (compare newest half vs oldest half)
  let trendText = 'steady';
  if (sessions.length >= 4) {
    const half = Math.floor(sessions.length / 2);
    const recentWpm = wpms.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const olderWpm = wpms.slice(half).reduce((a, b) => a + b, 0) / (sessions.length - half);
    const delta = recentWpm - olderWpm;
    if (delta >= 3) {
      trendText = `surging +${Math.round(delta)} WPM`;
    } else if (delta <= -3) {
      trendText = `easing -${Math.abs(Math.round(delta))} WPM`;
    }
  }

  // Format primary weakness
  const topWeakness = Array.isArray(weaknesses) && weaknesses.length > 0
    ? (typeof weaknesses[0] === 'string' ? weaknesses[0] : weaknesses[0].token)
    : null;

  let headline = 'Steady Mind, Steady Rhythm';
  let narration = '';
  let focusRecommendation = '';

  if (avgWpm >= 80 && avgAccuracy >= 96) {
    headline = 'Transcendent Velocity';
    narration = `You are maintaining high-velocity flow with an average of ${avgWpm} WPM and sharp ${avgAccuracy}% accuracy across ${sessions.length} sessions (peaking at ${peakWpm} WPM). Your rhythm is exceptionally stable.${topWeakness ? ` Minor latency detected around "${topWeakness}"—letting your fingers glide through this transition will unlock even higher peaks.` : ' Continue maintaining light finger pressure to prevent tension.'}`;
    focusRecommendation = topWeakness ? `Smooth out the "${topWeakness}" transition.` : 'Maintain effortless finger relaxation at high speeds.';
  } else if (avgAccuracy >= 95) {
    headline = 'Harmonious Precision';
    narration = `Your consistency is outstanding, holding an average accuracy of ${avgAccuracy}% at ${avgWpm} WPM (${trendText}). High precision creates the muscle memory required for explosive speed.${topWeakness ? ` Targeting "${topWeakness}" with mindful micro-pauses will eliminate remaining hesitations.` : ' Gradually relax your shoulders to let speed increase naturally.'}`;
    focusRecommendation = topWeakness ? `Refine the "${topWeakness}" keystroke.` : 'Maintain 95%+ precision as you gently ramp up cadence.';
  } else if (avgAccuracy < 90) {
    headline = 'Cultivate Stillness First';
    narration = `You reached ${peakWpm} WPM, but your average accuracy is sitting at ${avgAccuracy}%. Rushing ahead often introduces stutter; dialing back your pace by 10% will establish cleaner neural pathways.${topWeakness ? ` Pay special attention to "${topWeakness}", where repeated miskeys occur.` : ' Aim for 96%+ accuracy before pushing for raw velocity.'}`;
    focusRecommendation = topWeakness ? `Slow down through "${topWeakness}" to build accurate muscle memory.` : 'Prioritize clean keystrokes over raw speed.';
  } else {
    headline = 'Flowing Progression';
    narration = `Across your recent ${sessions.length} sessions, your speed is averaging ${avgWpm} WPM with solid ${avgAccuracy}% accuracy (peaking at ${peakWpm} WPM). Your flow state is actively developing.${topWeakness ? ` Smoothing out transitions like "${topWeakness}" will help you maintain continuous momentum.` : ' Keep your keystrokes rhythmic like a steady heartbeat.'}`;
    focusRecommendation = topWeakness ? `Drill "${topWeakness}" transitions with steady rhythm.` : 'Focus on steady cadence across all word boundaries.';
  }

  return {
    headline,
    narration,
    focusRecommendation,
    isAiGenerated: false
  };
}

/**
 * Generate AI-powered progress narration summarizing user trends and weaknesses.
 * @param {Object} params - { sessions: Array, weaknesses: Array }
 * @returns {Promise<Object>} { headline, narration, focusRecommendation, isAiGenerated }
 */
async function generateProgressNarration({ sessions = [], weaknesses = [] } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!sessions || sessions.length === 0) {
    return generateFallbackNarration(sessions, weaknesses);
  }

  // If no API key configured, use procedural engine immediately
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_openrouter_api_key_here') {
    console.log('[AI Narration] OPENROUTER_API_KEY not configured. Generating procedural insight.');
    return generateFallbackNarration(sessions, weaknesses);
  }

  // Prepare structured statistics
  const wpms = sessions.map(s => Number(s.wpm) || 0);
  const accuracies = sessions.map(s => Number(s.accuracy) || 0);
  const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
  const peakWpm = Math.max(...wpms);
  const latestWpm = wpms[0] || avgWpm;
  const avgAccuracy = Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length);

  const topWeaknessesList = Array.isArray(weaknesses)
    ? weaknesses.slice(0, 4).map(w => {
        if (typeof w === 'string') return `"${w}"`;
        const parts = [];
        if (w.errors) parts.push(`${w.errors} errors`);
        if (w.avgLatencyMs) parts.push(`${w.avgLatencyMs}ms latency`);
        return `"${w.token}" (${w.type || 'token'}: ${parts.join(', ') || 'hesitation'})`;
      }).join(', ')
    : 'None detected';

  const systemPrompt = `You are the expert zen typing coach for Flow, a minimalist speed-typing application.
Your goal is to provide concise, mindful, and actionable feedback based on the user's recent typing sessions and keystroke weaknesses.
Keep the tone encouraging, philosophical yet highly practical, and zen-aligned.`;

  const userPrompt = `Generate a progress narration for the user based on these recent telemetry stats:
- Total sessions analyzed: ${sessions.length}
- Average Speed: ${avgWpm} WPM (Peak: ${peakWpm} WPM, Latest: ${latestWpm} WPM)
- Average Accuracy: ${avgAccuracy}%
- Identified Weak Spots: ${topWeaknessesList}

Instructions:
1. Write a 2 to 4 sentence plain-language summary of trends and rhythm.
2. Note their speed and accuracy balance, mention positive momentum or areas needing mindfulness, and give a specific actionable tip regarding their weak keys/bigrams if present.
3. Output strictly valid JSON matching this schema:
{
  "headline": "A short 3-5 word inspirational/descriptive title (e.g. Finding Your Velocity, Harmonious Rhythm)",
  "narration": "The 2-4 sentence plain language feedback...",
  "focusRecommendation": "A short 1-sentence actionable drill recommendation"
}`;

  for (const modelName of AI_MODELS) {
    try {
      console.log(`[AI Narration] Requesting progress narration via model: ${modelName}`);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Flow Zen Typing',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          models: AI_MODELS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 350
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[AI Narration] Model ${modelName} returned status ${response.status}:`, errText);
        continue;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) continue;

      const parsed = extractJsonFromResponse(rawContent);
      if (parsed && parsed.narration && typeof parsed.narration === 'string') {
        console.log(`[AI Narration] Successfully generated narration via ${modelName}: "${parsed.headline || 'Progress Insight'}"`);
        return {
          headline: parsed.headline || 'Zen Progress Insight',
          narration: parsed.narration.trim(),
          focusRecommendation: parsed.focusRecommendation || 'Maintain smooth rhythm and relaxed posture.',
          isAiGenerated: true,
          source: `Flow AI (${modelName.split('/')[1] || 'AI Coach'})`
        };
      }
    } catch (err) {
      console.warn(`[AI Narration] Error generating narration with ${modelName}:`, err.message);
    }
  }

  // Procedural fallback if all models fail
  console.log('[AI Narration] OpenRouter unavailable, using dynamic procedural narration.');
  return generateFallbackNarration(sessions, weaknesses);
}

module.exports = {
  generateDrill,
  generateProgressNarration,
  generateFallbackNarration,
  extractJsonFromResponse
};
