# ─── Stage 1: Build React app ────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Pass API URL at build time (overridable via --build-arg)
ARG REACT_APP_API_URL=/api
ARG REACT_APP_SOCKET_URL=""
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
RUN npm run build

# ─── Stage 2: Nginx server ───────────────────────────────────
FROM nginx:1.25-alpine

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
