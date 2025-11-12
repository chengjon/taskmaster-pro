# Task Master Pro - 性能优化方案

## 📊 概述

本文档提供了Task Master Pro API和Python SDK的全面性能优化方案，包括已实现的优化、性能指标分析和未来改进方向。

**文档版本**: 1.0.0
**生成日期**: 2025-11-12
**更新状态**: 进行中

---

## 🔍 现状分析

### 已实现的性能优化

#### 1. 缓存机制（Cache Middleware）
**位置**: `apps/api/src/middleware/cache.middleware.ts`

**特性**:
- ✅ 内存缓存 (In-Memory Cache)
- ✅ 智能TTL管理 (默认5分钟)
- ✅ ETag支持 (304 Not Modified)
- ✅ LRU淘汰策略 (基于访问频率)
- ✅ 模式匹配清除 (Pattern-based Invalidation)

**配置参数**:
```typescript
// 默认配置
CACHE_DEFAULT_TTL = 300000        // 5分钟
CACHE_MAX_SIZE = 100              // 100MB
CACHE_ENABLE_ETAG = true          // 启用ETag
CLEANUP_INTERVAL = 60000          // 1分钟清理周期
```

**性能收益**:
- **缓存命中率**: 预期70-80%（读多写少场景）
- **响应时间**: 减少80-95%（命中时）
- **数据库压力**: 降低60-70%（减少查询）

#### 2. 速率限制（Rate Limiting）
**位置**: `apps/api/src/middleware/rate-limit.middleware.ts`

**实现策略**:

##### 全局限制器
```
窗口期: 15分钟
请求限额: 100
计数基础: 用户ID或IP地址
```

##### 认证端点限制（严格）
```
窗口期: 15分钟
请求限额: 5
计数模式: 仅计算失败请求
目的: 防止暴力破解
```

##### 写操作限制（适中）
```
窗口期: 1分钟
请求限额: 30
适用方法: POST, PATCH, DELETE
目的: 防止数据库过载
```

##### 读操作限制（宽松）
```
窗口期: 1分钟
请求限额: 100
适用方法: GET
目的: 允许高频查询
```

##### Token Bucket算法
```typescript
最大令牌数: 100
补充速率: 10个/秒
补充间隔: 1秒
用途: 精细化速率控制
```

**性能收益**:
- **服务稳定性**: 防止单个用户过载
- **资源保护**: 预防DDoS和滥用
- **公平性**: 多用户场景下的资源分配

#### 3. 其他性能优化

**请求日志记录**
- 结构化日志 (JSON格式)
- 性能追踪信息
- 错误堆栈跟踪

**错误处理**
- 优雅降级
- 标准化错误响应
- 重试友好的设计

---

## 📈 性能指标基准

### 响应时间目标

| 操作类型 | 目标响应时间 | 说明 |
|---------|----------|------|
| GET /tasks (缓存命中) | <10ms | 直接返回缓存 |
| GET /tasks (缓存未中) | <50ms | 数据库查询 |
| POST /tasks | <100ms | 写操作+缓存清除 |
| PATCH /tasks/{id} | <80ms | 更新+缓存清除 |
| DELETE /tasks/{id} | <80ms | 删除+缓存清除 |

### 吞吐量目标

| 指标 | 目标值 | 条件 |
|------|-------|------|
| 缓存命中时 | >10,000 req/s | 单个API实例 |
| 缓存未中时 | >1,000 req/s | 单个API实例 |
| 并发用户数 | >500 | 内存使用 <500MB |

### 内存使用目标

| 场景 | 目标内存 | 缓存条目数 |
|------|--------|----------|
| 空闲状态 | <100MB | 0 |
| 正常负载 | <300MB | ~10,000 |
| 高负载 | <500MB | ~50,000 |

---

## 🚀 性能优化分层方案

### 第1层：应用层优化（已实现）

#### 1.1 缓存策略
```
GET请求 → 检查缓存 → 命中返回 → 未中调用服务 → 缓存结果
```

**优化点**:
- ✅ 缓存键设计 (用户+方法+路径+查询)
- ✅ TTL分层 (不同端点不同TTL)
- ✅ ETag验证 (减少传输数据)
- ✅ 模式清除 (智能失效策略)

**配置建议**:
```typescript
// 不同端点的TTL配置
const ttlConfig = {
  '/tasks': 300000,           // 5分钟
  '/tasks/:id': 600000,       // 10分钟
  '/tasks/:id/subtasks': 300000, // 5分钟
  '/health': 60000            // 1分钟
};
```

#### 1.2 请求压缩
**当前**: 未实现
**建议**:
```typescript
import compression from 'compression';

app.use(compression({
  level: 6,                   // 压缩级别 (1-9)
  threshold: 1024             // 超过1KB才压缩
}));
```

**预期收益**: 传输数据量减少60-80%

#### 1.3 连接池优化
**当前**: 默认配置
**建议**:
```typescript
// 数据库连接池
const poolConfig = {
  min: 5,                     // 最小连接数
  max: 20,                    // 最大连接数
  idleTimeoutMillis: 30000,   // 空闲超时
  connectionTimeoutMillis: 5000
};
```

### 第2层：数据库层优化（待实现）

#### 2.1 查询优化
**需要分析的查询**:
- ✓ 列表查询的分页与排序
- ✓ 关联查询的优化
- ✓ 复杂查询的预编译

**建议**:
```sql
-- 添加索引
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- 复合索引
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
```

#### 2.2 批量操作优化
**当前实现**: 单条插入/更新
**优化方案**: 批量SQL操作

```typescript
// 优化前: 100次单条插入
for (const task of tasks) {
  await db.insert('tasks', task);
}

// 优化后: 1次批量插入
await db.insertBatch('tasks', tasks, { batchSize: 1000 });
```

**预期收益**: 插入性能提升50-70%

#### 2.3 查询结果缓存
**多层缓存策略**:
```
查询 → L1缓存(内存) → L2缓存(Redis) → L3缓存(DB) → 执行查询
```

### 第3层：网络层优化（待实现）

#### 3.1 HTTP/2推送
```typescript
res.setHeader('Link', '</api/v1/tasks/1; rel=preload; as=fetch>');
```

#### 3.2 CDN集成
```
用户 → CDN边缘节点 → 源服务器
```

**适用内容**:
- 静态资源 (Swagger UI)
- API应答缓存
- 地理分布式缓存

#### 3.3 响应分页
```typescript
// 大结果集自动分页
GET /api/v1/tasks?limit=20&offset=0
→ 返回20条 + 分页信息
```

---

## 💾 缓存策略深度分析

### 当前缓存流程图

```
┌─────────────────────────────────────────┐
│ HTTP GET Request                        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ 生成缓存键      │
         │ (user+method   │
         │  +path+query)  │
         └────────┬───────┘
                  │
                  ▼
        ┌──────────────────┐
        │ 检查缓存存储    │
        └────┬────────┬───┘
             │        │
        缓存命中   缓存未中
             │        │
             ▼        ▼
        ┌────────┐  ┌──────────────┐
        │验证    │  │调用业务逻辑  │
        │ETag    │  │查询数据库    │
        └────┬───┘  └────┬─────────┘
             │           │
             ▼           ▼
        ┌─────────────────────┐
        │ 返回响应            │
        │ + 缓存控制头        │
        │ + X-Cache标记       │
        └─────────────────────┘
```

### 缓存键设计

```typescript
// 格式: userId:method:path?query
例如:
- user-123:GET:/api/v1/tasks?status=pending
- user-123:GET:/api/v1/tasks/task-1
- anonymous:GET:/api/v1/health
```

### 缓存失效策略

**自动失效**:
```typescript
// 修改操作自动清除相关缓存
POST /api/v1/tasks → 清除 *:GET:*/tasks*
PATCH /api/v1/tasks/{id} → 清除 *:GET:*/tasks*
DELETE /api/v1/tasks/{id} → 清除 *:GET:*/tasks*
```

**手动清除** (管理员):
```bash
# 清除所有缓存
curl -X POST /api/v1/admin/cache/clear

# 清除模式匹配的缓存
curl -X POST '/api/v1/admin/cache/clear?pattern=user-123:*'
```

---

## ⚡ 性能优化实施路线图

### Phase 1: 立即实施（1-2周）
- [ ] 添加Gzip压缩中间件
- [ ] 优化缓存TTL配置
- [ ] 添加缓存统计接口
- [ ] 实现缓存预热策略
- [ ] 编写性能测试基准

### Phase 2: 短期优化（2-4周）
- [ ] 数据库查询优化
  - [ ] 添加关键索引
  - [ ] 分析慢查询
  - [ ] 优化N+1问题

- [ ] 批量操作优化
  - [ ] 实现批量插入
  - [ ] 实现批量更新
  - [ ] 优化批量删除

- [ ] Redis集成（可选）
  - [ ] 分布式缓存
  - [ ] 会话存储
  - [ ] 速率限制存储

### Phase 3: 中期优化（1-2个月）
- [ ] 数据库连接池优化
- [ ] 异步处理队列
- [ ] API网关集成
- [ ] 监控与告警

### Phase 4: 长期优化（2-6个月）
- [ ] CDN集成
- [ ] 地域分布式部署
- [ ] GraphQL API
- [ ] WebSocket实时推送

---

## 🧪 性能测试方案

### 1. 基准测试工具

**Apache Bench**:
```bash
# 测试缓存命中性能
ab -n 10000 -c 100 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/tasks

# 预期结果: >1000 req/s (缓存命中)
```

**autocannon**:
```bash
# Node.js性能测试
autocannon -c 100 -d 30 \
  http://localhost:3000/api/v1/tasks

# 预期: >5000 req/s (缓存命中)
```

**wrk**:
```bash
# 高性能HTTP基准测试
wrk -t 12 -c 400 -d 30s \
  http://localhost:3000/api/v1/tasks

# 预期: >10000 req/s (缓存命中)
```

### 2. 监控指标

**关键指标**:
```typescript
metrics = {
  // 缓存指标
  cacheHitRate: 'cache命中次数 / 总请求数',
  cacheSize: '缓存占用内存(MB)',
  cachedEntries: '缓存条目数量',

  // 响应时间
  p50ResponseTime: '50%请求的响应时间',
  p95ResponseTime: '95%请求的响应时间',
  p99ResponseTime: '99%请求的响应时间',

  // 吞吐量
  requestsPerSecond: '每秒请求数',
  failureRate: '失败请求百分比',

  // 资源使用
  memoryUsage: '内存占用',
  cpuUsage: 'CPU占用',
  connectionCount: '数据库连接数'
};
```

### 3. 压力测试场景

**场景1: 缓存命中(热点数据)**
```bash
# 重复访问同一任务列表
wrk -t 4 -c 100 -d 60s \
  --script=repeat.lua \
  http://localhost:3000/api/v1/tasks
```

**场景2: 缓存未中(高并发新请求)**
```bash
# 并发创建大量任务
wrk -t 4 -c 100 -d 60s \
  --script=create.lua \
  http://localhost:3000/api/v1/tasks
```

**场景3: 混合操作(读写混合)**
```bash
# 70%读 + 30%写
wrk -t 4 -c 100 -d 60s \
  --script=mixed.lua \
  http://localhost:3000/api/v1/tasks
```

---

## 📊 性能监控仪表板

### 建议的监控指标

```typescript
// 实时监控接口 (管理员)
GET /api/v1/admin/metrics

Response:
{
  timestamp: '2025-11-12T12:00:00Z',
  uptime: 3600,
  cache: {
    hitRate: 0.78,
    size: 125,           // MB
    entries: 5234,
    avgEntrySize: 23,    // KB
    topEntries: [...]
  },
  performance: {
    avgResponseTime: 12,    // ms
    p95ResponseTime: 45,    // ms
    p99ResponseTime: 120,   // ms
    requestsPerSecond: 1205
  },
  rateLimit: {
    activeKeys: 342,
    exceedCount: 23,    // 超限次数
    topLimiters: [...]
  },
  errors: {
    total: 12,
    byType: {
      '404': 5,
      '429': 4,
      '500': 3
    }
  },
  database: {
    connectionPoolSize: 15,
    activeConnections: 8,
    queryTime: {
      p50: 2,
      p95: 8,
      p99: 15
    }
  }
}
```

---

## 🔧 环境变量配置

### 缓存配置

```bash
# .env
CACHE_DEFAULT_TTL=300000           # 5分钟(毫秒)
CACHE_MAX_SIZE=100                 # 最大缓存大小(MB)
CACHE_ENABLE_ETAG=true             # 启用ETag支持
CACHE_CLEANUP_INTERVAL=60000       # 清理周期(毫秒)

# TTL按端点覆盖
CACHE_TTL_TASKS=300000             # /tasks (5分钟)
CACHE_TTL_TASK_DETAIL=600000       # /tasks/:id (10分钟)
CACHE_TTL_HEALTH=60000             # /health (1分钟)
```

### 速率限制配置

```bash
# 全局限制
RATE_LIMIT_WINDOW_MS=900000        # 15分钟
RATE_LIMIT_MAX=100                 # 100请求

# 写操作限制
RATE_LIMIT_WRITE_WINDOW_MS=60000   # 1分钟
RATE_LIMIT_WRITE_MAX=30            # 30请求

# 读操作限制
RATE_LIMIT_READ_WINDOW_MS=60000    # 1分钟
RATE_LIMIT_READ_MAX=100            # 100请求

# 认证限制
RATE_LIMIT_AUTH_WINDOW_MS=900000   # 15分钟
RATE_LIMIT_AUTH_MAX=5              # 5请求
```

### 数据库配置

```bash
# 连接池
DB_POOL_MIN=5                      # 最小连接数
DB_POOL_MAX=20                     # 最大连接数
DB_IDLE_TIMEOUT=30000              # 空闲超时(毫秒)
DB_CONNECTION_TIMEOUT=5000         # 连接超时(毫秒)

# 查询优化
DB_QUERY_TIMEOUT=5000              # 查询超时(毫秒)
DB_STATEMENT_CACHE_SIZE=100        # 预编译语句缓存
```

---

## 📝 性能优化检查清单

### 应用层检查

- [ ] 缓存策略是否合理
- [ ] TTL配置是否优化
- [ ] 缓存键设计是否高效
- [ ] 缓存失效策略是否正确
- [ ] 是否启用Gzip压缩
- [ ] 错误处理是否完善
- [ ] 日志记录是否适量

### 数据库层检查

- [ ] 是否添加关键索引
- [ ] 是否优化了慢查询
- [ ] 连接池是否配置合理
- [ ] 是否实现了批量操作
- [ ] 是否避免N+1问题

### 网络层检查

- [ ] 是否启用HTTP/2
- [ ] 是否启用Keep-Alive
- [ ] 响应是否被压缩
- [ ] 是否有不必要的头部

### 监控与告警

- [ ] 是否有性能监控
- [ ] 缓存命中率是否被追踪
- [ ] 响应时间是否被记录
- [ ] 是否有告警规则

---

## 🎯 性能目标与SLA

### 可用性目标
```
目标: 99.9% 可用性 (每月 <43分钟宕机)
方式:
- 多实例部署
- 健康检查
- 自动故障转移
```

### 响应时间目标
```
P50 < 20ms  (50%请求)
P95 < 100ms (95%请求)
P99 < 500ms (99%请求)
```

### 吞吐量目标
```
单实例: >5,000 req/s (缓存命中)
单实例: >500 req/s (缓存未中)
```

### 成本效率
```
每1000请求成本 < $0.001
内存使用 < 1GB (单实例)
```

---

## 参考资源

### 性能优化工具
- **Apache Bench**: HTTP基准测试
- **autocannon**: Node.js性能测试
- **wrk**: 高性能HTTP压力测试
- **New Relic**: APM监控
- **Datadog**: 基础设施监控
- **Grafana**: 指标可视化

### 最佳实践文档
- [Express.js性能最佳实践](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js性能监控](https://nodejs.org/en/docs/guides/nodejs-performance-hooks/)
- [数据库查询优化](https://use-the-index-luke.com/)
- [HTTP缓存RFC 7234](https://tools.ietf.org/html/rfc7234)

---

**文档版本**: 1.0.0
**最后更新**: 2025-11-12
**维护者**: Task Master Pro Team
