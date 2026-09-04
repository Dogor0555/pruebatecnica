# 📋 Informe de despliegue — Tasks App

> Documento descriptivo (no instructivo) del despliegue real realizado.
> Para una guía paso a paso de cómo hacerlo, ver la sección [Anexo](#anexo-guía-rápida) al final.

---

## 1. Resumen ejecutivo

| Capa       | Estado        | URL                                                              |
|------------|---------------|------------------------------------------------------------------|
| Backend    | ✅ Desplegado | `https://task-api-12bt.onrender.com`                             |
| Frontend   | ✅ Desplegado | `https://pruebatecnicamarcosbonilla.vercel.app`                  |
| Base datos | ✅ Conectada  | Neon Postgres — DB `pruebatecnica` (prod) y `pruebatecnica_dev` (tests) |

**Stack en producción:** Node.js 20 (Express) + Docker + Render Web Service (plan Free) + Next.js 14 + Vercel (plan Free) + Postgres serverless en Neon.

---

## 2. Cronología del despliegue

| Fecha (CST)        | Hito                                                                  |
|--------------------|------------------------------------------------------------------------|
| 2026-09-04 (PM)    | Discusión inicial del plan: Vercel (frontend) + Render (backend) + Neon (DB). |
| 2026-09-04 (PM)    | Push del repositorio a GitHub: `Dogor0555/pruebatecnica`.               |
| 2026-09-04 (PM)    | Configuración de `render.yaml` para Infrastructure as Code.             |
| 2026-09-04 (~13:42)| Primer deploy **fallido**: `failed to read dockerfile: open Dockerfile: no such file or directory`. |
| 2026-09-04 (~13:43)| Segundo deploy **fallido** tras eliminar `dockerContext`.               |
| 2026-09-04 (~13:45)| Tercer deploy **fallido** tras añadir `dockerfilePath: backend/Dockerfile`. |
| 2026-09-04 (~13:46)| **Deploy exitoso** tras mover `Dockerfile` y `.dockerignore` a la raíz del repo. |
| 2026-09-04 (~13:47)| Verificación end-to-end: `GET /health` → 200, `POST /api/tasks` → 201, persistencia confirmada en Neon. |
| 2026-09-04 (~14:XX)| Frontend desplegado en Vercel: `https://pruebatecnicamarcosbonilla.vercel.app`. |

**Tiempo total desde el primer intento hasta el deploy verde del backend:** ~5 minutos.

---

## 3. Lo que se desplegó

### 3.1 Servicio backend (`tasks-api`)

- **Plataforma:** Render Web Service.
- **Plan:** Free (`Free`).
- **Región:** Oregon (US West).
- **Runtime:** Docker (build a partir del `Dockerfile` en la raíz del repo).
- **Branch / commit:** `main` @ `02cc291` — `fix(deploy): mover Dockerfile a raíz del repo y simplificar render.yaml`.
- **Auto-deploy:** habilitado (cada push a `main` redeploya).
- **Health check:** `GET /health` → `200 { status: "ok" }`.

### 3.2 Imagen Docker construida

Stages:
1. `node:20-alpine` — instalación de dependencias (`npm ci --omit=dev`).
2. `node:20-alpine` — runner de producción con `node_modules`, `package.json` y `src/` copiados.

**Notas sobre el Dockerfile:**

- El `Dockerfile` vive en la **raíz del repo** (no en `backend/`). Esto fue necesario porque Render (con runtime Docker) busca el Dockerfile en la raíz del proyecto por defecto.
- Los `COPY` usan el prefijo `backend/` porque el **build context** también es la raíz del repo:
 ```dockerfile
 COPY backend/package*.json ./
 COPY backend/src ./src
 ```
- Multi-stage para que la imagen final no contenga devDependencies.

### 3.3 Variables de entorno configuradas en Render

| Clave          | Valor                                                                                              |
|----------------|----------------------------------------------------------------------------------------------------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_***@ep-winter-voice-avrqoszs-pooler.c-11.us-east-1.aws.neon.tech/pruebatecnica?sslmode=require&channel_binding=require` |
| `PORT`         | `3000`                                                                                              |
| `NODE_ENV`     | `production`                                                                                        |

`DATABASE_URL` se inyectó como **Secret** desde el dashboard (no se almacena en `render.yaml`).

### 3.4 Esquema de la base de datos

La tabla `tasks` se crea automáticamente al arrancar el servicio si no existe (en `src/db/connection.js:38`):

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id           SERIAL       PRIMARY KEY,
  title        TEXT         NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  is_completed BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## 4. Problemas encontrados y cómo se resolvieron

### 4.1 Render no encontraba el `Dockerfile`

**Síntoma (3 deploys fallidos):**

```
#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 2B done
#1 DONE 0.0s
error: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

**Causa raíz:** el repositorio tiene el código del backend en `backend/`, pero Render (Docker runtime, Blueprint) busca el `Dockerfile` en la **raíz del repo** por defecto. Ningún intento de `dockerfilePath` ni `rootDir` en `render.yaml` fue respetado por la cache de configuración de Render.

**Solución aplicada (commit `02cc291`):**

1. Mover `backend/Dockerfile` → `./Dockerfile` (raíz del repo).
2. Mover `backend/.dockerignore` → `./.dockerignore`.
3. Simplificar `render.yaml` eliminando `dockerfilePath` y `dockerContext` (defaults a raíz).
4. Ajustar el Dockerfile para usar `COPY backend/...` ya que el build context es la raíz del repo.

**Aprendizaje:** cuando Render (o cualquier plataforma similar) no acepta paths personalizados en su config, es más sencillo adaptarse a la convención de la plataforma que forzarla.

### 4.2 Ninguno más relevante

La conexión a Neon funcionó a la primera gracias al flag `sslmode=require` en la URL, que el código del pool de `pg` detecta automáticamente y activa SSL.

---

## 5. Verificación post-deploy

Pruebas realizadas en vivo contra la URL pública:

```bash
# 1. Health check
$ curl https://task-api-12bt.onrender.com/health
{"status":"ok","uptime":38.076836741}

# 2. Crear tarea
$ curl -X POST https://task-api-12bt.onrender.com/api/tasks \
    -H "Content-Type: application/json" \
    -d '{"title":"Desplegado en Render","description":"Verificacion en vivo contra Neon prod","isCompleted":false}'
HTTP/1.1 201 Created
{"data":{"id":1,"title":"Desplegado en Render", ...}}

# 3. Listar
$ curl https://task-api-12bt.onrender.com/api/tasks
{"data":[{...}],"count":1}
```

**Estado actual de la base de datos Neon prod (`pruebatecnica`):**

```sql
SELECT * FROM tasks;
-- 1 | "Desplegado en Render" | "Verificacion en vivo contra Neon prod" | f | ...
```

La tarea `id=1` quedó persistida como prueba de vida del despliegue.

---

## 6. URLs y endpoints expuestos

Una vez desplegado, la API está disponible públicamente en:

```
https://task-api-12bt.onrender.com
```

| Endpoint                              | Descripción                                  |
|---------------------------------------|----------------------------------------------|
| `GET  /health`                        | Health check → `200 { status: "ok" }`        |
| `GET  /api/tasks`                     | Lista todas las tareas                       |
| `GET  /api/tasks/{id}`                | Obtiene una tarea por id                     |
| `POST /api/tasks`                     | Crea una tarea                               |
| `PUT  /api/tasks/{id}`                | Actualiza una tarea                          |
| `DELETE /api/tasks/{id}`              | Elimina una tarea                            |
| `GET  /api/docs`                      | Swagger UI (interactivo)                     |
| `GET  /api/docs.json`                 | OpenAPI 3.0.3 en JSON                        |

---

## 7. Limitaciones conocidas (plan Free)

| Limitación                                  | Impacto                                                | Mitigación                                              |
|--------------------------------------------|--------------------------------------------------------|---------------------------------------------------------|
| Cold start tras ~15 min de inactividad     | Primera petición tras inactividad tarda ~30-50 s       | `keepalive.yml` (cron cada 14 min) o UptimeRobot        |
| 750 h/mes de cómputo                       | Suficiente para un solo servicio                        | N/A                                                     |
| Disco efímero                               | Los datos en disco local se pierden en cada redeploy   | DB en Neon (no se ve afectado)                          |
| Build cache limitado                       | Builds más lentos sin caché                             | N/A                                                     |

---

## 8. Pendiente

- [x] ~~Desplegar frontend en Vercel~~ → hecho en `https://pruebatecnicamarcosbonilla.vercel.app`.
- [ ] Configurar `BACKEND_URL` como secret en GitHub Actions para activar el workflow `keepalive.yml`.
- [ ] Configurar `TEST_DATABASE_URL` como secret en GitHub Actions para ejecutar CI en cada push.
- [ ] Eliminar la tarea de prueba `id=1` creada durante la verificación (opcional).

---

## Anexo: guía rápida

(Resumen ultra-corto para repetir el deploy; la versión detallada está en los commits del repo.)

### Backend en Render (Blueprint)

1. `render.yaml` en la raíz del repo define el servicio.
2. Render Dashboard → **New +** → **Blueprint** → conectar repo.
3. Render lee `render.yaml` y crea `tasks-api`.
4. Configurar `DATABASE_URL` como **Secret** en *Environment*.
5. Deploy automático en cada push a `main`.

### Frontend en Vercel (próximo paso)

1. https://vercel.com/new → importar repo `Dogor0555/pruebatecnica`.
2. **Root Directory:** `frontend`.
3. **Environment Variable:** `NEXT_PUBLIC_API_URL=https://task-api-12bt.onrender.com`.
4. Deploy.

**Estado real:** desplegado en `https://pruebatecnicamarcosbonilla.vercel.app` → HTTP 200.

---

**Generado automáticamente el 2026-09-04 tras el primer deploy exitoso en Render (commit `02cc291`).**