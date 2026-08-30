const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/passages/random - Get a random passage
router.get('/random', (req, res) => {
  try {
    const queryCategory = req.query.category;
    const queryDifficulty = req.query.difficulty;

    let sql = 'SELECT * FROM passages';
    const params = [];
    const conditions = [];

    if (queryCategory && queryCategory !== 'all') {
      conditions.push('category = ?');
      params.push(queryCategory);
    }
    if (queryDifficulty && queryDifficulty !== 'all') {
      conditions.push('difficulty = ?');
      params.push(queryDifficulty);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY RANDOM() LIMIT 1';

    const passage = db.prepare(sql).get(...params);

    if (!passage) {
      // Fallback to any passage if specific filter has no results
      const fallback = db.prepare('SELECT * FROM passages ORDER BY RANDOM() LIMIT 1').get();
      return res.json({ passage: fallback });
    }

    return res.json({ passage });
  } catch (error) {
    console.error('Error fetching random passage:', error);
    return res.status(500).json({ error: 'Failed to retrieve passage' });
  }
});

// GET /api/passages - List passages
router.get('/', (req, res) => {
  try {
    const { category, difficulty, limit = 50 } = req.query;
    let sql = 'SELECT id, title, category, difficulty, source, LENGTH(content) as char_count FROM passages';
    const params = [];
    const conditions = [];

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (difficulty && difficulty !== 'all') {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(Number(limit));

    const passages = db.prepare(sql).all(...params);
    return res.json({ passages });
  } catch (error) {
    console.error('Error listing passages:', error);
    return res.status(500).json({ error: 'Failed to retrieve passages' });
  }
});

// GET /api/passages/:id - Get specific passage
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const passage = db.prepare('SELECT * FROM passages WHERE id = ?').get(id);

    if (!passage) {
      return res.status(404).json({ error: 'Passage not found' });
    }

    return res.json({ passage });
  } catch (error) {
    console.error('Error retrieving passage:', error);
    return res.status(500).json({ error: 'Failed to retrieve passage' });
  }
});

// POST /api/passages - Add custom passage
router.post('/', (req, res) => {
  try {
    const { title, content, category = 'custom', difficulty = 'medium', source = 'Custom' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO passages (title, category, difficulty, source, content)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(title || 'Untitled Passage', category, difficulty, source, content.trim());

    return res.status(201).json({
      success: true,
      passage: {
        id: info.lastInsertRowid,
        title: title || 'Untitled Passage',
        category,
        difficulty,
        source,
        content: content.trim()
      }
    });
  } catch (error) {
    console.error('Error creating passage:', error);
    return res.status(500).json({ error: 'Failed to create passage' });
  }
});

module.exports = router;
