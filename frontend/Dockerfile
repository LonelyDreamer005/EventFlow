# =============================================================================
# EventFlow Frontend — Multi-Stage Production Dockerfile
# Stage 1: Build React 18 production bundle via Vite
# Stage 2: Minimal Nginx Alpine web server & reverse proxy
# =============================================================================

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with frozen lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and config
COPY . .

# Build production bundle into /app/dist
RUN npm run build

# ── Stage 2: Production Server ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default Nginx site configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration with SPA routing and API proxy
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from build stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck probe using Alpine's built-in wget
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
