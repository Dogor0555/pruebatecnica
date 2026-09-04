'use strict';

const buildApp = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const app = buildApp();

const server = app.listen(PORT, () => {
  console.log(`Tasks API escuchando en http://localhost:${PORT}`);
  console.log(`Swagger UI:    http://localhost:${PORT}/api/docs`);
  console.log(`OpenAPI JSON:  http://localhost:${PORT}/api/docs.json`);
});

function shutdown(signal) {
  console.log(`\nRecibida señal ${signal}, cerrando servidor...`);
  server.close(() => {
    require('./db/connection').close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));