# syntax=docker/dockerfile:1.4

# ========================================
# InvestWise Frontend - Dockerfile
# ========================================

# ----------------------------------------
# Stage 1: Development
# ----------------------------------------
FROM node:lts-slim AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]

# ----------------------------------------
# Stage 2: Builder
# ----------------------------------------
FROM node:lts-slim AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# ----------------------------------------
# Stage 3: Production
# ----------------------------------------
FROM node:lts-slim AS production

WORKDIR /usr/src/app

RUN npm install -g serve

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
