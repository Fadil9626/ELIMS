# Stage 1: Build
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Ensure the build uses the correct API URL
# NOTE: In Docker networking, the browser cannot access 'api' container by name.
# It must access via the public IP/Port mapped in docker-compose (localhost:5000 or server IP).
ENV VITE_API_URL=http://localhost:5000 
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