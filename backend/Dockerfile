FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies INCLUDING nodemon
RUN npm install --legacy-peer-deps
RUN npm install -g nodemon

# Copy the rest of the backend code
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
