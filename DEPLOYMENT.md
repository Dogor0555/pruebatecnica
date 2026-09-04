# 🚀 Guía de despliegue — Tasks App

Documento paso a paso para desplegar la aplicación completa (backend Express + frontend Next.js + Postgres en Neon) en servicios gratuitos.

> **Estado actual:** el código está en https://github.com/Dogor0555/pruebatecnica. **No se ha desplegado todavía** — esta guía cubre todo el proceso para llevarlo a producción.

---

## 1. Arquitectura objetivo

```
┌─────────────────────┐      HTTPS       ┌──────────────────────┐
│   Vercel (free)     │ ───────────────► │  Render (free)       │
│   Next.js 14        │                  │  Node + Express      │
│   https://app.vercel│                  │  https://api.onrender│
└─────────────────────┘                  └──────────┬───────────┘
                                                    │ TLS (sslmode=require)
                                                    ▼
                                         ┌──────────────────────┐
                                         │  Neon (free tier)    │
                                         │  Postgres serverless │
                                         └──────────────────────┘
```

| Capa     | Servicio                | Coste | Notas                                                |
|----------|-------------------------|-------|------------------------------------------------------|
| Frontend | Vercel (Hobby)          | $0    | Deploy automático desde `main`, sin cold start.      |
| Backend  | Render (Web Service)    | $0    | Plan free duerme tras 15 min (cold start ~30 s).     |
| DB       | Neon (Free)             | $0    | 0.5 GB, compute serverless con auto-suspend.        |

Tiempo total estimado de despliegue: **10–15 minutos**.

---

## 2. Prerrequisitos

- Cuenta en GitHub (ya tienes el repo).
- Cuenta en [Neon](https://neon.tech) → proyecto `pruebatecnica` con dos bases de datos (`pruebatecnica` y `pruebatecnica_dev`).
- Cuenta en [Render](https://render.com) — registro con GitHub.
- Cuenta en [Vercel](https://vercel.com) — registro con GitHub.
- Las URLs de conexión de Neon a mano:
  - **Producción:** `postgresql://...neon.../pruebatecnica?sslmode=require`
  - **Tests:** `postgresql://...neon.../pruebatecnica_dev?sslmode=require`

---

## 3. Backend en Render

### 3.1 Crear el servicio

1. Ir a https://dashboard.render.com.
2. **New +** → **Web Service**.
3. **Connect a repository:** seleccionar `Dogor0555/pruebatecnica`. Si Render no lo ve, autorizar el acceso desde *Account Settings → GitHub*.
4. Configurar el formulario:

   | Campo            | Valor                                       |
   |------------------|---------------------------------------------|
   | Name             | `tasks-api` (o el que quieras)              |
   | Region           | `Oregon (US West)` o el más cercano         |
   | Branch           | `main`                                      |
   | Root Directory   | `backend`                                   |
   | Runtime          | `Docker` (autodetecta el `Dockerfile`)      |
   | Instance Type    | `Free`                                      |

5. **Advanced → Environment Variables:**

   | Clave          | Valor                                                                 |
   |----------------|-----------------------------------------------------------------------|
   | `DATABASE_URL` | `postgresql://neondb_owner:***@ep-***.aws.neon.tech/pruebatecnica?sslmode=require&channel_binding=require` |
   | `PORT`         | `3000`                                                                |

6. Pulsar **Create Web Service**. Iniciará el deploy (tarda unos 2-3 min la primera vez porque construye la imagen Docker).

### 3.2 Verificación

Cuando termine, Render te asignará una URL tipo:

```
https://tasks-api-xxxx.onrender.com
```

Comprobaciones rápidas desde otra terminal:

```bash
# Health
curl https://tasks-api-xxxx.onrender.com/health
# → {"status":"ok","uptime":...}

# Swagger
open https://tasks-api-xxxx.onrender.com/api/docs

# Crear tarea
curl -X POST https://tasks-api-xxxx.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Desplegado en Render"}'
# → 201 con el recurso
```

Si todo responde, **anota la URL del backend** — la necesitarás para Vercel.

> **Tip:** Render puede tardar hasta 1 minuto en construir la imagen Docker la primera vez (descarga `node:20-alpine` y `npm ci`). Revisa los **Logs** en el dashboard si se queda colgado.

---

## 4. Frontend en Vercel

### 4.1 Crear el proyecto

1. Ir a https://vercel.com/new.
2. **Import** del repo `Dogor0555/pruebatecnica`.
3. Configurar:

   | Campo              | Valor             |
   |--------------------|------------------|
   | Project Name       | `tasks-frontend` (o el que quieras) |
   | Framework Preset   | Next.js (autodetectado) |
   | Root Directory     | `frontend`       |

4. **Environment Variables:**

   | Clave                  | Valor                                                |
   |------------------------|------------------------------------------------------|
   | `NEXT_PUBLIC_API_URL`  | `https://tasks-api-xxxx.onrender.com` (la URL del backend) |

5. Pulsar **Deploy**. Tarda ~1 min.

### 4.2 Verificación

Vercel te asignará una URL tipo:

```
https://tasks-frontend-xxxx.vercel.app
```

Abrela en el navegador. Deberías ver la UI. Al crear la primera tarea, el frontend hace `POST` a la API en Render y la guardará en Neon.

**Verificación cruzada:**

```bash
# La tarea creada en la UI debería aparecer en /api/tasks del backend
curl https://tasks-api-xxxx.onrender.com/api/tasks
```

---

## 5. Anti cold-start (opcional pero recomendado)

El plan free de Render duerme el servicio tras 15 min sin tráfico. La siguiente petición tarda ~30 s en "despertar". Para evitarlo, programa un ping cada 14 minutos a `/health`.

### Opción A — UptimeRobot (gratis, web)

1. https://uptimerobot.com → **Add New Monitor**.
2. Monitor Type: `HTTP(s)`.
3. URL: `https://tasks-api-xxxx.onrender.com/health`.
4. Monitoring Interval: `14 minutes` (Vercel free permite hasta 50 monitores, Render no cuenta este ping como problema).

### Opción B — cron-job.org (gratis, sin instalar nada)

1. https://cron-job.org → registrarte.
2. **Create Cronjob**:
   - URL: `https://tasks-api-xxxx.onrender.com/health`
   - Interval: cada 14 min
3. Activar.

### Opción C — GitHub Actions cada 14 min

```yaml
# .github/workflows/keepalive.yml
name: Keep Render warm
on:
  schedule:
    - cron: "*/14 * * * *"
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: ping
        run: curl -fsS https://tasks-api-xxxx.onrender.com/health
```

---

## 6. CI / Tests (recomendado)

Una vez desplegado el backend, conviene tener CI ejecutando los tests automáticamente. Ya hay un workflow en `.github/workflows/ci.yml` que solo necesita el secreto `TEST_DATABASE_URL`.

### Configurar el secreto

1. Ir a https://github.com/Dogor0555/pruebatecnica/settings/secrets/actions.
2. **New repository secret**:
   - Name: `TEST_DATABASE_URL`
   - Value: tu URL de Neon apuntando a `pruebatecnica_dev`.
3. Cada push a `main` o PR ejecutará los 13 tests contra la DB de Neon dev.

---

## 7. Checklist final

- [ ] Repo clonado en local y pusheado a GitHub.
- [ ] Dos DBs creadas: `pruebatecnica` y `pruebatecnica_dev`.
- [ ] Render: Web Service creado con `DATABASE_URL` apuntando a `pruebatecnica`.
- [ ] `/health` responde 200 en `https://tasks-api-xxxx.onrender.com`.
- [ ] `POST /api/tasks` crea una tarea y se persiste en Neon.
- [ ] Vercel: proyecto creado con `NEXT_PUBLIC_API_URL` apuntando al backend.
- [ ] UI carga en `https://tasks-frontend-xxxx.vercel.app`.
- [ ] (Opcional) Anti cold-start configurado.
- [ ] (Opcional) GitHub Secret `TEST_DATABASE_URL` configurado → CI verde.

---

## 8. Troubleshooting

| Problema                                         | Causa probable                                          | Solución                                                                 |
|--------------------------------------------------|---------------------------------------------------------|--------------------------------------------------------------------------|
| Render: `Cannot connect to DB`                   | `DATABASE_URL` mal copiada o sin `sslmode=require`.     | Comprobar la URL de Neon en el dashboard de Render → Environment.        |
| Vercel: `Failed to fetch` en la UI               | `NEXT_PUBLIC_API_URL` apunta a localhost.               | Re-deploy con la variable correcta apuntando a Render.                  |
| Render: 502 al primer GET tras 15 min            | Cold start normal del free tier.                        | Esperar 30 s o configurar keepalive (sección 5).                         |
| Render: build falla con `Cannot find module 'pg'`| `node_modules` no instalado en la imagen.               | Confirmar que `Dockerfile` ejecuta `npm ci --omit=dev` en la etapa `deps`. |
| CORS bloqueando peticiones desde Vercel          | Origen no permitido.                                   | Verificar que `src/app.js` tiene `cors()` montado antes de las rutas.    |
| Neon: `password authentication failed`           | Credenciales rotadas.                                   | En Neon → *Project Settings → Reset password* y actualizar variable.     |

---

## 9. Costes recurrentes

Todo el stack es **$0/mes** dentro de los límites:

| Servicio | Límite free                              |
|----------|------------------------------------------|
| Vercel   | 100 GB bandwidth, builds ilimitados.     |
| Render   | 750 h/mes (suficiente para 1 web free).  |
| Neon     | 0.5 GB storage, 190 h compute / mes.      |

Para un proyecto de examen / portfolio esto es más que suficiente.

---

## 10. Tear-down

Cuando quieras apagar todo:

1. **Render**: Dashboard → servicio → **Settings → Delete Web Service**.
2. **Vercel**: Project → **Settings → Delete Project**.
3. **Neon**: Project → **Settings → Delete Project** (cuidado: borra los datos).

El código sigue en GitHub para volver a desplegar cuando quieras.

---

## 11. Próximos pasos (mejoras opcionales)

- **Dominio custom:** comprar dominio (~10 USD/año) y conectarlo a Vercel + Render.
- **HTTPS automático:** Render y Vercel lo gestionan, no hay que hacer nada.
- **Migraciones reales:** añadir `node-pg-migrate` o `Knex` cuando la BD crezca.
- **Auth:** añadir JWT o NextAuth cuando la app lo requiera.
- **Observabilidad:** Render da métricas básicas; Sentry o Logtail para más detalle.

---

## Anexo A — `render.yaml` (Infrastructure as Code)

Si prefieres que Render cree el servicio automáticamente desde el repo, hay un archivo `render.yaml` en la raíz del proyecto. Para usarlo:

1. Render Dashboard → **New +** → **Blueprint**.
2. Apuntar al repo `Dogor0555/pruebatecnica`.
3. Render detectará el `render.yaml` y creará el servicio con la configuración ahí definida.

La variable `DATABASE_URL` tendrás que añadirla manualmente como **Secret** en el dashboard de Render (no debe ir en el YAML porque contiene credenciales).

---

**Última revisión:** ver `git log` en el repo. Toda la infraestructura definida en este documento está versionada en `main`.