# syntax=docker/dockerfile:1.6
#
# Build context: raíz del repo.
# Render (Docker runtime) busca el Dockerfile en la raíz por defecto.
# Los COPY usan el prefijo backend/ porque ahí vive el código del backend.

FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/src ./src

EXPOSE 3000

USER node

CMD ["node", "-r", "dotenv/config", "src/server.js"]