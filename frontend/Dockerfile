# Stage 1: Build
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# ✅ FIX: Removed the "ENV VITE_API_URL" line.
# This forces the build to respect your empty .env file or api.js logic.
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built files to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Add custom Nginx config to handle React Router (SPA)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]