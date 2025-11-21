FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

# 🔑 CRITICAL FIX: Point to server.js, not index.js
CMD ["node", "server.js"]