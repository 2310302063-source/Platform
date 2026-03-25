FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL deps (including devDeps for TypeScript compiler)
RUN npm install

# Copy source files
COPY . .

# Compile TypeScript backend
RUN npx tsc --project backend/tsconfig.json

# Remove dev dependencies after build
RUN npm prune --omit=dev

EXPOSE 8080

CMD ["node", "backend/server.js"]
