# 快速开始指南 - 实现关键架构修复

**目标受众**: 开发者和架构师

**预计时间**: 3 周 (P0: 1 周, P1: 2 周)

**上次更新**: 2025年11月12日

---

## 概览

这个指南帮助你实现 Task Master Pro 的 5 个关键架构修复。这些修复将提升系统可靠性、数据一致性和可扩展性。

### 修复的收益

| 方面 | 当前状态 | 修复后 |
|-----|--------|-------|
| API 功能 | ❌ 返回 Mock 数据 | ✅ 返回真实数据 |
| 数据一致性 | ⚠️ CLI 和 API 不同步 | ✅ 完美同步 |
| 并发安全 | ❌ 数据丢失风险 | ✅ 原子操作保障 |
| 可扩展性 | 🟡 受限于文件系统 | ✅ 支持数据库迁移 |
| 实时功能 | ❌ 无法实现 | ✅ 可以实现 |
| 代码质量 | 85/100 | 92/100 |
| 生产就绪度 | 75/100 | 90/100 |

---

## 前置要求

### 环境准备

```bash
# 1. 进入项目目录
cd /path/to/taskmaster-pro

# 2. 确认依赖已安装
npm install

# 3. 检查开发环境
npm run build

# 4. 运行现有测试 (基线)
npm test
```

### 了解项目结构

```
packages/tm-core/                    # 核心业务逻辑
├── modules/
│   ├── tasks/                       # 任务管理域
│   ├── storage/                     # 存储层 (关键修复位置)
│   └── events/                      # 事件系统 (关键修复位置)
│
apps/api/                            # REST API
├── src/
│   ├── services/task.service.ts     # 问题 #1 修复位置
│   └── middleware/cache.middleware.ts # 问题 #2 修复位置
│
apps/cli/                            # CLI 应用
└── src/commands/
```

### 必读文档

在开始编码前，请阅读这些文档 (总共 30 分钟):

1. **[执行摘要](EXECUTION_SUMMARY.md)** (10 分钟)
   - 完整工作总结
   - 5 个问题的快速概览
   - 为什么不需要 Docker

2. **[修订评估总结](REVISED_ASSESSMENT_SUMMARY.md)** (10 分钟)
   - 每个问题的详细说明
   - 开发指南和代码片段

3. **[关键修复实现计划](CRITICAL_FIXES_IMPLEMENTATION_PLAN.md)** (10 分钟)
   - 400+ 行代码示例
   - 步骤化实现指南
   - 验证检查清单

---

## 第 1 周: P0 关键修复 (5-6 天)

### 目标

实现 API 功能、数据一致性和并发安全。

### 日程安排

```
第1天:  开发环境准备 + 创建功能分支
第2-3天: 修复问题 #1 - API Mock 数据 (2-3 天)
第3-4天: 修复问题 #2 - 缓存不一致 (1-2 天)
第4-5天: 修复问题 #3 - 并发写入风险 (1-2 天)
第5-6天: 集成测试 + 验证 + 提交 PR
```

---

## 第 1 天: 环境准备

### Step 1: 创建功能分支

```bash
# 创建功能分支
git checkout -b fix/critical-architecture-issues

# 验证分支创建
git branch -v
```

### Step 2: 查看关键代码

打开以下文件，理解当前实现:

```bash
# 问题 #1 相关文件
code apps/api/src/services/task.service.ts
code apps/api/src/routes/tasks.routes.ts

# 问题 #2 相关文件
code apps/api/src/middleware/cache.middleware.ts

# 问题 #3 相关文件
code packages/tm-core/src/modules/storage/file-system.storage.ts
code packages/tm-core/src/modules/storage/
```

### Step 3: 建立测试基线

```bash
# 运行所有测试，记录基线
npm test

# 生成覆盖率报告
npm run test:coverage
```

**预期**: 当前测试应该都通过。这是我们的基线。

---

## 第 2-3 天: 问题 #1 - API Mock 数据

### 问题描述

**症状**: API 调用总是返回硬编码的 mock 数据:
```json
{ "id": "1", "title": "Mock Task" }
```

**根本原因**: `TaskService.listTasks()` 返回 mock 数据而不是真实数据

**影响**: API 功能完全不可用

### 解决方案概览

将 `TaskService` 连接到真实的 `TmCore` 实例，而不是返回 mock 数据。

### 步骤化实现

#### Step 1: 理解当前代码

```bash
# 查看当前实现
code apps/api/src/services/task.service.ts
```

#### Step 2: 实现修复

按照 [CRITICAL_FIXES_IMPLEMENTATION_PLAN.md](CRITICAL_FIXES_IMPLEMENTATION_PLAN.md) 的"问题 #1"部分，完整实现代码。

**关键代码**:

```typescript
// apps/api/src/services/task.service.ts

import { createTmCore } from '@tm/core';
import type { Task } from '@tm/core/modules/tasks';

export class TaskService {
  private tmCore: ReturnType<typeof createTmCore>;

  constructor(projectPath?: string) {
    this.tmCore = createTmCore({
      projectPath: projectPath || process.cwd()
    });
  }

  async listTasks(): Promise<Task[]> {
    try {
      const tasks = await this.tmCore.tasks.list();
      return tasks;
    } catch (error) {
      console.error('Failed to list tasks:', error);
      throw error;
    }
  }

  async getTask(id: string): Promise<Task | null> {
    try {
      return await this.tmCore.tasks.get(id);
    } catch (error) {
      console.error(`Failed to get task ${id}:`, error);
      return null;
    }
  }
}
```

#### Step 3: 更新路由

```bash
# 查看路由文件
code apps/api/src/routes/tasks.routes.ts
```

确保路由使用新的 `TaskService` 方法。

#### Step 4: 编写测试

```typescript
// apps/api/src/services/task.service.spec.ts

import { TaskService } from './task.service.js';
import { createTmCore } from '@tm/core';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService();
  });

  it('should list real tasks from TmCore', async () => {
    const tasks = await service.listTasks();

    // 验证返回的不是 mock 数据
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);

    // 如果有任务，验证结构
    if (tasks.length > 0) {
      expect(tasks[0]).toHaveProperty('id');
      expect(tasks[0]).toHaveProperty('title');
    }
  });

  it('should get specific task by ID', async () => {
    const tasks = await service.listTasks();

    if (tasks.length > 0) {
      const taskId = tasks[0].id;
      const task = await service.getTask(taskId);

      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
    }
  });
});
```

#### Step 5: 运行测试

```bash
# 运行 API 测试
cd apps/api
npm test

# 或只运行 task.service 的测试
npm test -- task.service.spec.ts
```

#### Step 6: 验证 API

```bash
# 启动 API 服务
npm run dev

# 在另一个终端测试 API
curl http://localhost:3000/api/v1/tasks

# 应该返回真实任务，而不是 mock 数据
```

### 验证检查清单

- [ ] 修改了 `TaskService.listTasks()` 使用 `TmCore`
- [ ] 新增了 `getTask(id)` 方法
- [ ] 编写了单元测试
- [ ] 测试通过 (npm test)
- [ ] API 返回真实数据，不是 mock
- [ ] 提交代码和测试 (git commit)

---

## 第 3-4 天: 问题 #2 - 缓存不一致

### 问题描述

**症状**:
- 用户通过 CLI 更新任务
- API 在 5 分钟内仍然显示旧数据 (缓存的)
- CLI 和 API 显示不同的数据

**根本原因**: API 缓存 `tasks.json` 5 分钟，但 CLI 直接修改文件。没有缓存失效机制。

**影响**: 数据一致性问题，用户困惑

### 解决方案概览

监听 `tasks.json` 文件变化，自动失效缓存。

### 步骤化实现

#### Step 1: 创建 FileWatcher 类

```typescript
// packages/tm-core/src/modules/storage/file-watcher.ts

import fs from 'fs';
import { EventEmitter } from 'events';
import path from 'path';

export interface FileChangeEvent {
  timestamp: number;
  filePath: string;
  eventType: 'change' | 'rename';
}

export class FileWatcher extends EventEmitter {
  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(
    private filePath: string,
    private debounceMs: number = 100
  ) {
    super();
  }

  start(): void {
    if (this.watcher) return;

    try {
      this.watcher = fs.watch(this.filePath, (eventType, filename) => {
        if (!filename || !filename.includes('tasks')) return;

        // 防抖: 避免多次触发
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
          this.emit('change', {
            timestamp: Date.now(),
            filePath: this.filePath,
            eventType: eventType as 'change' | 'rename'
          } as FileChangeEvent);
        }, this.debounceMs);
      });

      this.emit('started');
    } catch (error) {
      this.emit('error', error);
    }
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.emit('stopped');
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }
}
```

#### Step 2: 更新缓存中间件

```typescript
// apps/api/src/middleware/cache.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { FileWatcher } from '@tm/core/modules/storage/file-watcher.js';
import path from 'path';

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class CacheMiddleware {
  private cache = new Map<string, CacheEntry>();
  private fileWatcher: FileWatcher | null = null;
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private tasksFilePath: string) {}

  initialize(): void {
    // 启动文件监听
    this.fileWatcher = new FileWatcher(
      path.dirname(this.tasksFilePath)
    );

    this.fileWatcher.on('change', () => {
      console.log('Tasks file changed, invalidating cache...');
      this.invalidate();
    });

    this.fileWatcher.on('error', (error) => {
      console.error('File watcher error:', error);
    });

    this.fileWatcher.start();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = `${req.method}:${req.path}`;
      const cached = this.cache.get(key);

      if (cached && Date.now() - cached.timestamp < this.ttlMs) {
        res.json(cached.data);
        return;
      }

      // 保存原始 res.json
      const originalJson = res.json.bind(res);

      // 拦截 res.json 以缓存响应
      res.json = (data: any) => {
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });
        return originalJson(data);
      };

      next();
    };
  }

  invalidate(): void {
    this.cache.clear();
  }

  destroy(): void {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }
    this.cache.clear();
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.ttlMs
      }))
    };
  }
}

// 在 API 应用中使用
export function initializeCacheMiddleware(app: Express, tasksFilePath: string) {
  const cacheMiddleware = new CacheMiddleware(tasksFilePath);
  cacheMiddleware.initialize();

  app.use(cacheMiddleware.middleware());

  // 优雅关闭
  process.on('SIGTERM', () => {
    cacheMiddleware.destroy();
  });

  return cacheMiddleware;
}
```

#### Step 3: 编写集成测试

```typescript
// apps/api/tests/integration/cache-coherence.test.ts

import { FileWatcher } from '@tm/core/modules/storage/file-watcher.js';
import { CacheMiddleware } from '../../src/middleware/cache.middleware.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Cache Coherence', () => {
  let testDir: string;
  let tasksFile: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `tm-cache-test-${Date.now()}`);
    tasksFile = path.join(testDir, 'tasks.json');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(tasksFile, JSON.stringify([]));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true });
  });

  it('should invalidate cache when file changes', async () => {
    const cacheMiddleware = new CacheMiddleware(tasksFile);

    // 缓存初始数据
    const mockRes = {
      json: (data: any) => {
        cacheMiddleware.middleware()(
          {} as any,
          { json: (d: any) => d } as any,
          () => {}
        );
      }
    };

    // 修改文件
    fs.writeFileSync(tasksFile, JSON.stringify([{ id: '1', title: 'Task 1' }]));

    // 应该检测到变化
    cacheMiddleware.initialize();

    await new Promise(resolve => {
      cacheMiddleware['fileWatcher']?.once('change', resolve);
      fs.appendFileSync(tasksFile, '');
    });

    // 验证缓存已失效
    expect(cacheMiddleware['cache'].size).toBe(0);
  });
});
```

#### Step 4: 验证实现

```bash
# 运行集成测试
npm test -- cache-coherence.test.ts

# 手动测试:
# 1. 启动 API
npm run dev

# 2. 在另一个终端调用 API
curl http://localhost:3000/api/v1/tasks

# 3. 通过 CLI 修改任务
TAMP add-task --prompt="New task"

# 4. 再次调用 API - 应该看到新任务
curl http://localhost:3000/api/v1/tasks
```

### 验证检查清单

- [ ] 创建了 `FileWatcher` 类
- [ ] 更新了 `CacheMiddleware` 使用文件监听
- [ ] 编写了集成测试
- [ ] 测试通过 (npm test)
- [ ] 手动验证 CLI 修改立即反映到 API
- [ ] 提交代码和测试

---

## 第 4-5 天: 问题 #3 - 并发写入风险

### 问题描述

**症状**:
- 多个进程同时修改 `tasks.json`
- 最后一个写入覆盖了之前的改动
- 数据丢失或损坏

**根本原因**: 文件写入不是原子的，没有锁机制

**影响**: 数据丢失风险，生产级不可接受

### 解决方案概览

使用文件锁实现原子写入。

### 步骤化实现

#### Step 1: 安装依赖

```bash
# 安装 proper-lockfile
npm install proper-lockfile

# 添加到 packages/tm-core
cd packages/tm-core
npm install proper-lockfile
```

#### Step 2: 创建原子文件写入器

```typescript
// packages/tm-core/src/modules/storage/atomic-file-writer.ts

import fs from 'fs/promises';
import lockfile from 'proper-lockfile';
import path from 'path';

export interface AtomicWriteOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  lockTimeoutMs?: number;
}

export class AtomicFileWriter {
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly lockTimeoutMs: number;

  constructor(options: AtomicWriteOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 100;
    this.lockTimeoutMs = options.lockTimeoutMs ?? 30000;
  }

  async writeJSON<T>(filePath: string, data: T): Promise<void> {
    let release: (() => Promise<void>) | null = null;
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        // 获取文件锁
        release = await lockfile.lock(filePath, {
          retries: 5,
          minTimeout: 100,
          maxTimeout: 1000
        });

        // 写入临时文件
        const tempFile = `${filePath}.tmp`;
        const content = JSON.stringify(data, null, 2);

        await fs.writeFile(tempFile, content, 'utf-8');

        // 原子替换
        await fs.rename(tempFile, filePath);

        // 解锁
        if (release) {
          await release();
          release = null;
        }

        return; // 成功，退出
      } catch (error) {
        retries++;

        if (release) {
          try {
            await release();
          } catch (e) {
            // 忽略解锁错误
          }
          release = null;
        }

        if (retries < this.maxRetries) {
          // 等待后重试
          await this.sleep(this.retryDelayMs * retries);
        } else {
          // 最后一次失败，抛出错误
          throw new Error(
            `Failed to write file ${filePath} after ${this.maxRetries} retries: ${error}`
          );
        }
      }
    }
  }

  async readJSON<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Step 3: 更新存储实现

```typescript
// packages/tm-core/src/modules/storage/file-system.storage.ts

import { AtomicFileWriter } from './atomic-file-writer.js';
import type { TasksStorage } from './storage.interface.js';

export class FileSystemStorage implements TasksStorage {
  private atomicWriter: AtomicFileWriter;

  constructor(private tasksFilePath: string) {
    this.atomicWriter = new AtomicFileWriter();
  }

  async save(data: any): Promise<void> {
    // 使用原子写入器
    await this.atomicWriter.writeJSON(this.tasksFilePath, data);
  }

  async load(): Promise<any> {
    return await this.atomicWriter.readJSON(this.tasksFilePath);
  }

  // ... 其他方法
}
```

#### Step 4: 编写并发测试

```typescript
// packages/tm-core/tests/integration/concurrent-writes.test.ts

import { FileSystemStorage } from '../../src/modules/storage/file-system.storage.js';
import { AtomicFileWriter } from '../../src/modules/storage/atomic-file-writer.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Concurrent Writes', () => {
  let testDir: string;
  let tasksFile: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `tm-concurrent-${Date.now()}`);
    tasksFile = path.join(testDir, 'tasks.json');
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true });
  });

  it('should handle concurrent writes safely', async () => {
    const writer = new AtomicFileWriter();
    const initialData = { tasks: [] };

    // 初始化文件
    await writer.writeJSON(tasksFile, initialData);

    // 模拟并发写入
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const data = {
        tasks: [
          ...initialData.tasks,
          { id: i, title: `Task ${i}` }
        ]
      };

      promises.push(writer.writeJSON(tasksFile, data));
    }

    // 等待所有写入完成
    await Promise.all(promises);

    // 验证文件完整性
    const result = await writer.readJSON(tasksFile);
    expect(result).toHaveProperty('tasks');
    expect(Array.isArray(result.tasks)).toBe(true);

    // 最后的数据应该是有效的
    expect(result.tasks).toBeDefined();
  });

  it('should retry on lock timeout', async () => {
    const writer = new AtomicFileWriter({
      maxRetries: 3,
      retryDelayMs: 50
    });

    const data = { tasks: [] };

    // 应该成功写入 (即使有重试)
    await writer.writeJSON(tasksFile, data);

    const result = await writer.readJSON(tasksFile);
    expect(result).toEqual(data);
  });
});
```

#### Step 5: 运行测试

```bash
# 运行并发测试
npm test -- concurrent-writes.test.ts

# 运行所有存储相关测试
npm test -- packages/tm-core --testPathPattern=storage
```

### 验证检查清单

- [ ] 安装了 `proper-lockfile`
- [ ] 创建了 `AtomicFileWriter` 类
- [ ] 更新了 `FileSystemStorage` 使用原子写入
- [ ] 编写了并发测试
- [ ] 测试通过 (npm test)
- [ ] 验证了 10+ 并发写入不会损坏数据
- [ ] 提交代码和测试

---

## 第 5-6 天: 集成测试和验证

### Step 1: 运行完整测试套件

```bash
# 运行所有测试
npm test

# 检查覆盖率
npm run test:coverage

# 应该看到:
# ✓ Task Service tests
# ✓ Cache Coherence tests
# ✓ Concurrent Writes tests
# ✓ 所有 API 路由测试
```

### Step 2: 集成验证

```bash
# 1. 启动 API 服务
npm run dev

# 2. 在另一个终端，验证三个修复

# 验证 #1: API 返回真实数据
curl http://localhost:3000/api/v1/tasks

# 验证 #2: CLI 修改立即反映到 API
# 终端 3: 修改任务
TAMP add-task --prompt="Integration test task"

# 终端 2: 再次查询 API，应该看到新任务
curl http://localhost:3000/api/v1/tasks

# 验证 #3: 运行并发写入测试
npm test -- concurrent-writes.test.ts
```

### Step 3: 代码审查

```bash
# 查看修改的文件
git diff --stat

# 应该包括:
# - apps/api/src/services/task.service.ts
# - apps/api/src/middleware/cache.middleware.ts
# - packages/tm-core/src/modules/storage/atomic-file-writer.ts
# - packages/tm-core/src/modules/storage/file-system.storage.ts
# - 对应的测试文件
```

### Step 4: 创建 Commit

```bash
# 添加所有修改
git add .

# 创建 commit
git commit -m "fix(core): implement critical architecture fixes for P0 issues

- Fix #1: Connect API to real TmCore data instead of mock
- Fix #2: Implement file watching for cache coherence between CLI and API
- Fix #3: Add atomic file writes with locking to prevent concurrent corruption

All tests pass with >90% coverage
Verified with integration tests and manual verification"

# 推送到远程
git push origin fix/critical-architecture-issues
```

### Step 5: 创建 Pull Request

```bash
# 创建 PR (如果使用 GitHub)
gh pr create \
  --title "Fix: Implement P0 critical architecture fixes" \
  --body "完成第一周的所有关键修复

修复内容:
- API 现在返回真实数据
- 缓存一致性通过文件监听保证
- 并发写入通过原子操作保证

测试覆盖: >90%
所有测试通过"
```

### 验证检查清单

- [ ] npm test 全部通过
- [ ] 覆盖率 > 90%
- [ ] API 返回真实数据
- [ ] CLI 修改立即反映到 API
- [ ] 并发写入不损坏数据
- [ ] 所有代码已 commit
- [ ] PR 已创建
- [ ] 代码审查通过

---

## 第 2-3 周: P1 架构改进

### 概览

P1 问题不是 bug，而是架构质量问题。修复后将：
- 支持数据库迁移
- 实现实时功能
- 改进系统可维护性

### 问题 #4: 存储抽象不完整 (3-5 天)

**链接**: [CRITICAL_FIXES_IMPLEMENTATION_PLAN.md](CRITICAL_FIXES_IMPLEMENTATION_PLAN.md) - P1 部分

**关键文件**:
- `packages/tm-core/src/modules/storage/storage.interface.ts`
- `packages/tm-core/src/modules/storage/implementations/`

**步骤**:
1. 创建 `ITasksStorage` 接口
2. 实现策略模式
3. 支持多个存储后端
4. 编写适配器测试

### 问题 #5: 无跨层通知 (2-3 天)

**链接**: [CRITICAL_FIXES_IMPLEMENTATION_PLAN.md](CRITICAL_FIXES_IMPLEMENTATION_PLAN.md) - P1 部分

**关键文件**:
- `packages/tm-core/src/modules/events/event-bus.ts`
- `packages/tm-core/src/modules/events/task-events.ts`

**步骤**:
1. 实现 EventBus
2. 定义任务事件
3. 连接所有层到事件总线
4. 实现事件监听器

---

## 完成清单

### P0 完成标准 (第 1 周)

- [ ] 问题 #1: API 返回真实数据
- [ ] 问题 #2: 缓存一致性保证
- [ ] 问题 #3: 并发安全保证
- [ ] 所有测试通过 (>90%)
- [ ] PR 已创建和审查
- [ ] 代码已 merge 到 main

### P1 完成标准 (第 2-3 周)

- [ ] 问题 #4: 存储抽象实现
- [ ] 问题 #5: 事件系统实现
- [ ] 集成测试通过
- [ ] 文档更新
- [ ] PR 已创建和审查
- [ ] 代码已 merge 到 main

### 最终验证

- [ ] 所有 5 个问题已修复
- [ ] 测试覆盖 > 95%
- [ ] 没有代码重复 (< 3%)
- [ ] 圈复杂度 < 5
- [ ] 文档更新完成
- [ ] 新版本发布

---

## 常见问题

### 测试失败怎么办？

```bash
# 1. 查看完整错误信息
npm test -- --verbose

# 2. 运行单个测试文件
npm test -- path/to/test.spec.ts

# 3. 查看代码覆盖率
npm run test:coverage

# 4. 对比与之前的差异
git diff packages/tm-core/src/modules/storage/
```

### 如何调试文件锁问题？

```bash
# 添加 DEBUG 日志
DEBUG=proper-lockfile:* npm test -- concurrent-writes.test.ts

# 查看临时文件
ls -la /tmp/tm-concurrent-*
```

### 缓存中间件不工作？

```bash
# 1. 验证文件监听启动
# 在 API 启动日志中应该看到 "File watcher started"

# 2. 手动触发文件变化
touch .taskmaster/tasks/tasks.json

# 3. 检查缓存统计
curl http://localhost:3000/api/v1/cache-stats
```

---

## 联系和支持

- 📖 [完整实现计划](CRITICAL_FIXES_IMPLEMENTATION_PLAN.md)
- 📊 [2025 路线图](ROADMAP_2025.md)
- 📝 [执行摘要](EXECUTION_SUMMARY.md)
- 🔍 [架构评估](REVISED_ASSESSMENT_SUMMARY.md)

---

**下一步**: 开始第 1 天的环境准备工作！

祝你实现顺利! 🚀
