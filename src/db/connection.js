'use strict';

require('dotenv').config();

const { Pool } = require('pg');

let pool = null;

function buildPool({ connectionString, ssl } = {}) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error(
      'No se ha definido ninguna URL de Postgres. Define DATABASE_URL o TEST_DATABASE_URL en el archivo .env.'
    );
  }

  const useSsl =
    ssl !== undefined
      ? ssl
      : url.includes('sslmode=require') ||
        url.includes('ssl=true') ||
        process.env.PGSSL === 'true';

  return new Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS tasks (
    id           SERIAL       PRIMARY KEY,
    title        TEXT         NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    is_completed BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
`;

async function init(options = {}) {
  if (pool) return pool;

  pool = buildPool(options);

  await pool.query(SCHEMA_SQL);
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error(
      'La conexión a Postgres no ha sido inicializada. Llama a db.init() primero.'
    );
  }
  return pool;
}

async function reset() {
  if (!pool) return;
  await pool.query('TRUNCATE TABLE tasks RESTART IDENTITY');
}

async function close() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

module.exports = { init, getPool, reset, close };