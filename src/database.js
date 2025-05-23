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
      last_edited_at DATETIME, -- Added last_edited_at
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS clip_tags (
      clip_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (clip_id, tag_id),
      FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS paste_stack_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      name TEXT -- Optional name for the run, e.g., "Work Session March 5th"
    );

    CREATE TABLE IF NOT EXISTS paste_stack_run_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, -- Added primary key for this table itself
      run_id INTEGER NOT NULL,
      clip_id INTEGER NOT NULL, -- This will store the original clip's ID
      sequence_order INTEGER NOT NULL,
      -- No need to store content_type, data, preview_text etc. here if clip_id links to 'clips' table.
      -- If clips can be deleted from main history but we want to preserve stack item content, then denormalize.
      -- For now, assume clips in 'clips' table are somewhat persistent or their deletion is acceptable for stack history.
      FOREIGN KEY (run_id) REFERENCES paste_stack_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE 
    );

    CREATE TABLE IF NOT EXISTS snippet_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      folder_id INTEGER,
      keyword TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME,
      times_used INTEGER DEFAULT 0,
      FOREIGN KEY (folder_id) REFERENCES snippet_folders(id) ON DELETE SET NULL
    );
  `;
  // Check if last_edited_at column exists in clips table and add it if not
  // This is a simple way to handle migration for existing databases.
  // More robust migration systems would track schema versions.
  try {
    const columnCheck = db.prepare("SELECT last_edited_at FROM clips LIMIT 1").get();
  } catch (error) {
    if (error.message.includes("no such column")) {
      console.log("Adding last_edited_at column to clips table...");
      db.exec("ALTER TABLE clips ADD COLUMN last_edited_at DATETIME");
    } else {
      // Other error
      console.error("Error checking for last_edited_at column:", error);
    }
  }

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
