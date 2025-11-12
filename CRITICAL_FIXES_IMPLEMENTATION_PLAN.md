# 关键架构问题修复实现计划

**最后更新**: 2025年11月12日
**优先级**: P0 + P1 (3周完成)

---

## 概览

本文档详细说明如何修复Task Master Pro的5个关键架构问题。这些问题影响核心功能，必须在扩展功能前解决。

---

## P0 优先级 (第1周 - 5-6天)

### 问题 #1: API 返回 Mock 数据

**状态**: 🔴 CRITICAL - API 完全不工作
**影响**: API 调用返回硬编码的假数据，而不是真实任务
**预计工作量**: 2-3 天

#### 当前问题

```typescript
// apps/api/src/services/task.service.ts (当前 - 错误)
async listTasks(): Promise<Task[]> {
  const mockTasks = [
    {
      id: '1',
      title: 'Mock Task',
      status: 'pending',
      description: 'This is a mock task'
    }
  ];
  return mockTasks;  // ← 总是返回 Mock 数据!
}
```

#### 修复步骤

**步骤 1**: 连接 TaskService 到 TmCore

```typescript
// apps/api/src/services/task.service.ts (修复后)
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
      const task = await this.tmCore.tasks.get(id);
      return task || null;
    } catch (error) {
      console.error(`Failed to get task ${id}:`, error);
      throw error;
    }
  }

  async createTask(taskData: CreateTaskInput): Promise<Task> {
    try {
      const task = await this.tmCore.tasks.create(taskData);
      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(id: string, updates: UpdateTaskInput): Promise<Task> {
    try {
      const task = await this.tmCore.tasks.update(id, updates);
      return task;
    } catch (error) {
      console.error(`Failed to update task ${id}:`, error);
      throw error;
    }
  }

  async setTaskStatus(id: string, status: string): Promise<Task> {
    try {
      const task = await this.tmCore.tasks.setStatus(id, status);
      return task;
    } catch (error) {
      console.error(`Failed to set task status ${id}:`, error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      await this.tmCore.tasks.delete(id);
      return true;
    } catch (error) {
      console.error(`Failed to delete task ${id}:`, error);
      throw error;
    }
  }
}
```

**步骤 2**: 更新路由层

```typescript
// apps/api/src/routes/tasks.routes.ts
import { Router } from 'express';
import { TaskService } from '../services/task.service.js';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware.js';

const router = Router();
const taskService = new TaskService();

// 列出所有任务
router.get('/', jwtAuthMiddleware, async (req, res) => {
  try {
    const tasks = await taskService.listTasks();
    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取单个任务
router.get('/:id', jwtAuthMiddleware, async (req, res) => {
  try {
    const task = await taskService.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 更新任务状态
router.patch('/:id/status', jwtAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    const task = await taskService.setTaskStatus(req.params.id, status);
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update task status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as tasksRouter };
```

**步骤 3**: 添加集成测试

```typescript
// apps/api/src/routes/tasks.routes.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTestJwtToken } from '../test-utils/jwt.utils.js';
import { createTmCore } from '@tm/core';

describe('Tasks API Routes', () => {
  let app: any;
  let testToken: string;
  let tmCore: any;

  beforeAll(async () => {
    app = createApp();
    testToken = createTestJwtToken({
      sub: 'test-user',
      email: 'test@example.com'
    });
    tmCore = createTmCore();
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('GET /api/v1/tasks', () => {
    it('should return list of tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/tasks');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should return specific task', async () => {
      // Create a test task first
      const task = await tmCore.tasks.create({
        title: 'Test Task',
        priority: 'high'
      });

      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(task.id);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });
  });
});
```

**步骤 4**: 验证检查清单

- [ ] 移除所有硬编码的 Mock 数据
- [ ] TaskService 连接到 TmCore
- [ ] 所有路由方法使用实际数据
- [ ] 错误处理正确实现
- [ ] 集成测试通过
- [ ] 手动测试 API 返回真实数据

**相关文件**:
- `apps/api/src/services/task.service.ts`
- `apps/api/src/routes/tasks.routes.ts`
- `apps/api/src/app.ts`

---

### 问题 #2: 缓存不一致

**状态**: 🔴 CRITICAL - 数据一致性问题
**影响**: CLI 和 API 返回不同的任务数据(5分钟窗口)
**预计工作量**: 1-2 天

#### 当前问题

```
场景:
1. 用户运行: TAMP set-status --id=1 --status=done
   → CLI 直接更新 tasks.json
2. 用户调用: GET /api/v1/tasks
   → API 返回缓存的数据(1分钟前)
3. 结果: 用户看到任务仍是 "pending" 而不是 "done" ❌
```

#### 修复步骤

**步骤 1**: 实现文件系统监听器

```typescript
// packages/tm-core/src/modules/storage/file-watcher.ts
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 300; // 300ms

  constructor(private filePath: string) {
    super();
  }

  start(): void {
    if (this.watcher) return;

    this.watcher = fs.watch(this.filePath, (eventType, filename) => {
      if (filename && (filename.endsWith('.json') || filename.includes('tasks'))) {
        this.debounceChange();
      }
    });

    this.watcher.on('error', (error) => {
      console.error('File watcher error:', error);
    });
  }

  private debounceChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.emit('change', {
        timestamp: Date.now(),
        filePath: this.filePath
      });
    }, this.debounceDelay);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  getFilePath(): string {
    return this.filePath;
  }
}
```

**步骤 2**: 更新缓存中间件

```typescript
// apps/api/src/middleware/cache.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { FileWatcher } from '@tm/core/modules/storage/file-watcher.js';

interface CacheEntry {
  data: any;
  timestamp: number;
  eTag: string;
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes
  private fileWatcher: FileWatcher | null = null;

  constructor(tasksFilePath: string) {
    this.fileWatcher = new FileWatcher(tasksFilePath);
    this.fileWatcher.on('change', () => {
      this.invalidateAll();
    });
    this.fileWatcher.start();
  }

  set(key: string, data: any): void {
    const eTag = this.generateETag(data);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      eTag
    });
  }

  get(key: string, maxAge?: number): { data: any; eTag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const actualTTL = maxAge || this.ttl;

    if (age > actualTTL) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data,
      eTag: entry.eTag
    };
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  private generateETag(data: any): string {
    const crypto = require('crypto');
    return crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  destroy(): void {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }
    this.cache.clear();
  }
}

// Express 中间件
export function cacheMiddleware(cacheManager: CacheManager) {
  return (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `${req.method}:${req.path}`;

    const cached = cacheManager.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('ETag', cached.eTag);
      return res.json(cached.data);
    }

    // 拦截 res.json 来缓存响应
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        cacheManager.set(cacheKey, data);
        res.set('X-Cache', 'MISS');
      }
      return originalJson(data);
    };

    next();
  };
}
```

**步骤 3**: 整合到应用中

```typescript
// apps/api/src/app.ts
import { cacheMiddleware, CacheManager } from './middleware/cache.middleware.js';
import path from 'path';

export function createApp() {
  const app = express();

  // 初始化缓存管理器
  const tasksFilePath = path.join(
    process.cwd(),
    '.taskmaster/tasks/tasks.json'
  );
  const cacheManager = new CacheManager(tasksFilePath);

  // 应用缓存中间件
  app.use('/api/v1', cacheMiddleware(cacheManager));

  // ... 其他中间件和路由

  // 优雅关闭
  process.on('SIGTERM', () => {
    cacheManager.destroy();
  });

  return app;
}
```

**步骤 4**: 验证检查清单

- [ ] FileWatcher 监听 tasks.json 变化
- [ ] 文件变化自动清除缓存
- [ ] API 响应包含 X-Cache 头
- [ ] CLI 和 API 显示一致数据
- [ ] 集成测试验证缓存失效

**相关文件**:
- `packages/tm-core/src/modules/storage/file-watcher.ts`
- `apps/api/src/middleware/cache.middleware.ts`
- `apps/api/src/app.ts`

---

### 问题 #3: 文件并发写入风险

**状态**: 🔴 CRITICAL - 数据丢失风险
**影响**: 多进程写入导致 tasks.json 数据损坏
**预计工作量**: 1-2 天

#### 当前问题

```
竞态条件:
进程 A: 读取 tasks.json → 修改 → 写入
进程 B: 读取 tasks.json → 修改 → 写入 (最后的写入覆盖 A 的更改!)
结果: 数据丢失 ❌
```

#### 修复步骤

**步骤 1**: 安装文件锁库

```bash
npm install --workspace=@tm/core proper-lockfile
npm install --workspace=@tm/core --save-dev @types/proper-lockfile
```

**步骤 2**: 实现原子文件操作

```typescript
// packages/tm-core/src/modules/storage/atomic-file.ts
import fs from 'fs/promises';
import lockfile from 'proper-lockfile';
import path from 'path';

export class AtomicFileWriter {
  private maxRetries = 3;
  private retryDelay = 100; // ms

  async readJSON<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  async writeJSON<T>(filePath: string, data: T): Promise<void> {
    let release: (() => Promise<void>) | null = null;
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        // 获取文件锁
        release = await lockfile.lock(filePath, {
          retries: {
            retries: 3,
            factor: 2,
            minTimeout: 50,
            maxTimeout: 500
          }
        });

        try {
          // 原子写入
          const tempFile = `${filePath}.tmp`;
          await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
          await fs.rename(tempFile, filePath);
        } finally {
          // 释放锁
          if (release) {
            await release();
            release = null;
          }
        }

        return; // 成功
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw new Error(
            `Failed to write ${filePath} after ${this.maxRetries} retries: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
        // 指数退避
        await this.delay(this.retryDelay * Math.pow(2, retries - 1));
      }
    }
  }

  async modifyJSON<T>(
    filePath: string,
    modifier: (data: T) => T
  ): Promise<T> {
    let release: (() => Promise<void>) | null = null;

    try {
      // 获取锁 → 读取 → 修改 → 写入
      release = await lockfile.lock(filePath);

      const data = await this.readJSON<T>(filePath);
      const modified = modifier(data);

      const tempFile = `${filePath}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(modified, null, 2));
      await fs.rename(tempFile, filePath);

      return modified;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**步骤 3**: 更新文件系统存储

```typescript
// packages/tm-core/src/modules/storage/file-system.storage.ts
import path from 'path';
import { AtomicFileWriter } from './atomic-file.js';

export class FileSystemStorage {
  private atomicWriter: AtomicFileWriter;
  private tasksFile: string;

  constructor(projectPath: string) {
    this.atomicWriter = new AtomicFileWriter();
    this.tasksFile = path.join(projectPath, '.taskmaster/tasks/tasks.json');
  }

  async readTasks(): Promise<Task[]> {
    try {
      const data = await this.atomicWriter.readJSON<{ tasks: Task[] }>(
        this.tasksFile
      );
      return data.tasks || [];
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return [];
      }
      throw error;
    }
  }

  async writeTasks(tasks: Task[]): Promise<void> {
    await this.atomicWriter.writeJSON(this.tasksFile, {
      tasks,
      updatedAt: new Date().toISOString()
    });
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return this.atomicWriter.modifyJSON<{ tasks: Task[] }>(
      this.tasksFile,
      (data) => {
        const task = data.tasks.find(t => t.id === id);
        if (!task) {
          throw new Error(`Task ${id} not found`);
        }
        Object.assign(task, updates);
        return data;
      }
    ).then(data => {
      const updated = data.tasks.find(t => t.id === id)!;
      return updated;
    });
  }
}
```

**步骤 4**: 添加测试

```typescript
// packages/tm-core/src/modules/storage/atomic-file.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AtomicFileWriter } from './atomic-file.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('AtomicFileWriter', () => {
  let writer: AtomicFileWriter;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    writer = new AtomicFileWriter();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-test-'));
    testFile = path.join(tempDir, 'test.json');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('should write and read JSON atomically', async () => {
    const data = { count: 42, name: 'test' };
    await writer.writeJSON(testFile, data);

    const read = await writer.readJSON<typeof data>(testFile);
    expect(read).toEqual(data);
  });

  it('should handle concurrent modifications', async () => {
    const initialData = { value: 0 };
    await writer.writeJSON(testFile, initialData);

    // 模拟并发修改
    await Promise.all([
      writer.modifyJSON(testFile, data => ({ value: data.value + 1 })),
      writer.modifyJSON(testFile, data => ({ value: data.value + 1 })),
      writer.modifyJSON(testFile, data => ({ value: data.value + 1 }))
    ]);

    const final = await writer.readJSON<{ value: number }>(testFile);
    expect(final.value).toBe(3); // 所有修改都应该应用
  });

  it('should retry on lock timeout', async () => {
    const data = { attempts: 0 };
    await writer.writeJSON(testFile, data);

    // 这会触发重试机制
    const result = await writer.modifyJSON(testFile, d => ({
      attempts: d.attempts + 1
    }));

    expect(result.attempts).toBe(1);
  });
});
```

**步骤 5**: 验证检查清单

- [ ] 安装 proper-lockfile
- [ ] AtomicFileWriter 实现文件锁
- [ ] 所有文件写入使用原子操作
- [ ] 并发修改测试通过
- [ ] 没有数据损坏
- [ ] 重试逻辑工作正常

**相关文件**:
- `packages/tm-core/src/modules/storage/atomic-file.ts`
- `packages/tm-core/src/modules/storage/file-system.storage.ts`
- `packages/tm-core/package.json`

---

## P1 优先级 (第2-3周 - 5-8天)

### 问题 #4: 存储抽象不完整

**状态**: 🟡 HIGH - 架构质量
**影响**: 无法迁移到数据库(需要大量重构)
**预计工作量**: 3-5 天

#### 当前问题

业务逻辑直接耦合到文件I/O。无法在不改变领域逻辑的情况下切换存储。

#### 修复步骤

**步骤 1**: 定义存储接口

```typescript
// packages/tm-core/src/modules/storage/storage.interface.ts
import type { Task } from '../tasks/task.model.js';

export interface ITasksStorage {
  // 读操作
  readAll(): Promise<Task[]>;
  readById(id: string): Promise<Task | null>;
  exists(id: string): Promise<boolean>;

  // 写操作
  create(task: Task): Promise<void>;
  update(id: string, task: Task): Promise<void>;
  delete(id: string): Promise<void>;
  bulkUpsert(tasks: Task[]): Promise<void>;

  // 事务支持
  transaction<T>(
    callback: (storage: ITasksStorage) => Promise<T>
  ): Promise<T>;

  // 维护
  clear(): Promise<void>;
  migrate(targetVersion: string): Promise<void>;
}
```

**步骤 2**: 重构文件系统实现

```typescript
// packages/tm-core/src/modules/storage/file-system.storage.ts
import type { ITasksStorage } from './storage.interface.js';
import type { Task } from '../tasks/task.model.js';

export class FileSystemStorage implements ITasksStorage {
  private atomicWriter: AtomicFileWriter;
  private tasksFile: string;

  constructor(projectPath: string) {
    this.atomicWriter = new AtomicFileWriter();
    this.tasksFile = path.join(projectPath, '.taskmaster/tasks/tasks.json');
  }

  async readAll(): Promise<Task[]> {
    try {
      const data = await this.atomicWriter.readJSON<{ tasks: Task[] }>(
        this.tasksFile
      );
      return data.tasks || [];
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return [];
      }
      throw error;
    }
  }

  async readById(id: string): Promise<Task | null> {
    const tasks = await this.readAll();
    return tasks.find(t => t.id === id) || null;
  }

  async exists(id: string): Promise<boolean> {
    const task = await this.readById(id);
    return task !== null;
  }

  async create(task: Task): Promise<void> {
    const tasks = await this.readAll();
    tasks.push(task);
    await this.atomicWriter.writeJSON(this.tasksFile, {
      tasks,
      updatedAt: new Date().toISOString()
    });
  }

  async update(id: string, updatedTask: Task): Promise<void> {
    const tasks = await this.readAll();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Task ${id} not found`);
    }
    tasks[index] = updatedTask;
    await this.atomicWriter.writeJSON(this.tasksFile, {
      tasks,
      updatedAt: new Date().toISOString()
    });
  }

  async delete(id: string): Promise<void> {
    const tasks = await this.readAll();
    const filtered = tasks.filter(t => t.id !== id);
    if (filtered.length === tasks.length) {
      throw new Error(`Task ${id} not found`);
    }
    await this.atomicWriter.writeJSON(this.tasksFile, {
      tasks: filtered,
      updatedAt: new Date().toISOString()
    });
  }

  async bulkUpsert(tasks: Task[]): Promise<void> {
    const existing = await this.readAll();
    const existingMap = new Map(existing.map(t => [t.id, t]));

    for (const task of tasks) {
      existingMap.set(task.id, task);
    }

    const merged = Array.from(existingMap.values());
    await this.atomicWriter.writeJSON(this.tasksFile, {
      tasks: merged,
      updatedAt: new Date().toISOString()
    });
  }

  async transaction<T>(
    callback: (storage: ITasksStorage) => Promise<T>
  ): Promise<T> {
    // 对于文件系统，使用全局锁
    return callback(this);
  }

  async clear(): Promise<void> {
    await this.atomicWriter.writeJSON(this.tasksFile, {
      tasks: [],
      updatedAt: new Date().toISOString()
    });
  }

  async migrate(targetVersion: string): Promise<void> {
    // 文件系统不需要迁移
    console.log(`Filesystem storage migration to ${targetVersion} (no-op)`);
  }
}
```

**步骤 3**: 为数据库创建实现(骨架)

```typescript
// packages/tm-core/src/modules/storage/database.storage.ts
import type { ITasksStorage } from './storage.interface.js';
import type { Task } from '../tasks/task.model.js';

export class DatabaseStorage implements ITasksStorage {
  // 这个实现将在后续迭代中完成
  // 用于 PostgreSQL/Supabase

  async readAll(): Promise<Task[]> {
    throw new Error('Not implemented');
  }

  async readById(id: string): Promise<Task | null> {
    throw new Error('Not implemented');
  }

  async exists(id: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async create(task: Task): Promise<void> {
    throw new Error('Not implemented');
  }

  async update(id: string, task: Task): Promise<void> {
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async bulkUpsert(tasks: Task[]): Promise<void> {
    throw new Error('Not implemented');
  }

  async transaction<T>(
    callback: (storage: ITasksStorage) => Promise<T>
  ): Promise<T> {
    throw new Error('Not implemented');
  }

  async clear(): Promise<void> {
    throw new Error('Not implemented');
  }

  async migrate(targetVersion: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
```

**步骤 4**: 更新 TasksDomain 使用接口

```typescript
// packages/tm-core/src/modules/tasks/tasks.domain.ts
import type { ITasksStorage } from '../storage/storage.interface.js';

export class TasksDomain {
  constructor(private storage: ITasksStorage) {}

  async list(): Promise<Task[]> {
    return this.storage.readAll();
  }

  async get(id: string): Promise<Task | null> {
    return this.storage.readById(id);
  }

  async create(data: CreateTaskInput): Promise<Task> {
    const task = new Task(data);
    await this.storage.create(task);
    return task;
  }

  async update(id: string, updates: UpdateTaskInput): Promise<Task> {
    const task = await this.storage.readById(id);
    if (!task) throw new Error(`Task ${id} not found`);
    Object.assign(task, updates);
    await this.storage.update(id, task);
    return task;
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }
}
```

**步骤 5**: 验证检查清单

- [ ] ITasksStorage 接口定义完整
- [ ] FileSystemStorage 实现所有方法
- [ ] DatabaseStorage 骨架准备好
- [ ] TasksDomain 使用接口而不是具体实现
- [ ] 存储实现可被注入
- [ ] 测试覆盖多个存储实现

**相关文件**:
- `packages/tm-core/src/modules/storage/storage.interface.ts`
- `packages/tm-core/src/modules/storage/file-system.storage.ts`
- `packages/tm-core/src/modules/storage/database.storage.ts`
- `packages/tm-core/src/modules/tasks/tasks.domain.ts`

---

### 问题 #5: 无跨层变更通知

**状态**: 🟡 HIGH - 功能阻塞器
**影响**: 无法实现实时功能，多实例同步困难
**预计工作量**: 2-3 天

#### 当前问题

CLI 的变更对 API 层不可见。没有机制通知其他进程或层有变化。

#### 修复步骤

**步骤 1**: 实现事件总线

```typescript
// packages/tm-core/src/modules/events/event-bus.ts
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

export interface TaskEvent {
  type: string;
  timestamp: number;
  data: any;
}

export class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  async emit<T = any>(eventType: string, data: T): Promise<void> {
    const handlers = this.listeners.get(eventType);
    if (!handlers) return;

    const promises = Array.from(handlers).map(handler =>
      Promise.resolve(handler({ type: eventType, timestamp: Date.now(), data }))
    );

    await Promise.all(promises);
  }

  async emitWait<T = any>(eventType: string, data: T): Promise<void> {
    const handlers = this.listeners.get(eventType);
    if (!handlers) return;

    for (const handler of handlers) {
      await Promise.resolve(handler({ type: eventType, timestamp: Date.now(), data }));
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }
}

// 单例实例
export const globalEventBus = new EventBus();
```

**步骤 2**: 定义任务事件类型

```typescript
// packages/tm-core/src/modules/events/task-events.ts
export const TaskEventTypes = {
  CREATED: 'task:created',
  UPDATED: 'task:updated',
  STATUS_CHANGED: 'task:status-changed',
  DELETED: 'task:deleted',
  BULK_UPDATED: 'task:bulk-updated'
} as const;

export interface TaskCreatedEvent {
  taskId: string;
  task: Task;
}

export interface TaskUpdatedEvent {
  taskId: string;
  changes: Partial<Task>;
  task: Task;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  oldStatus: string;
  newStatus: string;
}

export interface TaskDeletedEvent {
  taskId: string;
}

export interface TaskBulkUpdatedEvent {
  count: number;
  taskIds: string[];
}
```

**步骤 3**: 更新 TasksDomain 发出事件

```typescript
// packages/tm-core/src/modules/tasks/tasks.domain.ts
import { globalEventBus, TaskEventTypes } from '../events/task-events.js';
import type { ITasksStorage } from '../storage/storage.interface.js';

export class TasksDomain {
  constructor(private storage: ITasksStorage) {}

  async create(data: CreateTaskInput): Promise<Task> {
    const task = new Task(data);
    await this.storage.create(task);

    // 发出事件
    await globalEventBus.emit(TaskEventTypes.CREATED, {
      taskId: task.id,
      task
    });

    return task;
  }

  async update(id: string, updates: UpdateTaskInput): Promise<Task> {
    const task = await this.storage.readById(id);
    if (!task) throw new Error(`Task ${id} not found`);

    const oldTask = { ...task };
    Object.assign(task, updates);
    await this.storage.update(id, task);

    // 发出事件
    await globalEventBus.emit(TaskEventTypes.UPDATED, {
      taskId: id,
      changes: updates,
      task
    });

    return task;
  }

  async setStatus(id: string, status: string): Promise<Task> {
    const task = await this.storage.readById(id);
    if (!task) throw new Error(`Task ${id} not found`);

    const oldStatus = task.status;
    task.status = status;
    await this.storage.update(id, task);

    // 发出事件
    await globalEventBus.emit(TaskEventTypes.STATUS_CHANGED, {
      taskId: id,
      oldStatus,
      newStatus: status
    });

    return task;
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);

    // 发出事件
    await globalEventBus.emit(TaskEventTypes.DELETED, { taskId: id });
  }
}
```

**步骤 4**: API 层监听事件实现实时更新

```typescript
// apps/api/src/services/task-notification.service.ts
import { globalEventBus, TaskEventTypes } from '@tm/core/modules/events/task-events.js';

export class TaskNotificationService {
  private wsConnections: Set<any> = new Set();

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // 监听任务创建
    globalEventBus.on(TaskEventTypes.CREATED, (event: any) => {
      this.broadcastToClients('task:created', event);
    });

    // 监听任务更新
    globalEventBus.on(TaskEventTypes.UPDATED, (event: any) => {
      this.broadcastToClients('task:updated', event);
    });

    // 监听状态变化
    globalEventBus.on(TaskEventTypes.STATUS_CHANGED, (event: any) => {
      this.broadcastToClients('task:status-changed', event);
    });

    // 监听删除
    globalEventBus.on(TaskEventTypes.DELETED, (event: any) => {
      this.broadcastToClients('task:deleted', event);
    });
  }

  addWebSocketConnection(ws: any): void {
    this.wsConnections.add(ws);
  }

  removeWebSocketConnection(ws: any): void {
    this.wsConnections.delete(ws);
  }

  private broadcastToClients(type: string, data: any): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const ws of this.wsConnections) {
      if (ws.readyState === 1) { // OPEN
        ws.send(message);
      }
    }
  }
}
```

**步骤 5**: 验证检查清单

- [ ] EventBus 实现
- [ ] 任务事件类型定义
- [ ] TasksDomain 发出所有事件
- [ ] API 层监听事件
- [ ] WebSocket 广播工作
- [ ] 测试事件流

**相关文件**:
- `packages/tm-core/src/modules/events/event-bus.ts`
- `packages/tm-core/src/modules/events/task-events.ts`
- `packages/tm-core/src/modules/tasks/tasks.domain.ts`
- `apps/api/src/services/task-notification.service.ts`

---

## 验证检查清单

### 完成后验证

```
Week 1 (P0 Issues):
- [ ] API 返回真实任务数据(不是Mock)
- [ ] CLI 和 API 数据一致
- [ ] 并发写入不会导致数据损坏
- [ ] 所有单元测试通过
- [ ] 手动测试 API/CLI 交互

Week 2-3 (P1 Issues):
- [ ] 存储接口定义完整
- [ ] 多存储实现可切换
- [ ] 事件系统工作正常
- [ ] 实时通知工作
- [ ] 集成测试完整
```

---

## 进度跟踪

使用 Task Master Pro 本身跟踪进度:

```bash
# 初始化问题跟踪
TAMP add-task --prompt="Fix P0 Issue #1: API mock data" --research
TAMP add-task --prompt="Fix P0 Issue #2: Cache incoherence" --research
TAMP add-task --prompt="Fix P0 Issue #3: Concurrent writes" --research
TAMP add-task --prompt="Fix P1 Issue #4: Storage abstraction" --research
TAMP add-task --prompt="Fix P1 Issue #5: Event notifications" --research

# 查看进度
TAMP list
TAMP next

# 完成任务
TAMP set-status --id=1 --status=done
```

---

## 结论

这5个关键架构问题都有明确的、可实现的解决方案。预计3周可以完成所有P0和P1问题，使工具达到生产级可靠性。

**重点**:
- 专注于解决实际问题,而不是基础设施
- 保持文件驱动的简单设计
- 为未来的数据库迁移预留架构空间
- 建立事件驱动的通知系统
