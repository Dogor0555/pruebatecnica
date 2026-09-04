# syntax=docker/dockerfile:1.6
#
# Este Dockerfile asume que el build context es la RAÍZ del repo
# (no la carpeta backend/). Esto es lo que espera Render cuando
# dockerfilePath es relativo al repo root (backend/Dockerfile).

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