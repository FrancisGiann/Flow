/**
 * Predefined Curated Fallback Drills
 * Used when AI drill generation fails, is offline, or OPENROUTER_API_KEY is not configured.
 */

const fallbackDrills = [
  {
    id: "drill-th-the-ing",
    title: "Drill: Fluid Transitions (th, ing)",
    category: "drill",
    difficulty: "medium",
    source: "Flow Drill Bank",
    focus: ["th", "the", "ing"],
    content: "Thinking clearly brings thrilling insights. Through everything we do, breathing deeply and practicing thoughtfully strengthens our rhythm and inner stillness."
  },
  {
    id: "drill-str-spr-scr",
    title: "Drill: Consonant Clusters (str, spr, scr)",
    category: "drill",
    difficulty: "hard",
    source: "Flow Drill Bank",
    focus: ["str", "spr", "scr", "st"],
    content: "Strong structures spring from strict discipline. The scribe wrote straightforward scripts across the spread of parchment without straying from the stream."
  },
  {
    id: "drill-qu-x-z-j",
    title: "Drill: Precision Reaches (q, x, z, j)",
    category: "drill",
    difficulty: "hard",
    source: "Flow Drill Bank",
    focus: ["qu", "x", "z", "j"],
    content: "Quiet breezes graze the hazy horizon. The agile journey requires quick judgment and exact reflexes to maximize every exquisite moment of balance."
  },
  {
    id: "drill-ion-ment-ent",
    title: "Drill: Common Endings (ion, ment, ent)",
    category: "drill",
    difficulty: "medium",
    source: "Flow Drill Bank",
    focus: ["ion", "ment", "ent"],
    content: "Continuous movement and silent devotion create profound development. Every intentional action yields significant improvement and quiet contentment."
  },
  {
    id: "drill-ea-ou-ai-ee",
    title: "Drill: Vowel Pairs (ea, ou, ai, ee)",
    category: "drill",
    difficulty: "easy",
    source: "Flow Drill Bank",
    focus: ["ea", "ou", "ai", "ee"],
    content: "Peaceful streams reach out through deep green valleys. We maintain quiet breathe with each fleeting season and feel the gentle warmth of clear dawn."
  },
  {
    id: "drill-pr-tr-cr-br",
    title: "Drill: Blend Velocity (pr, tr, cr, br)",
    category: "drill",
    difficulty: "medium",
    source: "Flow Drill Bank",
    focus: ["pr", "tr", "cr", "br"],
    content: "True practice brings bright clarity. The brave traveler created brilliant traces across broad trails, discovering profound tranquility in every craft."
  },
  {
    id: "drill-code-syntax",
    title: "Drill: Code Symbols & Logic",
    category: "drill",
    difficulty: "hard",
    source: "Flow Drill Bank",
    focus: ["{", "}", "(", ")", ";", "_"],
    content: "const flow_state = (focus, breath) => { return focus && breath ? true : false; }; function process_keys(stream) { return stream.map(x => x.trim()); }"
  },
  {
    id: "drill-general-zen",
    title: "Drill: Mindful Cadence",
    category: "drill",
    difficulty: "medium",
    source: "Flow Drill Bank",
    focus: ["flow", "rhythm", "zen"],
    content: "Allow each finger to find its key with soft assurance. When haste is released, speed flows naturally from effortless precision and steady tempo."
  }
];

/**
 * Find the best fallback drill matching the given weakness tokens
 */
function findBestFallbackDrill(weaknesses = []) {
  if (!weaknesses || weaknesses.length === 0) {
    const randomIndex = Math.floor(Math.random() * fallbackDrills.length);
    return fallbackDrills[randomIndex];
  }

  const tokens = weaknesses.map(w => (typeof w === 'string' ? w : w.token || '').toLowerCase());

  let bestMatch = null;
  let highestScore = -1;

  for (const drill of fallbackDrills) {
    let score = 0;
    const focusList = (drill.focus || []).map(f => f.toLowerCase());
    const content = drill.content.toLowerCase();

    for (const token of tokens) {
      if (!token) continue;
      // Exact focus match
      if (focusList.includes(token)) score += 5;
      // Focus contains token
      if (focusList.some(f => f.includes(token) || token.includes(f))) score += 3;
      // Content contains token
      if (content.includes(token)) score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = drill;
    }
  }

  return bestMatch || fallbackDrills[0];
}

module.exports = {
  fallbackDrills,
  findBestFallbackDrill
};
