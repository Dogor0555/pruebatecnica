'use strict';

const db = require('../db/connection');

const COLUMNS =
  'id, title, description, is_completed, created_at, updated_at';

function toCamel(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isCompleted: row.is_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findAll() {
  const { rows } = await db
    .getPool()
    .query(`SELECT ${COLUMNS} FROM tasks ORDER BY id ASC`);
  return rows.map(toCamel);
}

async function findById(id) {
  const { rows } = await db
    .getPool()
    .query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
  return toCamel(rows[0]);
}

async function create({ title, description = '', isCompleted = false }) {
  const { rows } = await db.getPool().query(
    `INSERT INTO tasks (title, description, is_completed)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [title, description, !!isCompleted]
  );
  return toCamel(rows[0]);
}

async function update(
  id,
  { title, description, isCompleted } = {}
) {
  const { rows } = await db.getPool().query(
    `UPDATE tasks
       SET title        = COALESCE($2, title),
           description  = COALESCE($3, description),
           is_completed = COALESCE($4, is_completed),
           updated_at   = NOW()
       WHERE id = $1
       RETURNING ${COLUMNS}`,
    [
      id,
      title === undefined ? null : title,
      description === undefined ? null : description,
      isCompleted === undefined ? null : !!isCompleted,
    ]
  );

  return toCamel(rows[0]) || null;
}

async function remove(id) {
  const { rowCount } = await db
    .getPool()
    .query('DELETE FROM tasks WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };