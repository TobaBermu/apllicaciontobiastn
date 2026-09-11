const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "popups.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS popups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    keyword TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'contains', -- 'contains' | 'equals' | 'starts_with'
    delay_seconds INTEGER NOT NULL DEFAULT 0,
    title TEXT,
    message TEXT,
    image_url TEXT,
    cta_text TEXT,
    cta_url TEXT,
    show_once_per_session INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
