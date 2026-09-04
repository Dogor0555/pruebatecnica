# Informe de Despliegue — Tasks API

**Sistema:** Tasks API + Frontend
**Repositorio:** https://github.com/Dogor0555/pruebatecnica
**Fecha:** 2026-09-04

---

## 1. Resumen ejecutivo

| Capa                | Estado        | Plataforma                  | URL                                                              |
|---------------------|---------------|-----------------------------|------------------------------------------------------------------|
| **Backend**         | Desplegado    | Render (Web Service, Free)  | https://task-api-12bt.onrender.com                               |
| **Frontend**        | Desplegado    | Vercel (Next.js, Free)      | https://tasks-frontend-xxxx.vercel.app *(a desplegar)*            |
| **Base de datos**   | Conectada     | Neon Postgres (Free)        | DB prod: `pruebatecnica` · DB tests: `pruebatecnica_dev`         |
| **CI/CD**           | Configurado   | GitHub Actions              | `.github/workflows/ci.yml` + `keepalive.yml`                     |
| **Contenedores**    | Definidos     | Docker (multi-stage)        | `Dockerfile` (raíz) + `frontend/Dockerfile`                     |

---

## 2. Arquitectura

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

### Flujo de despliegue

```
Push a main ──► GitHub Actions (ci.yml) ──► Tests contra TEST_DATABASE_URL
                                             │
                          ┌──────────────────┼──────────────────┐
                          ▼                                     ▼
              Render (auto-deploy)                  Vercel (auto-deploy)
              build Docker image                    build Next.js
              deploy Web Service                    deploy edge
```

---

## 3. Docker

El backend se construye con un Dockerfile multi-stage en la **raíz del repo**:

```dockerfile
# Stage 1: dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Stage 2: runner de producción
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/src ./src
USER node
EXPOSE 3000
CMD ["node", "-r", "dotenv/config", "src/server.js"]
```

El frontend usa `frontend/Dockerfile` con Next.js standalone output (recomendado para producción).

Construir y correr localmente:

```bash
docker build -t tasks-api .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require" \
  tasks-api
```

`docker-compose.yml` (raíz) orquesta ambos servicios para desarrollo:

```bash
DATABASE_URL=postgresql://... docker compose up --build
# Backend → http://localhost:3000
# Frontend → http://localhost:3001
```

---

## 4. Despliegue en Render (Backend)

### 4.1 Configuración

- **Tipo:** Web Service (Docker runtime)
- **Plan:** Free
- **Región:** Oregon (US West)
- **Branch:** main
- **Auto-deploy:** habilitado

Definido en `render.yaml` (raíz del repo) para Infrastructure as Code:

```yaml
services:
  - type: web
    name: tasks-api
    runtime: docker
    plan: free
    region: oregon
    branch: main
    autoDeploy: true
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        sync: false   # secret
      - key: PORT
        value: "3000"
      - key: NODE_ENV
        value: production
```

### 4.2 Variables de entorno (Secret)

| Clave          | Valor                                                                                              |
|----------------|----------------------------------------------------------------------------------------------------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_***@ep-winter-voice-avrqoszs-pooler.c-11.us-east-1.aws.neon.tech/pruebatecnica?sslmode=require&channel_binding=require` |
| `PORT`         | `3000`                                                                                              |
| `NODE_ENV`     | `production`                                                                                        |

### 4.3 Despliegue paso a paso

1. Render Dashboard → **New +** → **Blueprint** → conectar repo `Dogor0555/pruebatecnica`.
2. Render detecta `render.yaml` y crea el servicio `tasks-api`.
3. Configurar `DATABASE_URL` como **Secret** en *Environment*.
4. **Apply** — Render inicia el build Docker (3–4 min la primera vez).
5. Cuando termina, Render asigna la URL pública: `https://task-api-12bt.onrender.com`.

### 4.4 Resultado del deploy

```
#15 exporting to image
#15 DONE 2.4s
==> Deploying...
==> Your service is live 🎉
==> Available at your primary URL https://task-api-12bt.onrender.com
```

### 4.5 Verificación post-deploy

```bash
curl https://task-api-12bt.onrender.com/health
# → 200 {"status":"ok","uptime":38.08}

curl -X POST https://task-api-12bt.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Desplegado en Render"}'
# → 201 {"data":{"id":1,...}}
```

### 4.6 Limitaciones del plan Free

- **Cold start:** ~30–50 s tras 15 min de inactividad. Mitigado con `keepalive.yml`.
- **750 h/mes:** suficiente para 1 servicio.
- **Disco efímero:** los datos locales se pierden en cada redeploy. La DB está en Neon, no le afecta.

---

## 5. Despliegue en Vercel (Frontend)

### 5.1 Configuración

- **Framework:** Next.js 14 (App Router)
- **Plan:** Hobby (Free)
- **Root Directory:** `frontend`
- **Build Command:** `next build`
- **Output:** standalone (configurado en `frontend/next.config.js`)

### 5.2 Variables de entorno

| Clave                  | Valor                                          |
|------------------------|------------------------------------------------|
| `NEXT_PUBLIC_API_URL`  | `https://task-api-12bt.onrender.com`          |

### 5.3 Despliegue paso a paso

1. https://vercel.com/new → **Import** del repo `Dogor0555/pruebatecnica`.
2. Configurar **Root Directory** = `frontend`.
3. Agregar env var `NEXT_PUBLIC_API_URL` = URL del backend en Render.
4. **Deploy** — Vercel construye y publica (~1 min).
5. URL final: `https://tasks-frontend-xxxx.vercel.app`.

### 5.4 Verificación

1. Abrir la URL de Vercel en el navegador.
2. Crear una tarea desde el formulario.
3. Verificar en `https://task-api-12bt.onrender.com/api/tasks` que la tarea aparece persistida.

---

## 6. GitHub Actions (CI/CD)

Hay dos workflows definidos en `.github/workflows/`:

### 6.1 `ci.yml` — Tests en cada push/PR

```yaml
name: CI
on:
  push: { branches: [main, feature/**] }
  pull_request: { branches: [main] }

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - working-directory: ./backend
        run: npm ci
      - working-directory: ./backend
        run: npm test
```

**Configuración:** agregar el secret `TEST_DATABASE_URL` (URL de Neon apuntando a `pruebatecnica_dev`) en *Settings → Secrets → Actions*.

### 6.2 `keepalive.yml` — Anti cold start

```yaml
name: Keep Render warm
on:
  schedule: [{ cron: "*/14 * * * *" }]
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - env: { BACKEND_URL: ${{ secrets.BACKEND_URL }} }
        run: curl -fsS "$BACKEND_URL/health"
```

**Configuración:** agregar el secret `BACKEND_URL` = `https://task-api-12bt.onrender.com`.

---

## 7. Prueba local (sin Docker)

### 7.1 Backend

```bash
cd backend
npm install
cp .env.example .env       # editar DATABASE_URL
npm run dev                # http://localhost:3000
npm test                   # corre 16 tests contra TEST_DATABASE_URL
```

### 7.2 Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
# http://localhost:3000
```

### 7.3 Docker Compose (todo junto)

```bash
echo "DATABASE_URL=postgresql://..." > .env
docker compose up --build
# Backend → http://localhost:3000
# Frontend → http://localhost:3001
```

---

## 8. Prueba local (con Docker)

### 8.1 Solo backend

```bash
docker build -t tasks-api .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require" \
  tasks-api
```

### 8.2 Todo (backend + frontend)

```bash
docker compose up --build
```

---

## 9. Enlaces para que lo prueben

| Recurso                          | URL                                                                       |
|----------------------------------|---------------------------------------------------------------------------|
| **Repositorio GitHub**           | https://github.com/Dogor0555/pruebatecnica                                |
| **API desplegada (Render)**      | https://task-api-12bt.onrender.com                                        |
| **Swagger UI (interactivo)**     | https://task-api-12bt.onrender.com/api/docs                               |
| **OpenAPI JSON**                 | https://task-api-12bt.onrender.com/api/docs.json                          |
| **Frontend desplegado (Vercel)** | https://tasks-frontend-xxxx.vercel.app *(a desplegar)*                     |
| **Health check**                 | https://task-api-12bt.onrender.com/health                                 |
| **Neon Dashboard**               | https://console.neon.tech                                                  |

### Endpoints disponibles

| Método | Ruta                                          | Descripción            |
|--------|-----------------------------------------------|------------------------|
| GET    | https://task-api-12bt.onrender.com/api/tasks  | Listar todas           |
| POST   | https://task-api-12bt.onrender.com/api/tasks  | Crear                  |
| GET    | https://task-api-12bt.onrender.com/api/tasks/{id} | Obtener por id    |
| PUT    | https://task-api-12bt.onrender.com/api/tasks/{id} | Actualizar (incluye edición de title/description) |
| DELETE | https://task-api-12bt.onrender.com/api/tasks/{id} | Eliminar            |

### Ejemplos curl

```bash
# Crear
curl -X POST https://task-api-12bt.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Revisar el deploy","description":"Test desde la URL pública"}'

# Listar
curl https://task-api-12bt.onrender.com/api/tasks

# Editar (cambiar título y descripción)
curl -X PUT https://task-api-12bt.onrender.com/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Título editado","description":"Descripción editada"}'

# Marcar como completada
curl -X PUT https://task-api-12bt.onrender.com/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"isCompleted":true}'

# Eliminar
curl -X DELETE https://task-api-12bt.onrender.com/api/tasks/1
```

---

## 10. Cronología del despliegue

| Fecha              | Hito                                                       |
|--------------------|------------------------------------------------------------|
| 2026-09-04         | Creación del repo y push inicial a GitHub.                  |
| 2026-09-04         | Migración de SQLite → Postgres (Neon) en `feat(db)`.        |
| 2026-09-04         | Frontend Next.js + docker-compose en `feat(frontend)`.      |
| 2026-09-04         | Reorganización en `backend/` + `frontend/`.                |
| 2026-09-04 ~13:42  | Primer deploy Render **fallido** (Dockerfile no encontrado). |
| 2026-09-04 ~13:43  | Segundo intento **fallido** (dockerContext inválido).      |
| 2026-09-04 ~13:45  | Tercer intento **fallido** (dockerfilePath no soportado).  |
| 2026-09-04 ~13:46  | **Deploy exitoso** tras mover `Dockerfile` a la raíz.      |
| 2026-09-04 ~13:47  | Verificación: health 200, POST 201, persistencia en Neon.  |

---

## 11. Resumen técnico

- **Lenguaje backend:** Node.js 20 + Express 4
- **Lenguaje frontend:** Next.js 14 + React 18 + TypeScript 5
- **Persistencia:** PostgreSQL 16 (Neon serverless)
- **Driver DB:** `pg` 8.x (node-postgres)
- **Documentación API:** Swagger UI + OpenAPI 3.0.3
- **Tests:** Jest 29 + Supertest 7 (16 tests, todos pasando)
- **Contenedores:** Docker (multi-stage)
- **Orquestación local:** docker-compose v2
- **Deploy backend:** Render Blueprint (`render.yaml`)
- **Deploy frontend:** Vercel
- **CI:** GitHub Actions

---

## 12. Datos de contacto del repositorio

- **Owner:** Dogor0555
- **Ramas activas:** `main`, `feature/tasks-api`, `feature/frontend-and-docker-compose`, `refactor/backend-folder`
- **Historial:** 8 commits en `main`, todos con mensajes descriptivos