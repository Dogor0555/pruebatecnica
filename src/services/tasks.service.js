'use strict';

const repo = require('../repositories/tasks.repository');
const { ValidationError, NotFoundError } = require('../errors');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateTaskInput(body, { partial = false } = {}) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError(
      'El cuerpo de la petición debe ser un objeto JSON válido.'
    );
  }

  if (!partial || body.title !== undefined) {
    if (!isNonEmptyString(body.title)) {
      errors.push({
        field: 'title',
        message: 'El campo "title" es obligatorio y no puede estar vacío.',
      });
    }
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'El campo "description" debe ser una cadena de texto.',
    });
  }

  if (body.isCompleted !== undefined && typeof body.isCompleted !== 'boolean') {
    errors.push({
      field: 'isCompleted',
      message: 'El campo "isCompleted" debe ser un valor booleano.',
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de entrada inválidos.', errors);
  }
}

function listTasks() {
  return repo.findAll();
}

function getTask(id) {
  const task = repo.findById(id);
  if (!task) throw new NotFoundError(`No existe una tarea con id ${id}.`);
  return task;
}

function createTask(body) {
  validateTaskInput(body, { partial: false });
  return repo.create({
    title: body.title.trim(),
    description: typeof body.description === 'string' ? body.description : '',
    isCompleted: Boolean(body.isCompleted),
  });
}

function updateTask(id, body) {
  validateTaskInput(body, { partial: true });

  const exists = repo.findById(id);
  if (!exists) throw new NotFoundError(`No existe una tarea con id ${id}.`);

  return repo.update(id, {
    title: body.title !== undefined ? body.title.trim() : undefined,
    description:
      body.description !== undefined ? body.description : undefined,
    isCompleted:
      body.isCompleted !== undefined ? Boolean(body.isCompleted) : undefined,
  });
}

function deleteTask(id) {
  const removed = repo.remove(id);
  if (!removed) throw new NotFoundError(`No existe una tarea con id ${id}.`);
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  validateTaskInput,
};