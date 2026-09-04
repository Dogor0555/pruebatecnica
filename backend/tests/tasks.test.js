'use strict';

const request = require('supertest');
const db = require('../src/db/connection');
const buildApp = require('../src/app');

let app;

beforeAll(async () => {
  app = await buildApp();
});

beforeEach(async () => {
  await db.reset();
});

afterAll(async () => {
  await db.close();
});

describe('Tasks API', () => {
  describe('POST /api/tasks', () => {
    it('debe crear una tarea exitosamente y devolver 201 con el recurso', async () => {
      const payload = {
        title: 'Comprar pan',
        description: 'Ir a la panadería antes de las 18:00',
        isCompleted: false,
      };

      const res = await request(app)
        .post('/api/tasks')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        id: expect.any(Number),
        title: 'Comprar pan',
        description: 'Ir a la panadería antes de las 18:00',
        isCompleted: false,
      });
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('debe devolver 400 cuando el título está vacío', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: '' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
        ])
      );
    });

    it('debe devolver 400 cuando el body no tiene title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ description: 'sin título' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.details[0].field).toBe('title');
    });

    it('debe devolver 400 cuando el body es un JSON inválido', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{ esto no es json');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    it('debe listar las tareas y devolver 200', async () => {
      await request(app).post('/api/tasks').send({ title: 'A' });
      await request(app).post('/api/tasks').send({ title: 'B' });

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].title).toBe('A');
      expect(res.body.data[1].title).toBe('B');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('debe devolver 200 con la tarea solicitada', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Revisar correo' });

      const res = await request(app).get(
        `/api/tasks/${created.body.data.id}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Revisar correo');
    });

    it('debe devolver 404 cuando la tarea no existe', async () => {
      const res = await request(app).get('/api/tasks/99999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
      expect(res.body.message).toMatch(/99999/);
    });

    it('debe devolver 400 cuando el id no es numérico', async () => {
      const res = await request(app).get('/api/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID inválido');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('debe actualizar una tarea existente y devolver 200', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarea original' });

      const res = await request(app)
        .put(`/api/tasks/${created.body.data.id}`)
        .send({ isCompleted: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isCompleted).toBe(true);
      expect(res.body.data.title).toBe('Tarea original');
    });

    it('debe editar el title y description de una tarea', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Título viejo',
          description: 'Descripción vieja',
        });

      const res = await request(app)
        .put(`/api/tasks/${created.body.data.id}`)
        .send({
          title: 'Título nuevo',
          description: 'Descripción nueva',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Título nuevo');
      expect(res.body.data.description).toBe('Descripción nueva');
      // El campo updatedAt debe ser posterior (o igual) al createdAt
      expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(res.body.data.createdAt).getTime()
      );
    });

    it('debe permitir editar solo el title sin tocar description', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Original',
          description: 'No cambiar',
        });

      const res = await request(app)
        .put(`/api/tasks/${created.body.data.id}`)
        .send({ title: 'Solo cambia título' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Solo cambia título');
      expect(res.body.data.description).toBe('No cambiar');
    });

    it('debe permitir editar solo description sin tocar title', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Fijo', description: 'Vieja' });

      const res = await request(app)
        .put(`/api/tasks/${created.body.data.id}`)
        .send({ description: 'Nueva descripción' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Fijo');
      expect(res.body.data.description).toBe('Nueva descripción');
    });

    it('debe devolver 404 al intentar actualizar un id inexistente', async () => {
      const res = await request(app)
        .put('/api/tasks/99999')
        .send({ title: 'Nuevo título' });

      expect(res.status).toBe(404);
    });

    it('debe devolver 400 al actualizar con title vacío', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Original' });

      const res = await request(app)
        .put(`/api/tasks/${created.body.data.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('debe eliminar una tarea y devolver 204 sin contenido', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Borrable' });

      const res = await request(app).delete(
        `/api/tasks/${created.body.data.id}`
      );

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      const followUp = await request(app).get(
        `/api/tasks/${created.body.data.id}`
      );
      expect(followUp.status).toBe(404);
    });

    it('debe devolver 404 al eliminar un id inexistente', async () => {
      const res = await request(app).delete('/api/tasks/99999');

      expect(res.status).toBe(404);
    });
  });
});