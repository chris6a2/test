/**
 * SQLite Database Layer
 *
 * Handles all database operations using better-sqlite3
 */

import Database from 'better-sqlite3';
import path from 'path';
import { Article, ArticleInsert, ArticleUpdate, Settings } from '@/types';

// Database file location
const DB_PATH = path.join(process.cwd(), 'data', 'editorial.db');

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Get or create database connection
 */
export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

/**
 * Initialize database schema
 */
function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('news', 'evergreen')),
      title TEXT NOT NULL,
      subheading TEXT,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      sources TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(type);
    CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);
  `);

  // Initialize default settings if not present
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  stmt.run('api_key', '');
  stmt.run('model', 'claude-sonnet-4-20250514');
}

/**
 * Parse article row from database
 */
function parseArticleRow(row: Record<string, unknown>): Article {
  return {
    ...row,
    tags: JSON.parse(row.tags as string || '[]'),
    sources: JSON.parse(row.sources as string || '[]'),
  } as Article;
}

// ============================================================
// Article Operations
// ============================================================

/**
 * Get all articles, optionally filtered by status
 */
export function getArticles(status?: string): Article[] {
  const db = getDb();

  let query = 'SELECT * FROM articles';
  const params: string[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map(parseArticleRow);
}

/**
 * Get a single article by ID
 */
export function getArticle(id: number): Article | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? parseArticleRow(row) : null;
}

/**
 * Create a new article
 */
export function createArticle(article: ArticleInsert): Article {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO articles (type, title, subheading, content, category, tags, sources, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    article.type,
    article.title,
    article.subheading || null,
    article.content,
    article.category,
    JSON.stringify(article.tags || []),
    JSON.stringify(article.sources || []),
    article.status || 'draft'
  );

  return getArticle(result.lastInsertRowid as number)!;
}

/**
 * Update an existing article
 */
export function updateArticle(id: number, updates: ArticleUpdate): Article | null {
  const db = getDb();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.subheading !== undefined) {
    fields.push('subheading = ?');
    values.push(updates.subheading);
  }
  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.tags !== undefined) {
    fields.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.sources !== undefined) {
    fields.push('sources = ?');
    values.push(JSON.stringify(updates.sources));
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length === 0) {
    return getArticle(id);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getArticle(id);
}

/**
 * Delete an article
 */
export function deleteArticle(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================
// Settings Operations
// ============================================================

/**
 * Get a setting by key
 */
export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/**
 * Set a setting value
 */
export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

/**
 * Get all settings
 */
export function getSettings(): Settings {
  return {
    api_key: getSetting('api_key') || '',
    model: getSetting('model') || 'claude-sonnet-4-20250514',
  };
}

/**
 * Update multiple settings
 */
export function updateSettings(settings: Partial<Settings>): void {
  if (settings.api_key !== undefined) {
    setSetting('api_key', settings.api_key);
  }
  if (settings.model !== undefined) {
    setSetting('model', settings.model);
  }
}
