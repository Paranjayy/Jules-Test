// src/database.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs'); // Required for ensuring directory exists
// app module will be passed or required where this script is initialized if using app.getPath
// For now, this script defines the functions, main.js will initialize with 'app'

let db;

function initializeDatabase(appInstance) {
  if (db) return db; // Return existing instance if already initialized

  const dbDir = path.join(appInstance.getPath('userData'), 'OmniLaunchData');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'omniLaunch.db');
  
  db = new Database(dbPath, { /*verbose: console.log*/ });

  const schema = `
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type TEXT NOT NULL CHECK(content_type IN ('text', 'image', 'file', 'link', 'color')),
      data BLOB,
      preview_text TEXT,
      title TEXT,
      source_app_name TEXT,
      source_app_icon TEXT,
      folder_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_pasted_at DATETIME,
      times_pasted INTEGER DEFAULT 0,
      is_pinned BOOLEAN DEFAULT 0,
      metadata TEXT,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS clip_tags (
      clip_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (clip_id, tag_id),
      FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `;
  db.exec(schema);
  console.log(`Database initialized at ${dbPath}`);
  return db;
}

function getDb() {
  if (!db) {
    // This situation should ideally be avoided by initializing early in app lifecycle.
    // Throw an error or handle as appropriate if getDb is called before initialization.
    console.error("Database not initialized. Call initializeDatabase first.");
    // For safety, could try to initialize with a default app instance if available globally,
    // but explicit initialization is better.
    // For now, we'll rely on main.js to initialize it.
    return null; 
  }
  return db;
}

module.exports = { initializeDatabase, getDb };
