# ============================================
# Dockerfile — Frontend (Angular)
# Fábrica de Software Académico
# ============================================

# ETAPA 1: Compilación (Builder)
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar archivos de dependencias primero (caché de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar Angular para producción
RUN npm run build -- --configuration production

# ============================================
# ETAPA 2: Servidor web ligero (Nginx)
# ============================================
FROM nginx:alpine AS runner

# Copiar la app compilada al servidor Nginx
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Configuración personalizada de Nginx para SPA (Single Page Application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80 (HTTP)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
