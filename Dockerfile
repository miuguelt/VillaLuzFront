# Etapa 1: Construcción de la aplicación
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Variables de build: nueva (VITE_API_BASE_URL) y retro-compat (VITE_API_URL)
ARG VITE_API_BASE_URL_ARG
ARG VITE_API_URL_ARG
# Inyectar ambas para que Vite resuelva en build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL_ARG
ENV VITE_API_URL=$VITE_API_URL_ARG
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Si tu build está en 'build' o 'dist', ajusta la ruta
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]