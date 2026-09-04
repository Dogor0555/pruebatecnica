'use strict';

const path = require('path');
const fs = require('fs');

module.exports = async function globalSetup() {
  require('dotenv').config();

  const envFile = path.join(__dirname, '..', '.env.test');
  if (fs.existsSync(envFile)) {
    require('dotenv').config({ path: envFile, override: true });
  }

  process.env.NODE_ENV = 'test';

  if (!process.env.TEST_DATABASE_URL && process.env.DATABASE_URL) {
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
  }

  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      'No se ha definido TEST_DATABASE_URL. Créala en .env o .env.test antes de ejecutar las pruebas.'
    );
  }
};