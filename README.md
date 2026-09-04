# Tasks API

API REST para gestión de tareas (Tasks) — examen práctico de Especialista de Plataforma Junior.

- **Lenguaje / framework:** Node.js 18+ con **Express 4**.
- **Persistencia:** **PostgreSQL** desplegado en **[Neon](https://neon.tech)** (serverless Postgres).
- **Driver:** `pg` (node-postgres) con `pg.Pool`.
- **Tests:** `jest` + `supertest` contra una segunda base de datos en Neon (`pruebatecnica_dev`).
- **Documentación interactiva:** Swagger UI en `/api/docs`.

> Se eligió Node.js + Express porque es un stack ligero, ampliamente conocido, fácil de desplegar y con un ecosistema maduro para construir APIs REST rápidamente. Postgres + Neon se eligió por ser una base de datos relacional gestionada y de bajo costo que no requiere infraestructura productiva propia.

---

## 1. Estructura del proyecto

```
.
├── src/
│   ├── app.js                     # Construcción de la app Express (usada por tests y server)
│   ├── server.js                  # Entry point: arranca el servidor HTTP
│   ├── config/
│   │   └── swagger.js             # Definición OpenAPI / Swagger
│   ├── db/
│   │   └── connection.js          # Pool de conexiones a Postgres (Neon)
│   ├── repositories/
│   │   └── tasks.repository.js    # Acceso a datos (queries SQL)
│   ├── services/
│   │   └── tasks.service.js       # Lógica de negocio y validaciones
│   ├── controllers/
│   │   └── tasks.controller.js    # Adaptadores HTTP -> servicio
│   ├── routes/
│   │   └── tasks.routes.js        # Definición de rutas + anotaciones OpenAPI
│   ├── middlewares/
│   │   └── error-handler.js       # 400 / 404 / 500 centralizados
│   └── errors.js                  # ValidationError, NotFoundError
├── tests/
│   ├── globalSetup.js             # Carga .env / .env.test antes de Jest
│   ├── globalTeardown.js
│   └── tasks.test.js              # Suite de pruebas (13 casos)
├── .env.example                   # Plantilla de variables de entorno (sin secretos)
├── Dockerfile
├── package.json
└── README.md
```

Separación de capas:

- **Rutas**: solo definen el verbo HTTP + path y delegan al controlador.
- **Controladores**: traducen HTTP ↔ servicio. Validan el `id` y formatean respuestas.
- **Servicios**: lógica de negocio, validaciones de payload, lanzamiento de errores tipados.
- **Repositorios**: SQL puro contra Postgres (con `pg`).

## 2. Endpoints

| Método | Ruta                | Descripción                          | Códigos |
|--------|---------------------|--------------------------------------|---------|
| GET    | `/api/tasks`        | Lista todas las tareas               | 200     |
| GET    | `/api/tasks/{id}`   | Obtiene una tarea por id             | 200/400/404 |
| POST   | `/api/tasks`        | Crea una tarea (`title`, `description`, `isCompleted`) | 201/400 |
| PUT    | `/api/tasks/{id}`   | Actualiza una tarea existente        | 200/400/404 |
| DELETE | `/api/tasks/{id}`   | Elimina una tarea                    | 204/400/404 |

Además:

- `GET /health` → `200 { status: 'ok' }`
- `GET /api/docs` → Swagger UI
- `GET /api/docs.json` → OpenAPI 3.0.3 en JSON

### Esquema `Task`

```jsonc
{
  "id": 1,
  "title": "Comprar pan",
  "description": "Ir a la panadería antes de las 18:00",
  "isCompleted": false,
  "createdAt": "2026-09-04 12:00:00.000+00",
  "updatedAt": "2026-09-04 12:00:00.000+00"
}
```

### Validaciones

- `title` obligatorio y no puede ser cadena vacía.
- `description`, si se envía, debe ser string.
- `isCompleted`, si se envía, debe ser booleano.
- En `PUT` todos los campos son opcionales, pero si se envía `title` debe ser válido.

### Errores (formato JSON)

```jsonc
{
  "error": "Bad Request",        // o "Not Found", "ID inválido", ...
  "message": "Mensaje legible",
  "details": [                   // solo en errores de validación
    { "field": "title", "message": "El campo title es obligatorio..." }
  ]
}
```

## 3. Configuración local

### 3.1 Requisitos

- Node.js **>= 18**
- npm
- Una base de datos PostgreSQL en [Neon](https://neon.tech) (o cualquier Postgres accesible).

### 3.2 Variables de entorno

Crea un archivo `.env` en la raíz (NO commitear) basándote en `.env.example`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
PORT=3000
```

Crea también `.env.test` con una base de datos **distinta** para tests:

```env
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB_TEST?sslmode=require
NODE_ENV=test
```

> La conexión a Neon usa SSL (`sslmode=require`); el código activa SSL automáticamente al detectar `sslmode=require` o `ssl=true` en la URL, o si defines `PGSSL=true`.

### 3.3 Instalación de dependencias

```bash
npm install
```

### 3.4 Levantar la API

```bash
npm start          # producción
npm run dev        # con --watch (recarga automática)
```

Salida esperada:

```
Tasks API escuchando en http://localhost:3000
Swagger UI:    http://localhost:3000/api/docs
OpenAPI JSON:  http://localhost:3000/api/docs.json
```

### 3.5 Probar manualmente con `curl`

```bash
# Crear
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Comprar pan","description":"Antes de las 18:00"}'

# Listar
curl http://localhost:3000/api/tasks

# Obtener uno
curl http://localhost:3000/api/tasks/1

# Actualizar
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"isCompleted": true}'

# Eliminar
curl -X DELETE http://localhost:3000/api/tasks/1 -i
```

## 4. Pruebas automatizadas

```bash
npm test
```

Ejecuta Jest contra `TEST_DATABASE_URL`. Antes de cada test se trunca la tabla `tasks` para mantener aislamiento.

Casos cubiertos (13 en total):

- `POST /api/tasks` — creación exitosa (201), `title` vacío (400), `title` ausente (400), JSON inválido (400).
- `GET /api/tasks` — listado con varias tareas (200).
- `GET /api/tasks/:id` — éxito (200), id inexistente (404), id no numérico (400).
- `PUT /api/tasks/:id` — actualización parcial (200), id inexistente (404), `title` vacío (400).
- `DELETE /api/tasks/:id` — eliminación exitosa (204 + 404 al volver a pedirlo), id inexistente (404).

## 5. Docker

La imagen queda definida en `Dockerfile` (multi-stage con `node:20-alpine`).

### Construir y correr

```bash
docker build -t tasks-api .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require" \
  tasks-api
```

La API quedará en `http://localhost:3000`.

### Verificar

```bash
curl http://localhost:3000/health
```

## 6. CI (opcional, plus)

Hay un workflow en `.github/workflows/ci.yml` que, en cada `push` / `PR` a `main`:

1. Levanta Node.js 20.
2. `npm ci`.
3. Ejecuta `npm test` (necesita los secretos `TEST_DATABASE_URL` en *Settings → Secrets and variables → Actions*).

## 7. Git / PR

El trabajo se realizó en la rama `feature/tasks-api` con commits pequeños y descriptivos:

```
chore: inicializar proyecto con package.json y .gitignore
feat(api): implementar CRUD de tareas con validaciones y manejo de errores
feat(db): migrar persistencia de SQLite a Postgres (Neon) usando node-postgres
test: agregar suite de pruebas automatizadas (Jest + Supertest) contra Neon dev
docs: agregar README, Swagger/OpenAPI y Dockerfile
ci: agregar GitHub Actions para ejecutar pruebas en cada push
```