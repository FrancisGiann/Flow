const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { defaultPassages } = require('../data/seedPassages');

// Ensure db directory exists
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'flow.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS passages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      difficulty TEXT DEFAULT 'medium',
      source TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS typing_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passage_id INTEGER,
      passage_title TEXT,
      wpm REAL NOT NULL,
      raw_wpm REAL NOT NULL,
      accuracy REAL NOT NULL,
      elapsed_time_ms INTEGER NOT NULL,
      total_chars INTEGER NOT NULL,
      correct_chars INTEGER NOT NULL,
      error_count INTEGER NOT NULL,
      mode TEXT DEFAULT 'passage',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS keystrokes_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      char TEXT NOT NULL,
      expected_char TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES typing_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weakness_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      token_type TEXT NOT NULL, -- 'char', 'bigram', 'trigram'
      total_attempts INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      avg_latency_ms REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default passages if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM passages');
  const result = countStmt.get();

  if (result.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO passages (title, category, difficulty, source, content)
      VALUES (@title, @category, @difficulty, @source, @content)
    `);

    const insertMany = db.transaction((passages) => {
      for (const passage of passages) {
        insertStmt.run(passage);
      }
    });

    insertMany(defaultPassages);
    console.log(`[DB] Initialized database and seeded ${defaultPassages.length} passages.`);
  }
}

// Run schema initialization on load
initSchema();

module.exports = db;
