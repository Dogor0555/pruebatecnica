'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const db = require('./db/connection');
const tasksRouter = require('./routes/tasks.routes');
const swaggerSpec = require('./config/swagger');
const {
  notFoundHandler,
  errorHandler,
} = require('./middlewares/error-handler');

async function buildApp({ dbOptions } = {}) {
  await db.init(dbOptions || {});

  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  app.use('/api/tasks', tasksRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = buildApp;