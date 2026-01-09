FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_FRONTEND_URL
ARG VITE_RUNTIME_ENV

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL \
    VITE_RUNTIME_ENV=$VITE_RUNTIME_ENV

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN node -v && npm -v && npm_config_loglevel=verbose npm run build -- --debug

# Etapa final
FROM node:22-alpine
WORKDIR /app

RUN npm install -g serve
RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s CMD curl -fsS http://localhost:3000/ || exit 1
CMD ["serve", "-s", "dist", "-l", "3000"]
