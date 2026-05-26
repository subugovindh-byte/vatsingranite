import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import config from '../config.js';

let db = null;

/**
 * Initialize database connection
 */
export const initializeDatabase = () => {
  if (db) return db;

  // Ensure data directory exists
  const dbDir = dirname(config.dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create database connection
  db = new Database(config.dbPath, {
    verbose: config.env === 'development' ? console.log : null
  });

  // Enable WAL mode for better concurrency
  if (config.dbWalMode) {
    db.pragma('journal_mode = WAL');
  }

  // Optimize SQLite settings
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 30000000000'); // 30GB memory-mapped I/O

  return db;
};

/**
 * Get database instance
 */
export const getDb = () => {
  if (!db) {
    initializeDatabase();
  }
  return db;
};

/**
 * Close database connection
 */
export const closeDatabase = () => {
  if (db) {
    db.close();
    db = null;
  }
};

/**
 * Execute a query with error handling
 */
export const query = (sql, params = []) => {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.all(params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Execute a single row query
 */
export const queryOne = (sql, params = []) => {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.get(params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Execute an insert/update/delete
 */
export const execute = (sql, params = []) => {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.run(params);
  } catch (error) {
    console.error('Database execute error:', error);
    throw error;
  }
};

/**
 * Execute a transaction
 */
export const transaction = (callback) => {
  const db = getDb();
  const trx = db.transaction(callback);
  return trx();
};

export default {
  initializeDatabase,
  getDb,
  closeDatabase,
  query,
  queryOne,
  execute,
  transaction
};
