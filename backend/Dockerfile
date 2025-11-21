FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

# Start the app
CMD ["node", "index.js"]