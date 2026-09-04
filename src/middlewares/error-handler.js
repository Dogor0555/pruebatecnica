'use strict';

const { ValidationError, NotFoundError } = require('../errors');

function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: 'Not Found',
    message: `La ruta ${req.method} ${req.originalUrl} no existe.`,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'El cuerpo de la petición no es un JSON válido.',
    });
  }

  console.error('[error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Ha ocurrido un error inesperado en el servidor.',
  });
}

module.exports = { notFoundHandler, errorHandler };