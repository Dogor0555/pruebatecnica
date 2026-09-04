'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/tasks.controller');

const router = Router();

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: Lista todas las tareas
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Lista de tareas obtenida correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Task' }
 *                 count: { type: integer }
 *   post:
 *     summary: Crea una nueva tarea
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TaskInput' }
 *     responses:
 *       201:
 *         description: Tarea creada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Task' }
 *       400:
 *         description: Datos de entrada inválidos.
 */
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     summary: Obtiene una tarea por id
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Tarea encontrada. }
 *       404: { description: Tarea no encontrada. }
 *   put:
 *     summary: Actualiza una tarea existente
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TaskInput' }
 *     responses:
 *       200: { description: Tarea actualizada. }
 *       400: { description: Datos inválidos. }
 *       404: { description: Tarea no encontrada. }
 *   delete:
 *     summary: Elimina una tarea por id
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Eliminado correctamente (sin contenido). }
 *       404: { description: Tarea no encontrada. }
 */
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;