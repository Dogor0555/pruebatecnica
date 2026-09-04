'use strict';

const swaggerJSDoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Tasks API',
    version: '1.0.0',
    description:
      'API REST para la gestión de tareas (Tasks). Permite crear, listar, actualizar y eliminar tareas.',
    contact: { name: 'Marcos Bonilla' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Servidor local' },
  ],
  components: {
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Comprar pan' },
          description: {
            type: 'string',
            example: 'Ir a la panadería antes de las 18:00',
          },
          isCompleted: { type: 'boolean', example: false },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-09-04 12:00:00',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-09-04 12:00:00',
          },
        },
        required: ['id', 'title', 'isCompleted'],
      },
      TaskInput: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Comprar pan' },
          description: {
            type: 'string',
            example: 'Ir a la panadería antes de las 18:00',
          },
          isCompleted: { type: 'boolean', example: false },
        },
        required: ['title'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Bad Request' },
          message: { type: 'string', example: 'Datos inválidos.' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

const options = {
  definition,
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(options);