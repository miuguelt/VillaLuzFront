# Etapa 1: Construcción de la aplicación
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar dependencias con lockfile para builds reproducibles
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copiar código fuente
COPY . .

# Variables de build (compatibilidad):
# - VITE_API_BASE_URL: URL base del backend
# - VITE_API_URL: alias legado (si existe en entornos antiguos)
ARG VITE_API_BASE_URL
ARG VITE_API_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=production

# Verificar que los archivos críticos existan
RUN ls -la src/lib/utils.ts
RUN ls -la src/lib/

# Construir bundle de producción
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx (SPA)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]