# InvestWise Deployment Guide

This guide covers multiple deployment strategies from local development to production cloud deployment.

---

## Table of Contents

1. [Deployment Options Overview](#deployment-options-overview)
2. [Local Development (Docker Compose)](#local-development-docker-compose)
3. [Local Kubernetes (Minikube)](#local-kubernetes-minikube)
4. [Cloud Deployment Options](#cloud-deployment-options)
5. [AWS Deployment (Recommended for Portfolio)](#aws-deployment)
6. [Railway/Render (Quick & Free)](#railway-render-deployment)
7. [DigitalOcean Kubernetes](#digitalocean-kubernetes)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Production Checklist](#production-checklist)

---

## Deployment Options Overview

| Option | Cost | Complexity | Best For |
|--------|------|------------|----------|
| **Docker Compose (Local)** | Free | Low | Development, Demo |
| **Minikube (Local K8s)** | Free | Medium | Learning K8s, Testing |
| **Railway/Render** | Free tier | Low | Quick demos, MVP |
| **AWS (EKS/ECS)** | ~$50-100/mo | High | Production, Portfolio showcase |
| **DigitalOcean K8s** | ~$40-60/mo | Medium | Cost-effective production |
| **GCP (GKE)** | ~$70-100/mo | High | Enterprise-grade |

### Recommended Strategy for Portfolio Project:
1. **Development**: Docker Compose locally
2. **Demo/Interview**: Railway (free) or AWS Free Tier
3. **Production showcase**: AWS EKS or DigitalOcean

---

## Local Development (Docker Compose)

### Prerequisites
```bash
# Install Docker Desktop
# macOS
brew install --cask docker

# Start Docker Desktop
open -a Docker
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:7
    container_name: investwise-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: investwise
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-securepassword123}
      MONGO_INITDB_DATABASE: investwise
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    networks:
      - investwise-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: investwise-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redispassword123}
    volumes:
      - redis_data:/data
    networks:
      - investwise-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Kafka (Zookeeper + Kafka)
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: investwise-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - investwise-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: investwise-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - investwise-network

  # Ollama LLM Server
  ollama:
    image: ollama/ollama:latest
    container_name: investwise-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - investwise-network
    deploy:
      resources:
        reservations:
          memory: 8G

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: investwise-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      MONGODB_URI: mongodb://investwise:${MONGO_PASSWORD:-securepassword123}@mongodb:27017/investwise?authSource=admin
      REDIS_URL: redis://:${REDIS_PASSWORD:-redispassword123}@redis:6379
      KAFKA_BROKERS: kafka:29092
      JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:-32-character-encryption-key-here}
      ALPHA_VANTAGE_API_KEY: ${ALPHA_VANTAGE_API_KEY}
      AI_SERVICE_URL: http://ai-service:8000
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_started
    networks:
      - investwise-network

  # AI Service (Python FastAPI)
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: investwise-ai
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      OLLAMA_BASE_URL: http://ollama:11434
      MODEL_NAME: llama3.1:8b
    depends_on:
      - ollama
    networks:
      - investwise-network

  # Alert Service (WebSocket)
  alert-service:
    build:
      context: ./alert-service
      dockerfile: Dockerfile
    container_name: investwise-alerts
    restart: unless-stopped
    ports:
      - "3002:3002"
    environment:
      KAFKA_BROKERS: kafka:29092
      REDIS_URL: redis://:${REDIS_PASSWORD:-redispassword123}@redis:6379
    depends_on:
      - kafka
      - redis
    networks:
      - investwise-network

  # Frontend (React)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3001/api}
        VITE_WS_URL: ${VITE_WS_URL:-ws://localhost:3002}
    container_name: investwise-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - investwise-network

  # Nginx Reverse Proxy (Optional for production-like setup)
  nginx:
    image: nginx:alpine
    container_name: investwise-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
      - ai-service
    networks:
      - investwise-network

volumes:
  mongodb_data:
  redis_data:
  ollama_data:

networks:
  investwise-network:
    driver: bridge
```

### Dockerfiles

#### Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

#### AI Service Dockerfile (`ai-service/Dockerfile`)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1001 appuser
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Running Locally
```bash
# Create environment file
cat > .env << 'EOF'
MONGO_PASSWORD=securepassword123
REDIS_PASSWORD=redispassword123
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=32-character-encryption-key-here
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3002
EOF

# Start all services
docker-compose up -d

# Pull Ollama model (first time only)
docker exec investwise-ollama ollama pull llama3.1:8b

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

---

## Local Kubernetes (Minikube)

### Setup Minikube
```bash
# Install Minikube
brew install minikube kubectl

# Start Minikube with enough resources
minikube start --cpus 4 --memory 8192 --disk-size 50g

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable dashboard

# Point Docker to Minikube's Docker daemon
eval $(minikube docker-env)
```

### Kubernetes Manifests

#### Namespace (`k8s/namespace.yaml`)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: investwise
  labels:
    app: investwise
```

#### ConfigMap (`k8s/configmap.yaml`)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: investwise-config
  namespace: investwise
data:
  NODE_ENV: "production"
  MONGODB_HOST: "mongodb-service"
  REDIS_HOST: "redis-service"
  KAFKA_BROKERS: "kafka-service:9092"
  OLLAMA_BASE_URL: "http://ollama-service:11434"
  AI_SERVICE_URL: "http://ai-service:8000"
```

#### Secrets (`k8s/secrets.yaml`)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: investwise-secrets
  namespace: investwise
type: Opaque
stringData:
  MONGO_PASSWORD: "securepassword123"
  REDIS_PASSWORD: "redispassword123"
  JWT_SECRET: "your-super-secret-jwt-key"
  ENCRYPTION_KEY: "32-character-encryption-key-here"
  ALPHA_VANTAGE_API_KEY: "your-api-key"
```

#### MongoDB StatefulSet (`k8s/mongodb.yaml`)
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: investwise
spec:
  serviceName: mongodb-service
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: "investwise"
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: investwise-secrets
                  key: MONGO_PASSWORD
          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
  volumeClaimTemplates:
    - metadata:
        name: mongodb-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
  namespace: investwise
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
  clusterIP: None
```

#### Backend Deployment (`k8s/backend.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: investwise
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: investwise-backend:latest
          imagePullPolicy: Never  # For local Minikube
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: investwise-config
            - secretRef:
                name: investwise-secrets
          env:
            - name: MONGODB_URI
              value: "mongodb://investwise:$(MONGO_PASSWORD)@mongodb-service:27017/investwise?authSource=admin"
            - name: REDIS_URL
              value: "redis://:$(REDIS_PASSWORD)@redis-service:6379"
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: investwise
spec:
  selector:
    app: backend
  ports:
    - port: 3001
      targetPort: 3001
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: investwise
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

#### Ingress (`k8s/ingress.yaml`)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: investwise-ingress
  namespace: investwise
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  rules:
    - host: investwise.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 3001
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: alert-service
                port:
                  number: 3002
```

### Deploy to Minikube
```bash
# Build images in Minikube's Docker
eval $(minikube docker-env)
docker build -t investwise-backend:latest ./backend
docker build -t investwise-frontend:latest ./frontend
docker build -t investwise-ai:latest ./ai-service

# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/ollama.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/ai-service.yaml
kubectl apply -f k8s/alert-service.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Add to /etc/hosts
echo "$(minikube ip) investwise.local" | sudo tee -a /etc/hosts

# Access the app
open http://investwise.local

# View dashboard
minikube dashboard
```

---

## Cloud Deployment Options

### AWS Deployment (Recommended for Portfolio)

AWS provides the most comprehensive cloud deployment, demonstrating enterprise-level skills.

#### Architecture on AWS
```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────────────────────────────┐   │
│  │ Route 53    │────▶│  CloudFront (CDN)                   │   │
│  │ (DNS)       │     │  - Static assets                     │   │
│  └─────────────┘     │  - SSL/TLS termination               │   │
│                      └─────────────────────────────────────┘   │
│                                    │                            │
│                      ┌─────────────▼─────────────┐             │
│                      │  Application Load Balancer │             │
│                      │  (ALB)                     │             │
│                      └─────────────┬─────────────┘             │
│                                    │                            │
│  ┌─────────────────────────────────┼─────────────────────────┐ │
│  │               EKS Cluster / ECS Cluster                    │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │ │
│  │  │Frontend │  │Backend  │  │AI Svc   │  │Alert Svc│      │ │
│  │  │(Fargate)│  │(Fargate)│  │(EC2/GPU)│  │(Fargate)│      │ │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                    │                            │
│  ┌─────────────┐  ┌─────────────┐  │  ┌─────────────┐         │
│  │ DocumentDB  │  │ ElastiCache │◀─┘  │ MSK (Kafka) │         │
│  │ (MongoDB)   │  │ (Redis)     │     │             │         │
│  └─────────────┘  └─────────────┘     └─────────────┘         │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ S3          │  │ Secrets     │  │ CloudWatch  │            │
│  │ (Storage)   │  │ Manager     │  │ (Monitoring)│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

#### AWS Services Used
| Service | Purpose | Estimated Cost |
|---------|---------|----------------|
| EKS/ECS | Container orchestration | $0.10/hr (EKS) or ~$30/mo |
| EC2 (t3.medium) | AI Service with Ollama | ~$30/mo |
| DocumentDB | Managed MongoDB | ~$30/mo (single instance) |
| ElastiCache | Managed Redis | ~$15/mo |
| MSK | Managed Kafka | ~$20/mo |
| ALB | Load balancer | ~$20/mo |
| S3 + CloudFront | Static hosting | ~$5/mo |
| **Total** | | **~$120-150/mo** |

#### Free Tier Alternative (12 months)
- EC2 t2.micro (750 hrs/mo) - Backend
- RDS (750 hrs/mo) - Can use MongoDB Atlas free tier instead
- S3 (5GB) - Frontend hosting
- **Estimated**: $0-20/mo

#### Terraform Infrastructure (`terraform/main.tf`)
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "investwise-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "investwise-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Project     = "InvestWise"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "investwise-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECR Repositories
resource "aws_ecr_repository" "backend" {
  name                 = "investwise/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "investwise/frontend"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository" "ai_service" {
  name                 = "investwise/ai-service"
  image_tag_mutability = "MUTABLE"
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "investwise-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets
}

# DocumentDB (MongoDB compatible)
resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "investwise-docdb"
  engine                  = "docdb"
  master_username         = "investwise"
  master_password         = var.docdb_password
  backup_retention_period = 5
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot     = true
  
  vpc_security_group_ids = [aws_security_group.docdb.id]
  db_subnet_group_name   = aws_docdb_subnet_group.main.name
}

# ElastiCache (Redis)
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "investwise-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [aws_security_group.redis.id]
  subnet_group_name    = aws_elasticache_subnet_group.main.name
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "investwise/app-secrets"
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    JWT_SECRET      = var.jwt_secret
    ENCRYPTION_KEY  = var.encryption_key
    ALPHA_VANTAGE   = var.alpha_vantage_key
  })
}
```

#### Deploy to AWS
```bash
# 1. Install AWS CLI & configure
brew install awscli
aws configure

# 2. Create ECR repositories and push images
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t investwise-backend ./backend
docker tag investwise-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/investwise/backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/investwise/backend:latest

# 3. Deploy infrastructure with Terraform
cd terraform
terraform init
terraform plan
terraform apply

# 4. Deploy services with ECS or kubectl (EKS)
aws ecs update-service --cluster investwise-cluster --service backend --force-new-deployment
```

---

## Railway/Render Deployment (Quick & Free)

**Best for**: Quick demos, interviews, MVPs

### Railway Deployment

Railway offers free tier with $5 credit/month - perfect for demos!

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add services (Railway will detect Dockerfiles)
railway up

# 5. Add environment variables in Railway dashboard
# Or via CLI:
railway variables set JWT_SECRET=your-secret
railway variables set MONGODB_URI=mongodb+srv://...
```

#### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Render Deployment

Render also offers free tier!

#### render.yaml (Blueprint)
```yaml
services:
  # Backend API
  - type: web
    name: investwise-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: investwise-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: investwise-redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true

  # Frontend
  - type: web
    name: investwise-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    headers:
      - path: /*
        name: Cache-Control
        value: public, max-age=31536000

  # AI Service
  - type: web
    name: investwise-ai
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT

databases:
  - name: investwise-db
    databaseName: investwise
    plan: free

  - name: investwise-redis
    type: redis
    plan: free
```

### MongoDB Atlas (Free Cloud MongoDB)

For Railway/Render, use MongoDB Atlas free tier:

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free M0 cluster
3. Create database user
4. Whitelist IPs (0.0.0.0/0 for Railway/Render)
5. Get connection string
6. Add to Railway/Render environment variables

---

## DigitalOcean Kubernetes

**Cost**: ~$40-60/mo (Good middle ground)

```bash
# 1. Install doctl
brew install doctl
doctl auth init

# 2. Create Kubernetes cluster
doctl kubernetes cluster create investwise-cluster \
  --region nyc1 \
  --node-pool "name=worker-pool;size=s-2vcpu-4gb;count=2"

# 3. Get kubeconfig
doctl kubernetes cluster kubeconfig save investwise-cluster

# 4. Create container registry
doctl registry create investwise-registry

# 5. Push images
doctl registry login
docker tag investwise-backend:latest registry.digitalocean.com/investwise-registry/backend:latest
docker push registry.digitalocean.com/investwise-registry/backend:latest

# 6. Deploy
kubectl apply -f k8s/

# 7. Get Load Balancer IP
kubectl get svc -n investwise
```

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy InvestWise

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install Backend Dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run Backend Tests
        working-directory: ./backend
        run: npm test
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install AI Service Dependencies
        working-directory: ./ai-service
        run: pip install -r requirements.txt -r requirements-dev.txt
      
      - name: Run AI Service Tests
        working-directory: ./ai-service
        run: pytest

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push Backend
        working-directory: ./backend
        run: |
          docker build -t $ECR_REGISTRY/investwise/backend:${{ github.sha }} .
          docker push $ECR_REGISTRY/investwise/backend:${{ github.sha }}
          docker tag $ECR_REGISTRY/investwise/backend:${{ github.sha }} $ECR_REGISTRY/investwise/backend:latest
          docker push $ECR_REGISTRY/investwise/backend:latest
      
      - name: Build and push Frontend
        working-directory: ./frontend
        run: |
          docker build \
            --build-arg VITE_API_URL=${{ secrets.VITE_API_URL }} \
            -t $ECR_REGISTRY/investwise/frontend:${{ github.sha }} .
          docker push $ECR_REGISTRY/investwise/frontend:${{ github.sha }}
      
      - name: Build and push AI Service
        working-directory: ./ai-service
        run: |
          docker build -t $ECR_REGISTRY/investwise/ai-service:${{ github.sha }} .
          docker push $ECR_REGISTRY/investwise/ai-service:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name investwise-cluster --region ${{ env.AWS_REGION }}
      
      - name: Deploy to EKS
        run: |
          # Update image tags in manifests
          sed -i "s|image:.*backend.*|image: $ECR_REGISTRY/investwise/backend:${{ github.sha }}|g" k8s/backend.yaml
          sed -i "s|image:.*frontend.*|image: $ECR_REGISTRY/investwise/frontend:${{ github.sha }}|g" k8s/frontend.yaml
          sed -i "s|image:.*ai-service.*|image: $ECR_REGISTRY/investwise/ai-service:${{ github.sha }}|g" k8s/ai-service.yaml
          
          # Apply manifests
          kubectl apply -f k8s/
          
          # Wait for rollout
          kubectl rollout status deployment/backend -n investwise
          kubectl rollout status deployment/frontend -n investwise
      
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Production Checklist

### Security
- [ ] Enable HTTPS everywhere (SSL/TLS certificates)
- [ ] Use secrets manager for all credentials
- [ ] Enable WAF (Web Application Firewall)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up DDoS protection
- [ ] Regular security audits
- [ ] Enable audit logging

### Performance
- [ ] Configure auto-scaling (HPA in K8s)
- [ ] Set up CDN for static assets
- [ ] Enable gzip compression
- [ ] Configure database connection pooling
- [ ] Set up caching headers
- [ ] Optimize Docker images (multi-stage builds)

### Monitoring
- [ ] Set up CloudWatch / Datadog / Prometheus
- [ ] Configure alerts for errors and latency
- [ ] Enable distributed tracing
- [ ] Set up log aggregation (ELK / CloudWatch Logs)
- [ ] Create dashboards for key metrics
- [ ] Configure uptime monitoring

### Reliability
- [ ] Multi-AZ deployment
- [ ] Database backups (automated)
- [ ] Disaster recovery plan
- [ ] Blue-green or canary deployments
- [ ] Rollback procedures documented
- [ ] Health checks configured

### Cost Optimization
- [ ] Use spot instances where possible
- [ ] Right-size instances
- [ ] Set up billing alerts
- [ ] Use reserved instances for stable workloads
- [ ] Clean up unused resources

---

## Quick Reference Commands

```bash
# Docker Compose
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f backend          # View backend logs
docker-compose exec backend sh          # Shell into backend

# Kubernetes
kubectl get pods -n investwise          # List pods
kubectl logs -f deployment/backend -n investwise  # View logs
kubectl describe pod <pod-name> -n investwise     # Debug pod
kubectl port-forward svc/backend-service 3001:3001 -n investwise  # Port forward

# AWS
aws ecs list-tasks --cluster investwise-cluster   # List ECS tasks
aws logs tail /ecs/investwise --follow            # Tail logs

# Minikube
minikube start                          # Start cluster
minikube dashboard                      # Open dashboard
minikube service backend-service -n investwise    # Access service
```

---

## Summary: Recommended Deployment Path

### For Portfolio/Interview Demos:

1. **Start with**: Docker Compose locally ✅ FREE
2. **Quick online demo**: Railway or Render ✅ FREE
3. **Impressive portfolio**: AWS Free Tier or DigitalOcean 💰 ~$40-60/mo

### For Production:

1. **Small scale**: DigitalOcean Kubernetes 💰 ~$60/mo
2. **Enterprise**: AWS EKS with full infrastructure 💰 ~$150/mo+

### Interview Talking Points:

- "I deployed using Docker Compose for local development, then Kubernetes for production-like environments"
- "I used Infrastructure as Code with Terraform for reproducible deployments"
- "The CI/CD pipeline runs tests, builds containers, and deploys automatically on merge to main"
- "I implemented auto-scaling based on CPU utilization to handle traffic spikes"
- "All secrets are managed through AWS Secrets Manager / Kubernetes Secrets"
