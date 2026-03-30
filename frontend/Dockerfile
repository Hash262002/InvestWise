# Multi-stage Dockerfile for InvestWise Frontend

# Stage 1: Development/Build Stage
FROM node:lts-slim as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Runtime Stage (Vite Dev Server)
FROM node:lts-slim

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1001 viteuser

# Copy package files
COPY package*.json ./

# Install dependencies (dev dependencies needed for Vite dev server)
RUN npm install

# Copy application code from builder or use source
COPY . .

# Change ownership to viteuser
RUN chown -R viteuser:viteuser /app

# Switch to non-root user
USER viteuser

# Expose Vite dev server port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:5173/ || exit 1

# Start Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
