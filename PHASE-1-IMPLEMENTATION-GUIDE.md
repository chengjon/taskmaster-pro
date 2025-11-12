# Phase 1 Implementation Guide: Production Deployment Setup
## Critical Infrastructure for Task Master Pro

**Objective**: Get the project to production-ready status in 15-20 hours
**Target Completion**: End of Week 2
**Success Criteria**: Automated deployment to staging environment with rollback capability

---

## Task 1: Docker Containerization (3 hours)

### 1.1 Create API Dockerfile

Create `/opt/claude/taskmaster-pro/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Set environment
ENV NODE_ENV=production
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 1.2 Create .dockerignore

Create `/opt/claude/taskmaster-pro/.dockerignore`:

```
node_modules
npm-debug.log
dist
coverage
.git
.gitignore
README.md
CHANGELOG.md
.env
.env.local
.env.*.local
.vscode
.idea
.DS_Store
tests
**/*.spec.ts
**/*.test.ts
jest.config.js
vitest.config.ts
turbo.json
tsconfig.json
.changeset
.github
.taskmaster
docs
examples
assets
context
scripts
```

### 1.3 Create docker-compose.yml for Development

Create `/opt/claude/taskmaster-pro/docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: taskmaster-db
    environment:
      POSTGRES_DB: taskmaster_dev
      POSTGRES_USER: taskmaster
      POSTGRES_PASSWORD: taskmaster_dev_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskmaster"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache (optional)
  redis:
    image: redis:7-alpine
    container_name: taskmaster-cache
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Task Master API
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: taskmaster-api
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://taskmaster:taskmaster_dev_password@postgres:5432/taskmaster_dev
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: debug
      CORS_ORIGIN: "http://localhost:3000,http://localhost:3001"
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src
      - ./dist:/app/dist
    command: npm run dev

volumes:
  pgdata:

networks:
  default:
    name: taskmaster-network
```

### 1.4 Test Docker Build

```bash
# Build the Docker image
docker build -t taskmaster-api:latest .

# Test the image
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  taskmaster-api:latest

# Verify health check
curl http://localhost:3000/api/v1/health

# Test with docker-compose
docker-compose up
```

---

## Task 2: Production Environment Configuration (2 hours)

### 2.1 Create Configuration Schema

Create `/opt/claude/taskmaster-pro/src/config/schema.ts`:

```typescript
import { z } from 'zod';

export const ConfigSchema = z.object({
  // Application
  app: z.object({
    nodeEnv: z.enum(['development', 'staging', 'production']).default('development'),
    port: z.number().int().min(1).max(65535).default(3000),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),

  // Database
  database: z.object({
    url: z.string().url().min(1),
    maxConnections: z.number().int().min(1).max(100).default(20),
    idleTimeout: z.number().int().min(1000).default(30000),
    connectionTimeout: z.number().int().min(1000).default(10000),
  }),

  // Redis Cache
  redis: z.object({
    url: z.string().url().optional(),
    enabled: z.boolean().default(true),
    ttl: z.number().int().min(0).default(3600),
  }),

  // Security
  security: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiry: z.string().default('7d'),
    corsOrigin: z.string().or(z.array(z.string())).default('*'),
    rateLimitWindow: z.number().int().default(900000), // 15 minutes
    rateLimitMaxRequests: z.number().int().default(100),
  }),

  // API Configuration
  api: z.object({
    version: z.string().default('1.0.0'),
    requestTimeout: z.number().int().default(30000),
    maxRequestSize: z.string().default('10mb'),
  }),

  // Monitoring
  monitoring: z.object({
    sentryDsn: z.string().url().optional(),
    metricsEnabled: z.boolean().default(true),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### 2.2 Create Configuration Loader

Create `/opt/claude/taskmaster-pro/src/config/index.ts`:

```typescript
import { ConfigSchema, type Config } from './schema.js';

function loadConfig(): Config {
  const envConfig = {
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      logLevel: process.env.LOG_LEVEL || 'info',
    },

    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost/taskmaster_dev',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
    },

    redis: {
      url: process.env.REDIS_URL,
      enabled: process.env.REDIS_ENABLED !== 'false',
      ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
    },

    security: {
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-min-32-characters-long!!!',
      jwtExpiry: process.env.JWT_EXPIRY || '7d',
      corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    api: {
      version: process.env.API_VERSION || '1.0.0',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
      maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    },

    monitoring: {
      sentryDsn: process.env.SENTRY_DSN,
      metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    },
  };

  try {
    return ConfigSchema.parse(envConfig);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}

export const config = loadConfig();

// Validate critical config on startup
export function validateProductionConfig(): void {
  const { nodeEnv, jwtSecret, sentryDsn, databaseUrl } = config.app;

  if (nodeEnv === 'production') {
    const errors: string[] = [];

    if (jwtSecret.includes('dev-secret')) {
      errors.push('JWT_SECRET must be changed in production');
    }

    if (!sentryDsn) {
      errors.push('SENTRY_DSN should be set in production for error tracking');
    }

    if (!databaseUrl || databaseUrl.includes('localhost')) {
      errors.push('DATABASE_URL must point to external database in production');
    }

    if (errors.length > 0) {
      console.error('Production configuration errors:');
      errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    console.log('Production configuration validated');
  }
}
```

### 2.3 Create Environment Files

Create `/opt/claude/taskmaster-pro/.env.development`:

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://taskmaster:taskmaster_dev_password@localhost:5432/taskmaster_dev
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT=30000

# Redis
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Security
JWT_SECRET=dev-secret-key-min-32-characters-long!!!
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring
METRICS_ENABLED=true
SENTRY_DSN=

# Optional
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

Create `/opt/claude/taskmaster-pro/.env.production.template`:

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database - CHANGE THESE!
DATABASE_URL=postgresql://user:password@prod-db.example.com/taskmaster
DB_MAX_CONNECTIONS=50
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Redis - Optional but recommended
REDIS_URL=redis://prod-redis.example.com:6379
REDIS_ENABLED=true

# Security - MUST CHANGE THESE!
JWT_SECRET=CHANGE_ME_GENERATE_STRONG_SECRET_MIN_32_CHARS
JWT_EXPIRY=7d
CORS_ORIGIN=https://api.example.com,https://www.example.com
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=900000

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
METRICS_ENABLED=true

# API Keys for AI Features
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=
```

---

## Task 3: Database Migration Setup (4 hours)

### 3.1 Create Migration Directory Structure

```bash
mkdir -p db/migrations
mkdir -p db/seeds
mkdir -p db/scripts
```

### 3.2 Create Initial Schema Migration

Create `/opt/claude/taskmaster-pro/db/migrations/001_init_schema.sql`:

```sql
-- Initial Schema for Task Master Pro
-- Created: 2024-11-12

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  avatar_url VARCHAR(512),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_is_active (is_active)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_projects_user_id (user_id),
  INDEX idx_projects_is_active (is_active)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'blocked', 'deferred', 'cancelled')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  display_id VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tasks_project_id (project_id),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_parent_task_id (parent_task_id)
);

-- Task tags table
CREATE TABLE IF NOT EXISTS task_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, tag_name),
  INDEX idx_task_tags_task_id (task_id),
  INDEX idx_task_tags_tag_name (tag_name)
);

-- Task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id),
  INDEX idx_task_dependencies_task_id (task_id),
  INDEX idx_task_dependencies_depends_on (depends_on_task_id)
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_logs_user_id (user_id),
  INDEX idx_activity_logs_project_id (project_id),
  INDEX idx_activity_logs_task_id (task_id),
  INDEX idx_activity_logs_created_at (created_at)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 Create Migration Runner Script

Create `/opt/claude/taskmaster-pro/db/scripts/migrate.js`:

```javascript
#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const { Client } = pg;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Read migration files
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const result = await client.query(
        'SELECT * FROM schema_migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`✓ Already executed: ${file}`);
        continue;
      }

      console.log(`Executing: ${file}`);
      const sql = await readFile(join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file]
      );
      console.log(`✓ Completed: ${file}`);
    }

    console.log('\nAll migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
```

### 3.4 Add Migration Scripts to package.json

```json
{
  "scripts": {
    "db:migrate": "node db/scripts/migrate.js",
    "db:migrate:create": "node db/scripts/create-migration.js",
    "db:reset": "node db/scripts/reset.js"
  }
}
```

---

## Task 4: GitHub Actions Deployment Pipeline (4 hours)

### 4.1 Create Deploy Workflow

Create `/opt/claude/taskmaster-pro/.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main, next]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: read
  id-token: write

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Determine deployment environment
  determine-env:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.determine.outputs.environment }}
      deploy: ${{ steps.determine.outputs.deploy }}
    steps:
      - id: determine
        run: |
          if [[ "${{ github.event_name }}" == "workflow_dispatch" ]]; then
            echo "environment=${{ github.event.inputs.environment }}" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
          fi
          echo "deploy=true" >> $GITHUB_OUTPUT

  # Build and push Docker image
  build:
    needs: [determine-env]
    if: needs.determine-env.outputs.deploy == 'true'
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Deploy to Staging
  deploy-staging:
    needs: [determine-env, build]
    if: needs.determine-env.outputs.environment == 'staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.STAGING_DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.STAGING_DEPLOY_USER }}
          IMAGE_TAG: ${{ needs.build.outputs.image-tag }}
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.STAGING_DEPLOY_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts

          ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST << 'DEPLOY_SCRIPT'
            cd /app/taskmaster
            docker pull ${{ needs.build.outputs.image-tag }}
            docker-compose up -d
            docker-compose exec -T api npm run db:migrate
          DEPLOY_SCRIPT

      - name: Run Smoke Tests
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}
        run: |
          chmod +x .github/scripts/smoke-tests.sh
          ./.github/scripts/smoke-tests.sh

  # Deploy to Production
  deploy-production:
    needs: [determine-env, build]
    if: needs.determine-env.outputs.environment == 'production'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Create Deployment
        id: deployment
        uses: actions/github-script@v7
        with:
          script: |
            const deployment = await github.rest.repos.createDeployment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.sha,
              environment: 'production',
              description: 'Production deployment',
              production_environment: true,
              auto_merge: false,
            });
            console.log('Deployment ID: ' + deployment.data.id);
            core.setOutput('deployment_id', deployment.data.id);

      - name: Deploy to Production
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.PROD_DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.PROD_DEPLOY_USER }}
          IMAGE_TAG: ${{ needs.build.outputs.image-tag }}
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PROD_DEPLOY_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts

          ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST << 'DEPLOY_SCRIPT'
            cd /app/taskmaster
            # Create backup
            docker-compose exec -T db pg_dump -U taskmaster taskmaster_prod > backup_$(date +%Y%m%d_%H%M%S).sql
            # Deploy
            docker pull ${{ needs.build.outputs.image-tag }}
            docker-compose up -d
            docker-compose exec -T api npm run db:migrate
          DEPLOY_SCRIPT

      - name: Run Smoke Tests
        env:
          API_URL: ${{ secrets.PROD_API_URL }}
        run: |
          chmod +x .github/scripts/smoke-tests.sh
          ./.github/scripts/smoke-tests.sh

      - name: Update Deployment Status
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const state = '${{ job.status }}' === 'success' ? 'success' : 'failure';
            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: ${{ steps.deployment.outputs.deployment_id }},
              state: state,
              description: 'Deployment ' + state,
            });
```

### 4.2 Create Smoke Tests Script

Create `/opt/claude/taskmaster-pro/.github/scripts/smoke-tests.sh`:

```bash
#!/bin/bash

set -e

API_URL=${API_URL:-http://localhost:3000}
MAX_RETRIES=30
RETRY_DELAY=2

echo "Running smoke tests against $API_URL"

# Wait for API to be ready
echo "Waiting for API to be healthy..."
for i in $(seq 1 $MAX_RETRIES); do
  if curl -f "$API_URL/api/v1/health" > /dev/null 2>&1; then
    echo "✓ API is healthy"
    break
  fi
  if [ $i -eq $MAX_RETRIES ]; then
    echo "✗ API failed to become healthy after ${MAX_RETRIES} attempts"
    exit 1
  fi
  echo "  Attempt $i/$MAX_RETRIES..."
  sleep $RETRY_DELAY
done

# Test health endpoints
echo "Testing health endpoints..."
curl -f "$API_URL/api/v1/health" || exit 1
echo "✓ GET /health passed"

curl -f "$API_URL/api/v1/health/ready" || exit 1
echo "✓ GET /health/ready passed"

curl -f "$API_URL/api/v1/health/live" || exit 1
echo "✓ GET /health/live passed"

# Test API endpoints with auth
echo "Testing API endpoints..."
HEALTH_STATUS=$(curl -s "$API_URL/api/v1/health" | grep -o '"status":"[^"]*"')
if [[ $HEALTH_STATUS == *"ok"* ]]; then
  echo "✓ API responding correctly"
else
  echo "✗ API health check failed"
  exit 1
fi

echo ""
echo "✓ All smoke tests passed!"
exit 0
```

---

## Task 5: Health Checks Enhancement (2 hours)

### 5.1 Enhance Health Check Endpoints

Update `/opt/claude/taskmaster-pro/apps/api/src/app.ts`:

```typescript
// Replace existing health endpoints with:

// Health check - basic
app.get('/api/v1/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: appConfig.version,
    uptime: process.uptime(),
  });
});

// Readiness check - can serve traffic
app.get('/api/v1/health/ready', async (req, res) => {
  try {
    // Check database connectivity
    const dbHealth = await checkDatabaseHealth();
    // Check cache connectivity
    const cacheHealth = await checkCacheHealth();

    if (!dbHealth.ok || !cacheHealth.ok) {
      return res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth,
          cache: cacheHealth,
        }
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        cache: cacheHealth,
      }
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness check - process is alive
app.get('/api/v1/health/live', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    memory: {
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      externalMB: Math.round(memoryUsage.external / 1024 / 1024),
    },
    uptime: Math.round(uptime),
  });
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  let metrics = `# HELP nodejs_memory_heap_used Heap memory used in bytes\n`;
  metrics += `# TYPE nodejs_memory_heap_used gauge\n`;
  metrics += `nodejs_memory_heap_used ${memoryUsage.heapUsed}\n`;
  metrics += `\n`;
  metrics += `# HELP nodejs_memory_heap_total Heap memory total in bytes\n`;
  metrics += `# TYPE nodejs_memory_heap_total gauge\n`;
  metrics += `nodejs_memory_heap_total ${memoryUsage.heapTotal}\n`;
  metrics += `\n`;
  metrics += `# HELP process_uptime_seconds Process uptime in seconds\n`;
  metrics += `# TYPE process_uptime_seconds gauge\n`;
  metrics += `process_uptime_seconds ${uptime}\n`;

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Helper functions
async function checkDatabaseHealth() {
  try {
    // Test database connection
    const start = Date.now();
    // Add actual DB ping here based on your setup
    const duration = Date.now() - start;
    return {
      ok: true,
      responseTime: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkCacheHealth() {
  try {
    // Test cache connection
    const start = Date.now();
    // Add actual cache ping here based on your setup
    const duration = Date.now() - start;
    return {
      ok: true,
      responseTime: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## Implementation Checklist

### Week 1

- [ ] Create Dockerfile and test locally
- [ ] Create docker-compose.yml
- [ ] Create configuration schema and loader
- [ ] Create environment files (.env.development, .env.production.template)
- [ ] Test local Docker build and run

### Week 2

- [ ] Create database migration files
- [ ] Create migration runner script
- [ ] Create GitHub Actions deploy workflow
- [ ] Create smoke tests script
- [ ] Enhance health check endpoints
- [ ] Test deployment pipeline with staging

### Validation

- [ ] `docker build -t taskmaster-api .` succeeds
- [ ] `docker-compose up` starts all services
- [ ] Configuration validation runs at startup
- [ ] Database migrations can be applied
- [ ] GitHub Actions deploy workflow triggers on push
- [ ] Smoke tests pass on deployed environment
- [ ] Health checks return expected data

---

## Troubleshooting

### Docker Build Fails
```bash
# Clear cache and rebuild
docker system prune -a
docker build --no-cache -t taskmaster-api .
```

### Port Already in Use
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check env var
echo $DATABASE_URL
```

### Deployment Fails
- Check GitHub secrets are set
- Verify SSH keys are correct
- Check deployment server has Docker installed
- Verify firewall rules allow SSH

---

## Next Steps After Phase 1

1. Monitor deployment in production
2. Set up error tracking (Sentry)
3. Implement centralized logging
4. Add load testing
5. Create runbooks and documentation

**Estimated Time**: Phase 1 takes 15-20 hours with one developer

**Success Criteria**:
- ✅ API runs in Docker container
- ✅ Automated deployment via GitHub Actions
- ✅ Database migrations apply successfully
- ✅ Configuration is environment-specific
- ✅ Health checks pass in all environments
