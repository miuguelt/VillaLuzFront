FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_RUNTIME_ENV
ARG VITE_API_BASE_URL
ARG VITE_FRONTEND_URL

ENV VITE_RUNTIME_ENV=$VITE_RUNTIME_ENV \
    NODE_ENV=$VITE_RUNTIME_ENV \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL

COPY package*.json ./
RUN npm ci --no-audit --no-fund --include=dev

COPY . .
RUN npm run build

# Etapa final
FROM node:22-alpine
WORKDIR /app

ENV VITE_RUNTIME_ENV=$VITE_RUNTIME_ENV \
    NODE_ENV=$VITE_RUNTIME_ENV
RUN npm install -g serve
RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s CMD curl -fsS http://localhost:3000/ || exit 1
CMD ["serve", "-s", "dist", "-l", "3000"]
