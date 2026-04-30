# ── build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Angular 17 outputs to dist/frontend/browser for the CSR bundle
RUN npm run build

# ── runtime stage ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx template — envsubst fills ${BACKEND_URL} at container start
COPY nginx/frontend.conf.template /etc/nginx/templates/default.conf.template

# Copy built Angular app
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# BACKEND_URL is injected at runtime (e.g. http://backend:3000)
ENV BACKEND_URL=http://backend:3000

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/nginx-health || exit 1
