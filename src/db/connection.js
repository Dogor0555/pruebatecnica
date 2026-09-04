'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbInstance = null;

function getDataDir() {
  const configured = process.env.DATA_DIR;
  if (configured) return configured;
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function init({ filename = null, inMemory = false } = {}) {
  const dbFile =
    filename ||
    (inMemory ? ':memory:' : path.join(getDataDir(), 'tasks.db'));

  const instance = new Database(dbFile);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');

  instance.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      description  TEXT    NOT NULL DEFAULT '',
      isCompleted  INTEGER NOT NULL DEFAULT 0,
      createdAt    TEXT    NOT NULL DEFAULT (datetime('now')),
      updatedAt    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  dbInstance = instance;
  return instance;
}

function getDb() {
  if (!dbInstance) init();
  return dbInstance;
}

function close() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = { init, getDb, close };