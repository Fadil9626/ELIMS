# --- STAGE 1: Build the frontend ---
    FROM node:20-slim AS build
    WORKDIR /app
    
    # Copy dependency definitions
    COPY package*.json ./
    
    # ✅ More tolerant install (works even if lock + package.json differ)
    RUN npm install --legacy-peer-deps --no-audit --no-fund
    
    # Copy project files
    COPY . .
    
    # Build the production bundle
    RUN npm run build
    
    # --- STAGE 2: Serve with nginx ---
    FROM nginx:alpine
    
    # Copy built frontend app into nginx public directory
    COPY --from=build /app/dist /usr/share/nginx/html
    
    # Basic SPA routing config
    RUN printf 'server { \
      listen 80; \
      server_name _; \
      root /usr/share/nginx/html; \
      location / { try_files $uri /index.html; } \
    }\n' > /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    