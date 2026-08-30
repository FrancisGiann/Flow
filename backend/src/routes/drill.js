const express = require('express');
const router = express.Router();
const { generateDrill } = require('../services/ai');
const { fallbackDrills, findBestFallbackDrill } = require('../data/fallbackDrills');

// POST /api/drill - Generate or select an AI-targeted drill based on user weaknesses
router.post('/drill', async (req, res) => {
  try {
    const { weaknesses = [] } = req.body;
    console.log('[Drill Route] Received drill request for weaknesses:', weaknesses);

    const drillPassage = await generateDrill(weaknesses);
    return res.json({ passage: drillPassage });
  } catch (error) {
    console.error('Error generating drill:', error);
    // Fallback to local curated drill if unexpected error occurs
    const fallback = findBestFallbackDrill(req.body?.weaknesses || []);
    return res.json({ passage: fallback });
  }
});

// GET /api/drill - Get a random or weakness-targeted fallback drill
router.get('/drill', async (req, res) => {
  try {
    const { focus } = req.query;
    const weaknesses = focus ? focus.split(',').map(t => ({ token: t.trim() })) : [];
    const drillPassage = await generateDrill(weaknesses);
    return res.json({ passage: drillPassage });
  } catch (error) {
    console.error('Error getting drill:', error);
    const fallback = fallbackDrills[Math.floor(Math.random() * fallbackDrills.length)];
    return res.json({ passage: fallback });
  }
});

// GET /api/drills - List curated drills
router.get('/drills', (req, res) => {
  try {
    return res.json({ drills: fallbackDrills });
  } catch (error) {
    console.error('Error listing drills:', error);
    return res.status(500).json({ error: 'Failed to retrieve drills' });
  }
});

module.exports = router;
