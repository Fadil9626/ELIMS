# ------------------------------------------------------------
# STAGE 1: Build the React app
# ------------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

# ------------------------------------------------------------
# STAGE 2: Serve with NGINX
# ------------------------------------------------------------
FROM nginx:alpine

# Copy built frontend to nginx directory
COPY --from=build /app/dist /usr/share/nginx/html

# ✅ REPLACE the default nginx config with our SPA + API proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]