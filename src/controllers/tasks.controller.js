'use strict';

const service = require('../services/tasks.service');

function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function sendInvalidId(res, raw) {
  return res.status(400).json({
    error: 'ID inválido',
    message: `El parámetro "id" debe ser un entero positivo. Se recibió: ${raw}`,
  });
}

async function getAll(_req, res, next) {
  try {
    const tasks = await service.listTasks();
    return ok(res, { data: tasks, count: tasks.length });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendInvalidId(res, req.params.id);
    const task = await service.getTask(id);
    return ok(res, { data: task });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const task = await service.createTask(req.body);
    return ok(res, { data: task }, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendInvalidId(res, req.params.id);
    const task = await service.updateTask(id, req.body);
    return ok(res, { data: task });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendInvalidId(res, req.params.id);
    await service.deleteTask(id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };