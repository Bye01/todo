import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config'

let db: Database.Database | null = null

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true })
    db = new Database(config.databasePath)
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    migrate(db)
  }

  return db
}

export function closeDb() {
  db?.close()
  db = null
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_user_completed ON todos(user_id, completed);
  `)
}
