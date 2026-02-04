/**
 * IndexedDB Storage Layer
 *
 * Client-side database for PWA - replaces SQLite for browser compatibility
 */

import { Article, ArticleInsert, ArticleUpdate, Settings } from '@/types';

const DB_NAME = 'ai-editorial-db';
const DB_VERSION = 1;

// Store names
const ARTICLES_STORE = 'articles';
const SETTINGS_STORE = 'settings';

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create articles store
      if (!db.objectStoreNames.contains(ARTICLES_STORE)) {
        const articlesStore = db.createObjectStore(ARTICLES_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        articlesStore.createIndex('status', 'status', { unique: false });
        articlesStore.createIndex('type', 'type', { unique: false });
        articlesStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Create settings store
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Perform a database transaction
 */
async function withTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (stores: { [key: string]: IDBObjectStore }) => Promise<T>
): Promise<T> {
  const db = await openDatabase();
  const storeNameArray = Array.isArray(storeNames) ? storeNames : [storeNames];
  const transaction = db.transaction(storeNameArray, mode);

  const stores: { [key: string]: IDBObjectStore } = {};
  storeNameArray.forEach((name) => {
    stores[name] = transaction.objectStore(name);
  });

  try {
    const result = await callback(stores);
    return result;
  } finally {
    db.close();
  }
}

/**
 * Wrap IDBRequest in a Promise
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// Article Operations
// ============================================================

/**
 * Get all articles, optionally filtered by status
 */
export async function getArticles(status?: string): Promise<Article[]> {
  return withTransaction(ARTICLES_STORE, 'readonly', async (stores) => {
    const store = stores[ARTICLES_STORE];
    const articles: Article[] = await promisifyRequest(store.getAll());

    // Filter by status if provided
    let filtered = status
      ? articles.filter((a) => a.status === status)
      : articles;

    // Sort by created_at descending
    filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return filtered;
  });
}

/**
 * Get a single article by ID
 */
export async function getArticle(id: number): Promise<Article | null> {
  return withTransaction(ARTICLES_STORE, 'readonly', async (stores) => {
    const store = stores[ARTICLES_STORE];
    const article = await promisifyRequest(store.get(id));
    return article || null;
  });
}

/**
 * Create a new article
 */
export async function createArticle(article: ArticleInsert): Promise<Article> {
  return withTransaction(ARTICLES_STORE, 'readwrite', async (stores) => {
    const store = stores[ARTICLES_STORE];
    const now = new Date().toISOString();

    const newArticle = {
      ...article,
      tags: article.tags || [],
      sources: article.sources || [],
      status: article.status || 'draft',
      created_at: now,
      updated_at: now,
    };

    const id = await promisifyRequest(store.add(newArticle));

    return {
      ...newArticle,
      id: id as number,
    } as Article;
  });
}

/**
 * Update an existing article
 */
export async function updateArticle(
  id: number,
  updates: ArticleUpdate
): Promise<Article | null> {
  return withTransaction(ARTICLES_STORE, 'readwrite', async (stores) => {
    const store = stores[ARTICLES_STORE];
    const existing = await promisifyRequest(store.get(id));

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await promisifyRequest(store.put(updated));
    return updated as Article;
  });
}

/**
 * Delete an article
 */
export async function deleteArticle(id: number): Promise<boolean> {
  return withTransaction(ARTICLES_STORE, 'readwrite', async (stores) => {
    const store = stores[ARTICLES_STORE];
    const existing = await promisifyRequest(store.get(id));

    if (!existing) {
      return false;
    }

    await promisifyRequest(store.delete(id));
    return true;
  });
}

// ============================================================
// Settings Operations
// ============================================================

/**
 * Get a setting by key
 */
export async function getSetting(key: string): Promise<string | null> {
  return withTransaction(SETTINGS_STORE, 'readonly', async (stores) => {
    const store = stores[SETTINGS_STORE];
    const result = await promisifyRequest(store.get(key));
    return result?.value ?? null;
  });
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<void> {
  return withTransaction(SETTINGS_STORE, 'readwrite', async (stores) => {
    const store = stores[SETTINGS_STORE];
    await promisifyRequest(store.put({ key, value }));
  });
}

/**
 * Get all settings
 */
export async function getSettings(): Promise<Settings> {
  return withTransaction(SETTINGS_STORE, 'readonly', async (stores) => {
    const store = stores[SETTINGS_STORE];
    const all = await promisifyRequest(store.getAll());

    const settings: Settings = {
      api_key: '',
      model: 'claude-sonnet-4-20250514',
    };

    all.forEach((item: { key: string; value: string }) => {
      if (item.key === 'api_key') settings.api_key = item.value;
      if (item.key === 'model') settings.model = item.value;
    });

    return settings;
  });
}

/**
 * Update multiple settings
 */
export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  return withTransaction(SETTINGS_STORE, 'readwrite', async (stores) => {
    const store = stores[SETTINGS_STORE];

    if (settings.api_key !== undefined) {
      await promisifyRequest(store.put({ key: 'api_key', value: settings.api_key }));
    }
    if (settings.model !== undefined) {
      await promisifyRequest(store.put({ key: 'model', value: settings.model }));
    }
  });
}

/**
 * Check if database is available (for SSR detection)
 */
export function isClientSide(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}
