# Tasks API + Tasks Frontend

API REST y cliente web para la gestión de tareas (Tasks) — examen práctico de Especialista de Plataforma Junior.

## 🧱 Stack

| Capa        | Tecnología                                                                 |
|-------------|----------------------------------------------------------------------------|
| Backend     | **Node.js 18+** + **Express 4**                                            |
| Persistencia| **PostgreSQL** desplegado en **[Neon](https://neon.tech)** (serverless)    |
| Driver DB   | `pg` (node-postgres) con `pg.Pool`                                          |
| Frontend    | **Next.js 14** (App Router) + **TypeScript** + **SWR**                    |
| Tests       | `jest` + `supertest` contra una segunda DB en Neon                         |
| Docs API    | Swagger UI en `/api/docs`                                                   |
| Orquestación| `docker compose` (backend + frontend)                                     |

> Se eligió Node.js + Express porque es un stack ligero, ampliamente conocido y fácil de desplegar. Postgres + Neon se eligió por ser una base de datos relacional gestionada y de bajo costo, sin infraestructura productiva propia. Next.js con TypeScript es el estándar moderno para aplicaciones React con SSR/SSG y permite construir un cliente web que consume la API de forma tipada.

---

## 📁 Estructura del proyecto

```
.
├── backend                        # (este directorio raíz)
│   ├── src/
│   │   ├── app.js                 # Construcción de la app Express
│   │   ├── server.js              # Entry point
│   │   ├── config/swagger.js      # Definición OpenAPI
│   │   ├── db/connection.js       # Pool de Postgres
│   │   ├── repositories/          # Acceso a datos (SQL)
│   │   ├── services/              # Lógica de negocio y validaciones
│   │   ├── controllers/           # Adaptadores HTTP
│   │   ├── routes/                # Definición de rutas + anotaciones OpenAPI
│   │   ├── middlewares/           # 400/404/500 centralizados
│   │   └── errors.js
│   ├── tests/                     # Suite Jest + Supertest
│   ├── Dockerfile
│   └── package.json
├── frontend/                      # Next.js (TS + App Router)
│   ├── app/                       # Páginas y layout
│   ├── components/                # TaskForm, TaskList, TaskItem
│   ├── lib/api.ts                 # Cliente HTTP
│   ├── types/task.ts              # Tipos compartidos
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml             # Orquestación backend + frontend
├── .env.example
└── README.md
```

Separación de capas (backend): `routes → controllers → services → repositories → DB`.

---

## 🚀 Arranque rápido con Docker Compose (recomendado)

### Requisitos

- Docker + Docker Compose
- Una base de datos PostgreSQL en [Neon](https://neon.tech) (o cualquier Postgres accesible). Como la BD es externa a Compose, **no** necesitas provisionar nada extra en Docker.

### 1. Configurar variables

Crea un archivo `.env` en la raíz (no commitear) con tu URL de Neon:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

> Si quieres, también puedes exportar `DATABASE_URL` antes de `docker compose up`.

### 2. Levantar todo

```bash
docker compose up --build
```

Esto levantará dos servicios:

| Servicio  | Puerto host | URL                         |
|-----------|--------------|-----------------------------|
| Backend   | `3000`       | http://localhost:3000       |
| Frontend  | `3001`       | http://localhost:3001       |

- Backend Swagger UI → http://localhost:3000/api/docs
- Frontend (cliente web) → **http://localhost:3001**

El frontend hace las peticiones a la API en `http://localhost:3000` (configurable vía `NEXT_PUBLIC_API_URL` en `docker-compose.yml`). El backend lleva CORS habilitado para que el navegador pueda llamarlo.

### 3. Bajar los servicios

```bash
docker compose down
```

---

## 🔧 Arranque manual (sin Docker)

### Backend

```bash
# Instalar
npm install

# Variables de entorno
cp .env.example .env       # editar con tu DATABASE_URL

# Arrancar
npm run dev                # con --watch
# o
npm start                  # producción
```

Disponible en `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

Disponible en `http://localhost:3000` (Next.js). El navegador abrirá la UI y consumirá la API en el puerto 3000.

---

## 📡 Endpoints (backend)

| Método | Ruta                | Descripción                          | Códigos |
|--------|---------------------|--------------------------------------|---------|
| GET    | `/api/tasks`        | Lista todas las tareas               | 200     |
| GET    | `/api/tasks/{id}`   | Obtiene una tarea por id             | 200/400/404 |
| POST   | `/api/tasks`        | Crea una tarea                       | 201/400 |
| PUT    | `/api/tasks/{id}`   | Actualiza una tarea existente        | 200/400/404 |
| DELETE | `/api/tasks/{id}`   | Elimina una tarea                    | 204/400/404 |

Extras:

- `GET /health` → `200 { status: 'ok' }`
- `GET /api/docs` → Swagger UI
- `GET /api/docs.json` → OpenAPI 3.0.3

### Esquema `Task`

```jsonc
{
  "id": 1,
  "title": "Comprar pan",
  "description": "Ir a la panadería antes de las 18:00",
  "isCompleted": false,
  "createdAt": "2026-09-04T12:00:00.000Z",
  "updatedAt": "2026-09-04T12:00:00.000Z"
}
```

### Validaciones

- `title` obligatorio y no puede ser cadena vacía.
- `description`, si se envía, debe ser string.
- `isCompleted`, si se envía, debe ser booleano.
- En `PUT` todos los campos son opcionales, pero `title` debe ser válido si se incluye.

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

---

## 🧪 Pruebas automatizadas

Las pruebas del backend viven en `tests/`. Requieren una segunda base de datos (también en Neon) para no contaminar la de producción.

```bash
# 1) Definir DB de tests
cp .env.example .env.test       # editar TEST_DATABASE_URL apuntando a otra DB

# 2) Correr
npm test
```

Suite (13 casos):

- `POST /api/tasks` — creación exitosa (201), `title` vacío (400), `title` ausente (400), JSON inválido (400).
- `GET /api/tasks` — listado (200).
- `GET /api/tasks/:id` — éxito (200), id inexistente (404), id no numérico (400).
- `PUT /api/tasks/:id` — actualización parcial (200), id inexistente (404), `title` vacío (400).
- `DELETE /api/tasks/:id` — éxito (204 + 404 al volver a pedirlo), id inexistente (404).

Resultado esperado:

```
Tests:       13 passed, 13 total
```

---

## 🛠️ CI (GitHub Actions)

`.github/workflows/ci.yml` ejecuta en cada `push`/`PR`:

1. `actions/setup-node@v4` con Node 20.
2. `npm ci`.
3. `npm test` (necesita el secreto `TEST_DATABASE_URL` en *Settings → Secrets → Actions*).

---

## 📜 Historial de commits

```
chore: inicializar proyecto con package.json y .gitignore
feat(api): implementar CRUD de tareas con validaciones y manejo de errores
feat(db): migrar persistencia de SQLite a Postgres (Neon) usando node-postgres
test: agregar suite de pruebas automatizadas (Jest + Supertest) contra Neon dev
docs: agregar README, Swagger/OpenAPI y Dockerfile
ci: agregar GitHub Actions para ejecutar pruebas en cada push
feat(backend): agregar middleware CORS para permitir consumo desde el frontend
feat(frontend): cliente Next.js 14 (TS + App Router) con CRUD contra la API
```

---

## 🔐 Notas de seguridad

- `.env`, `.env.test` y cualquier archivo con credenciales reales está en `.gitignore` y **no debe commitearse**.
- `.env.example` es solo una plantilla sin secretos.
- En Docker, la URL de Neon se inyecta vía variable de entorno (no se hardcodea en la imagen).