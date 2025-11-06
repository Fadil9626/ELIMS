# 1. Use the official Node.js image as the base
FROM node:20-slim

# 🟢 FIX: Install postgresql-client (which includes pg_dump)
# We update apt, install the client, and clean up apt lists to keep the image small
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json first to cache dependencies
COPY package*.json ./

# 4. Install dependencies
RUN npm install --omit=dev

# 5. Copy the rest of the application source code
COPY . .

# 6. Expose the port your Express app runs on (e.g., 5000)
EXPOSE 5000

# 7. Define the command to run the application
CMD [ "npm", "start" ]
