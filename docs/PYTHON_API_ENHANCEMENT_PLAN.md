# Python & API 功能增强计划

## 📋 概述

Task Master Pro 目前是纯 TypeScript 实现，专注于 CLI 和 MCP 服务器。本计划旨在添加以下能力：

### 目标
1. **REST API 服务器** - 提供可扩展的 HTTP API
2. **Python SDK** - 允许 Python 生态系统集成
3. **API 文档** - OpenAPI/Swagger 规范
4. **多语言支持** - 支持 Python、JavaScript、Go 等

### 预期收益
- 扩大用户基数（Python 开发者）
- 企业集成能力
- 更灵活的部署选项
- 完整的 API 优先架构

---

## 🏗️ 架构设计

### Phase 1: REST API 服务器（第1-2周）

```
apps/api/
├── src/
│   ├── index.ts                    # 服务器入口
│   ├── app.ts                      # Express 应用配置
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Bearer token auth
│   │   ├── error-handler.ts        # 统一错误处理
│   │   ├── request-logger.ts       # 请求日志
│   │   └── cors.middleware.ts      # CORS 配置
│   ├── routes/
│   │   ├── index.ts                # 路由聚合
│   │   ├── tasks.routes.ts         # /api/tasks
│   │   ├── projects.routes.ts      # /api/projects
│   │   ├── health.routes.ts        # /api/health
│   │   └── auth.routes.ts          # /api/auth
│   ├── controllers/
│   │   ├── tasks.controller.ts     # 任务处理逻辑
│   │   ├── projects.controller.ts  # 项目处理逻辑
│   │   └── health.controller.ts    # 健康检查
│   ├── services/
│   │   └── api.service.ts          # API 业务逻辑
│   └── utils/
│       ├── response.ts             # 统一响应格式
│       ├── validators.ts           # 请求验证
│       └── decorators.ts           # 装饰器工具
├── tests/
│   ├── integration/
│   │   ├── tasks.test.ts
│   │   ├── projects.test.ts
│   │   └── auth.test.ts
│   └── unit/
│       └── middleware.test.ts
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Phase 2: Python SDK（第2-3周）

```
packages/python-sdk/
├── taskmaster_pro/
│   ├── __init__.py                 # 包初始化
│   ├── client.py                   # 主客户端类
│   ├── config.py                   # 配置管理
│   ├── auth/
│   │   ├── __init__.py
│   │   └── oauth.py                # OAuth 2.0 支持
│   ├── api/
│   │   ├── __init__.py
│   │   ├── base.py                 # 基础 API 客户端
│   │   ├── tasks.py                # 任务 API
│   │   ├── projects.py             # 项目 API
│   │   └── models.py               # 数据模型
│   ├── exceptions.py               # 异常定义
│   ├── utils.py                    # 工具函数
│   └── types.py                    # 类型定义
├── tests/
│   ├── unit/
│   │   ├── test_client.py
│   │   └── test_auth.py
│   ├── integration/
│   │   ├── test_tasks_api.py
│   │   └── test_projects_api.py
│   └── fixtures/
│       └── mock_server.py
├── examples/
│   ├── basic_usage.py              # 基础用法示例
│   ├── task_management.py          # 任务管理示例
│   └── advanced_features.py        # 高级功能示例
├── docs/
│   ├── index.md                    # SDK 文档
│   ├── api_reference.md            # API 参考
│   └── examples.md                 # 使用示例
├── setup.py
├── pyproject.toml
├── requirements.txt
└── README.md
```

### Phase 3: API 文档 & 测试（第3周）

```
docs/api/
├── openapi.yaml                    # OpenAPI 3.0 规范
├── schema.json                     # JSON Schema 定义
├── guides/
│   ├── getting-started.md
│   ├── authentication.md
│   ├── rate-limiting.md
│   └── error-handling.md
└── examples/
    ├── curl.md
    ├── python.md
    └── javascript.md
```

---

## 📊 Phase 1: REST API 服务器详细规划

### 1.1 核心 API 端点设计

#### 任务管理
```
GET    /api/v1/tasks                      # 列表任务
GET    /api/v1/tasks/:id                  # 获取任务
POST   /api/v1/tasks                      # 创建任务
PATCH  /api/v1/tasks/:id                  # 更新任务
DELETE /api/v1/tasks/:id                  # 删除任务
POST   /api/v1/tasks/:id/subtasks         # 添加子任务
PUT    /api/v1/tasks/:id/dependencies     # 设置依赖
```

#### 项目/工作空间
```
GET    /api/v1/projects                   # 列表项目
GET    /api/v1/projects/:id               # 获取项目
POST   /api/v1/projects                   # 创建项目
PATCH  /api/v1/projects/:id               # 更新项目
DELETE /api/v1/projects/:id               # 删除项目
```

#### 认证
```
POST   /api/v1/auth/login                 # 用户登录
POST   /api/v1/auth/logout                # 用户登出
POST   /api/v1/auth/refresh               # 刷新令牌
GET    /api/v1/auth/user                  # 获取用户信息
```

#### 健康检查
```
GET    /api/v1/health                     # 服务状态
GET    /api/v1/health/ready               # 就绪检查
GET    /api/v1/health/live                # 存活检查
```

### 1.2 数据模型 & 序列化

#### 任务响应格式
```typescript
{
  "id": "1.2",
  "title": "实现用户认证",
  "description": "...",
  "status": "in-progress",
  "priority": "high",
  "createdAt": "2025-11-11T10:00:00Z",
  "updatedAt": "2025-11-11T15:30:00Z",
  "subtasks": [
    {
      "id": "1.2.1",
      "title": "实现登录",
      "status": "done"
    }
  ],
  "tags": ["auth", "security"],
  "complexity": "high",
  "dependencies": ["1.1"],
  "owner": "john@example.com"
}
```

#### 统一响应格式
```typescript
{
  "success": true,
  "data": {...},
  "timestamp": "2025-11-11T15:30:00Z",
  "version": "1.0.0"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID 99 not found",
    "details": {...}
  },
  "timestamp": "2025-11-11T15:30:00Z"
}
```

### 1.3 认证 & 授权

- **Bearer Token** - 由 Supabase OAuth 提供
- **API Keys** - 用于服务间通信
- **Rate Limiting** - 基于用户/IP 的限流
- **CORS** - 可配置的跨域资源共享

### 1.4 技术栈

| 组件 | 选择 | 原因 |
|------|------|------|
| 框架 | Express.js | 轻量级、生态好、与 Node 生态无缝集成 |
| 验证 | Zod | 类型安全、与 TypeScript 完美配合 |
| 日志 | Pino | 高性能、JSON 格式、结构化日志 |
| 测试 | Jest + Supertest | 完整的 HTTP API 测试能力 |
| 文档 | Swagger/OpenAPI | 标准化 API 文档 |
| 部署 | Docker + K8s | 容器化、可扩展 |

---

## 📦 Phase 2: Python SDK 详细规划

### 2.1 Python 客户端核心功能

```python
from taskmaster_pro import TaskMasterClient, Config

# 初始化
config = Config(
    base_url="https://api.taskmaster.dev",
    api_key="your_api_key",
    timeout=30
)
client = TaskMasterClient(config)

# 任务操作
tasks = client.tasks.list(project_id="proj-1")
task = client.tasks.get("1.2")
new_task = client.tasks.create(
    title="新任务",
    description="...",
    priority="high"
)
client.tasks.update("1.2", status="done")
client.tasks.delete("1.2")

# 项目操作
projects = client.projects.list()
project = client.projects.get("proj-1")

# 批量操作
results = client.tasks.bulk_create([
    {"title": "任务 1", "priority": "high"},
    {"title": "任务 2", "priority": "medium"}
])

# 异步操作
async with TaskMasterClient(config) as client:
    tasks = await client.tasks.list_async()
```

### 2.2 Python 包结构

| 模块 | 功能 | 大小 |
|------|------|------|
| `client.py` | 主客户端类 | ~300 行 |
| `api/base.py` | 基础 API 客户端 | ~200 行 |
| `api/tasks.py` | 任务 API | ~150 行 |
| `api/projects.py` | 项目 API | ~100 行 |
| `auth/oauth.py` | OAuth 支持 | ~200 行 |
| `models.py` | 数据模型 | ~250 行 |
| `exceptions.py` | 异常处理 | ~80 行 |

### 2.3 依赖关系

```
requests >= 2.28.0          # HTTP 客户端
pydantic >= 2.0             # 数据验证
pydantic-settings >= 2.0    # 配置管理
httpx >= 0.24.0            # 异步 HTTP 支持
typing-extensions          # 类型提示兼容性
```

### 2.4 PyPI 发布计划

```
Package: taskmaster-pro
Version: 0.1.0
Classifiers:
  - Development Status :: 3 - Alpha
  - Intended Audience :: Developers
  - License :: OSI Approved :: MIT License
  - Programming Language :: Python :: 3.9+
  - Topic :: Software Development :: Libraries
```

---

## 🔐 认证与安全

### OAuth 2.0 流程

```
1. 用户请求: POST /api/v1/auth/login
2. 服务器返回 Supabase OAuth URL
3. 用户认证后获得 authorization code
4. 交换 code 得到 access_token + refresh_token
5. 后续请求使用 Bearer token
6. Token 过期时使用 refresh_token 续期
```

### API Key 认证

```
# 用于 CI/CD 和服务间通信
curl -H "Authorization: Bearer sk-abc123..." \
     https://api.taskmaster.dev/api/v1/tasks
```

### 安全最佳实践

- [ ] HTTPS 强制
- [ ] CORS 白名单
- [ ] Rate limiting (100 req/min per user)
- [ ] Request logging (不记录敏感信息)
- [ ] SQL injection 防护
- [ ] CSRF token 保护
- [ ] Input validation/sanitization

---

## 📈 实施时间表

### Week 1: REST API 基础
- Day 1-2: Express 应用框架 + 中间件
- Day 3-4: 任务管理 API 端点
- Day 5: 健康检查 + 部署配置

### Week 2: 认证 & 高级功能
- Day 1-2: OAuth 集成 + API Key 认证
- Day 3-4: 错误处理 + 日志系统
- Day 5: 性能优化 + Docker 容器化

### Week 3: Python SDK
- Day 1-2: 基础 SDK 实现
- Day 3-4: 异步支持 + 测试
- Day 5: 文档 + PyPI 发布

---

## 🚀 部署架构

### 本地开发
```bash
npm install
npm run api:dev          # 启动 API 服务器
npm test api             # 测试
```

### Docker 部署
```bash
docker build -t taskmaster-api .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e AUTH_SECRET=... \
  taskmaster-api
```

### Kubernetes 部署
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: taskmaster-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: taskmaster-api
  template:
    metadata:
      labels:
        app: taskmaster-api
    spec:
      containers:
      - name: api
        image: taskmaster-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /api/v1/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## 📊 预期指标

### API 性能
| 指标 | 目标 | 说明 |
|------|------|------|
| 响应时间 | < 100ms | P95 |
| QPS | 1000+ | 每秒请求 |
| 可用性 | 99.9% | SLA |
| 错误率 | < 0.1% | 4xx + 5xx |

### Python SDK 覆盖
| 指标 | 目标 |
|------|------|
| 代码覆盖率 | > 85% |
| 文档完整度 | 100% |
| 类型提示 | 100% |
| 支持的 Python 版本 | 3.9+ |

---

## 🎯 成功标准

### Phase 1 完成条件
- [ ] REST API 服务器正常运行
- [ ] 所有核心端点实现
- [ ] 100+ 集成测试通过
- [ ] OpenAPI 文档生成
- [ ] Docker 镜像成功构建

### Phase 2 完成条件
- [ ] Python SDK 在 PyPI 发布
- [ ] 所有 API 端点有 SDK 包装
- [ ] 异步/同步 API 都支持
- [ ] 文档齐全（中文+英文）
- [ ] 超过 500+ 行 Python 代码

### Phase 3 完成条件
- [ ] OpenAPI 3.0 规范完整
- [ ] 所有端点都有 curl 示例
- [ ] Python、JavaScript 各有完整示例
- [ ] 性能基准测试完成
- [ ] 安全审计通过

---

## 💡 额外增强点

### 可选功能（Phase 4+）
1. **GraphQL API** - 替代 REST 的灵活选项
2. **WebSocket 支持** - 实时更新
3. **Go SDK** - 支持 Go 生态
4. **Webhook** - 事件驱动集成
5. **SDK 代码生成** - 从 OpenAPI 自动生成
6. **性能监控** - Prometheus metrics
7. **链路追踪** - Jaeger/OpenTelemetry

---

## 📚 相关文档

- [Task Master Pro 架构](./CLAUDE.md)
- [数据类型定义](./common/types/index.ts)
- [现有 API 客户端](./modules/storage/utils/api-client.ts)
- [API 存储适配器](./modules/storage/adapters/api-storage.ts)
- [Supabase 集成](./modules/integration/clients/supabase-client.ts)

---

**最后更新：** 2025-11-11

*这是一份活跃的计划，将根据实际发展进行调整。*
