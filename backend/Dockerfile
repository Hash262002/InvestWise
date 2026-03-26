# syntax=docker/dockerfile:1.4

# ========================================
# InvestWise Backend - Dockerfile
# ========================================

# ----------------------------------------
# Stage 1: Development
# ----------------------------------------
FROM node:lts-slim AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]

# ----------------------------------------
# Stage 2: Production
# ----------------------------------------
FROM node:lts-slim AS production

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["node", "src/index.js"]
