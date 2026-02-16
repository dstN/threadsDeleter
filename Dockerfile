# ─── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# ─── Production stage ─────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY --from=build --chown=appuser:appgroup /app .

USER appuser
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/interfaces/web/server.js"]
