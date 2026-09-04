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
├── backend/                       # API REST (Node + Express + Postgres/Neon)
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
│   ├── tests/                     # Suite Jest + Supertest (16 casos)
│   ├── DEPLOYMENT_REPORT.md       # Informe extendido de despliegue
│   ├── scripts/md-to-pdf.js       # Generador de PDF del informe
│   └── package.json
├── frontend/                      # Cliente web Next.js (TS + App Router)
│   ├── app/                       # Páginas y layout
│   ├── components/                # TaskForm, TaskList, TaskItem (con edición)
│   ├── lib/api.ts                 # Cliente HTTP
│   ├── types/task.ts              # Tipos compartidos
│   ├── Dockerfile                 # Dockerfile específico del frontend
│   └── package.json
├── Dockerfile                     # Dockerfile del backend (raíz, usado por Render)
├── .dockerignore
├── render.yaml                    # Render Blueprint (Infrastructure as Code)
├── docker-compose.yml             # Orquestación local backend + frontend
├── DEPLOYMENT.md                  # Informe breve de despliegue
├── .github/workflows/
│   ├── ci.yml                     # Tests en cada push
│   └── keepalive.yml              # Anti cold start en plan Free
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

## 🌐 Despliegue en producción

| Capa        | Plataforma                | URL                                                |
|-------------|---------------------------|----------------------------------------------------|
| **Backend** | Render (Web Service, Free) | https://task-api-12bt.onrender.com                |
| **Frontend** | Vercel (Next.js, Free)   | https://tasks-frontend-xxxx.vercel.app *(a desplegar)* |
| **DB**      | Neon Postgres (Free)       | `pruebatecnica` (prod) + `pruebatecnica_dev` (tests) |
| **CI/CD**   | GitHub Actions             | Tests en cada push + keepalive anti cold start     |

### Probar el backend ya desplegado

```bash
# Health
curl https://task-api-12bt.onrender.com/health

# Crear tarea
curl -X POST https://task-api-12bt.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Revisar deploy","description":"Test contra la URL pública"}'

# Listar
curl https://task-api-12bt.onrender.com/api/tasks

# Editar (PUT permite cambiar title, description y/o isCompleted)
curl -X PUT https://task-api-12bt.onrender.com/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Título editado","isCompleted":true}'

# Eliminar
curl -X DELETE https://task-api-12bt.onrender.com/api/tasks/1

# Swagger UI
open https://task-api-12bt.onrender.com/api/docs
```

### Arquitectura

```
┌──────────────────────┐       HTTPS        ┌──────────────────────┐
│  Vercel (Free)       │ ─────────────────► │  Render (Free)       │
│  Next.js 14          │   CORS habilitado  │  Express 4 + Node 20 │
│  tasks-frontend      │                    │  task-api            │
└──────────────────────┘                    └──────────┬───────────┘
                                                      │ TLS (sslmode=require)
                                                      ▼
                                            ┌──────────────────────┐
                                            │  Neon (Free)         │
                                            │  Postgres serverless │
                                            └──────────────────────┘
```

### GitHub Actions

Dos workflows en `.github/workflows/`:

| Workflow         | Trigger                              | Qué hace                                                              |
|------------------|--------------------------------------|------------------------------------------------------------------------|
| `ci.yml`         | push / PR a `main`                   | `cd backend && npm ci && npm test` contra `TEST_DATABASE_URL` (Neon). |
| `keepalive.yml`  | cron cada 14 min / manual            | `curl /health` del backend para evitar cold start del plan Free.       |

Secrets necesarios en *Settings → Secrets → Actions*:
- `TEST_DATABASE_URL`: URL de Neon apuntando a `pruebatecnica_dev`.
- `BACKEND_URL`: `https://task-api-12bt.onrender.com` (opcional, para keepalive).

### Limitaciones del plan Free

- Render duerme el servicio tras 15 min de inactividad → cold start ~30–50 s. Mitigado con `keepalive.yml`.
- Vercel: 100 GB bandwidth / mes, builds ilimitados.
- Neon: 0.5 GB storage, 190 h compute / mes.

### Documentación detallada

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Informe descriptivo del despliegue en producción (qué se hizo, problemas encontrados, verificación post-deploy).
- **[backend/DEPLOYMENT_REPORT.md](./backend/DEPLOYMENT_REPORT.md)** — Versión extendida con docker, GitHub Actions, pruebas locales y enlaces para testers.

---

## 🔧 Arranque manual (sin Docker)

### Backend

```bash
# Instalar
cd backend
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

Las pruebas del backend viven en `backend/tests/`. Requieren una segunda base de datos (también en Neon) para no contaminar la de producción.

```bash
# 1) Definir DB de tests
cd backend
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
2. `cd backend && npm ci`.
3. `npm test` (necesita el secreto `TEST_DATABASE_URL` en *Settings → Secrets → Actions*).

Hay un segundo workflow `.github/workflows/keepalive.yml` que hace ping a `/health` cada 14 min para evitar el cold start del backend en Render (configurable vía secret `BACKEND_URL`).

---

## 🚀 Despliegue

La guía paso a paso para desplegar en **Vercel + Render + Neon** (todo free) está en **[DEPLOYMENT.md](./DEPLOYMENT.md)**. Cubre:

- Crear el servicio en Render con `render.yaml` o manualmente.
- Crear el proyecto en Vercel apuntando a `frontend/`.
- Configurar `DATABASE_URL` y `NEXT_PUBLIC_API_URL`.
- Anti cold-start con GitHub Actions o UptimeRobot.
- Troubleshooting de los errores más comunes.

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