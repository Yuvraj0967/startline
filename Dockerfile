# Use a lightweight Node.js base image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies like esbuild) for building
RUN npm ci

# Copy the rest of the application files
COPY . .

# Run the production build (Vite client compile + esbuild server bundling)
RUN npm run build

# Production-ready stage
FROM node:20-alpine

WORKDIR /app

# Copy manifests and install production-only dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Create a local writable data directory for startline-db.json
RUN mkdir -p data

# Expose port (Cloud Run sets PORT dynamically, we default to 8080)
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Start the full-stack application server
CMD ["npm", "start"]
