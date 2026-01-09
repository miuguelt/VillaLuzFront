FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_RUNTIME_ENV=production
ARG VITE_API_BASE_URL
ARG VITE_FRONTEND_URL

ENV VITE_RUNTIME_ENV=${VITE_RUNTIME_ENV:-production} \
    NODE_ENV=${VITE_RUNTIME_ENV:-production} \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL

COPY package*.json ./
RUN npm ci --no-audit --no-fund --include=dev

COPY . .
RUN if ! npm run build > /tmp/npm-build.log 2>&1; then \
      echo "Build failed. Dumping npm logs..."; \
      ls -la /root/.npm/_logs || true; \
      cat /root/.npm/_logs/* || true; \
      echo "Build output:"; \
      cat /tmp/npm-build.log || true; \
      exit 1; \
    fi

# Etapa final
FROM node:22-alpine
WORKDIR /app

ARG VITE_RUNTIME_ENV=production
ENV VITE_RUNTIME_ENV=${VITE_RUNTIME_ENV:-production} \
    NODE_ENV=${VITE_RUNTIME_ENV:-production}
RUN npm install -g serve
RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s CMD curl -fsS http://localhost:3000/ || exit 1
CMD ["serve", "-s", "dist", "-l", "3000"]
