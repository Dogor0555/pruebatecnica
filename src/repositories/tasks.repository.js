'use strict';

const db = require('../db/connection');

function toCamel(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isCompleted: row.isCompleted === 1 || row.isCompleted === true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function findAll() {
  const rows = db
    .getDb()
    .prepare('SELECT * FROM tasks ORDER BY id ASC')
    .all();
  return rows.map(toCamel);
}

function findById(id) {
  const row = db
    .getDb()
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .get(id);
  return toCamel(row);
}

function create({ title, description = '', isCompleted = false }) {
  const stmt = db
    .getDb()
    .prepare(
      `INSERT INTO tasks (title, description, isCompleted)
       VALUES (@title, @description, @isCompleted)`
    );
  const info = stmt.run({
    title,
    description,
    isCompleted: isCompleted ? 1 : 0,
  });
  return findById(info.lastInsertRowid);
}

function update(id, { title, description, isCompleted }) {
  const existing = findById(id);
  if (!existing) return null;

  const next = {
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    isCompleted:
      isCompleted !== undefined
        ? isCompleted
            ? 1
            : 0
        : existing.isCompleted
        ? 1
        : 0,
  };

  db.getDb()
    .prepare(
      `UPDATE tasks
       SET title = @title,
           description = @description,
           isCompleted = @isCompleted,
           updatedAt = datetime('now')
       WHERE id = @id`
    )
    .run({ id, ...next });

  return findById(id);
}

function remove(id) {
  const info = db.getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return info.changes > 0;
}

module.exports = { findAll, findById, create, update, remove };