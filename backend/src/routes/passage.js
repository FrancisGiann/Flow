const express = require('express');
const router = express.Router();
const { defaultPassages } = require('../data/seedPassages');
const { fallbackDrills, findBestFallbackDrill } = require('../data/fallbackDrills');
const { generateDrill } = require('../services/ai');

// GET /api/passage - Get a single passage (random or filtered, including drills)
router.get('/passage', async (req, res) => {
  try {
    const { category, difficulty, id, type } = req.query;

    // Handle drill category/type
    if (type === 'drill' || category === 'drill') {
      const drill = await generateDrill();
      return res.json({ passage: drill });
    }

    if (id) {
      const found = defaultPassages.find(p => p.id === Number(id));
      if (found) {
        return res.json({ passage: found });
      }
    }

    let pool = defaultPassages;
    if (category && category !== 'all') {
      pool = pool.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (difficulty && difficulty !== 'all') {
      pool = pool.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    if (pool.length === 0) {
      pool = defaultPassages;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const passage = pool[randomIndex];

    return res.json({ passage });
  } catch (error) {
    console.error('Error fetching passage:', error);
    return res.status(500).json({ error: 'Failed to retrieve passage' });
  }
});

// GET /api/passages - List all available passages
router.get('/passages', (req, res) => {
  try {
    const { category, difficulty } = req.query;
    let list = defaultPassages;

    if (category && category !== 'all') {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (difficulty && difficulty !== 'all') {
      list = list.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    return res.json({ passages: list });
  } catch (error) {
    console.error('Error listing passages:', error);
    return res.status(500).json({ error: 'Failed to list passages' });
  }
});

// GET /api/passages/:id - Get specific passage by id
router.get('/passages/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const passage = defaultPassages.find(p => p.id === id);

    if (!passage) {
      return res.status(404).json({ error: 'Passage not found' });
    }

    return res.json({ passage });
  } catch (error) {
    console.error('Error retrieving passage:', error);
    return res.status(500).json({ error: 'Failed to retrieve passage' });
  }
});

module.exports = router;
