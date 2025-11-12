# Task Master Pro - Implementation Guide for Critical Improvements

**Companion to**: ARCHITECTURE_REVIEW.md
**Target Audience**: Engineers implementing Phase 1-2 improvements

---

## TABLE OF CONTENTS

1. [API-to-TmCore Integration](#api-to-tmcore-integration)
2. [Atomic File Writes](#atomic-file-writes)
3. [File System Watches](#file-system-watches)
4. [Storage Abstraction](#storage-abstraction)
5. [Testing Strategy](#testing-strategy)

---

## API-to-TmCore Integration

### Current Problem

**File**: `apps/api/src/services/task.service.ts`

Current implementation returns mock data:
```typescript
export class TaskService {
  constructor(private tmCore: TmCore) {}

  async listTasks(query: TaskListQuery): Promise<TaskListResult> {
    // Currently returns mock data!
    return {
      tasks: [
        { id: '1', title: 'Mock Task', status: 'pending', ... }
      ],
      total: 1,
      page: 1
    };
  }
}
```

### Solution Design

**Step 1: Update TaskService to delegate to TmCore**

```typescript
// apps/api/src/services/task.service.ts

import type { TmCore, Task, TaskStatus } from '@tm/core';
import { sendError } from '../utils/response.js';
import type {
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskListQuery,
  TaskListResult,
  BatchCreatePayload,
  BatchUpdatePayload
} from '../schemas/task.schema.js';

export class TaskService {
  constructor(private tmCore: TmCore) {
    if (!tmCore) {
      throw new Error('TmCore instance is required for TaskService');
    }
  }

  // ============ READ Operations ============

  /**
   * List all tasks with filtering
   */
  async listTasks(query: TaskListQuery): Promise<TaskListResult> {
    try {
      const tasks = await this.tmCore.tasks.list({
        filter: query.filter,
        status: query.status,
        priority: query.priority,
        tags: query.tags ? query.tags.split(',') : undefined,
        sortBy: query.sortBy,
        order: query.order === 'desc' ? 'desc' : 'asc',
        limit: query.limit || 50,
        offset: query.offset || 0
      });

      // Calculate pagination
      const total = await this.getTaskCount();
      const page = Math.floor((query.offset || 0) / (query.limit || 50)) + 1;

      return {
        tasks: tasks,
        total,
        page,
        pageSize: query.limit || 50,
        hasMore: (query.offset || 0) + tasks.length < total
      };
    } catch (error) {
      throw this.handleError('listTasks', error);
    }
  }

  /**
   * Get single task with subtasks
   */
  async getTask(id: string): Promise<Task | null> {
    try {
      return await this.tmCore.tasks.get(id);
    } catch (error) {
      // Task not found is not an error, return null
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw this.handleError('getTask', error);
    }
  }

  // ============ WRITE Operations ============

  /**
   * Create new task
   */
  async createTask(payload: CreateTaskPayload): Promise<Task> {
    try {
      return await this.tmCore.tasks.create({
        title: payload.title,
        description: payload.description,
        status: payload.status || 'pending',
        priority: payload.priority || 'medium',
        details: payload.details || '',
        testStrategy: payload.testStrategy || '',
        dependencies: payload.dependencies || [],
        tags: payload.tags || []
      });
    } catch (error) {
      throw this.handleError('createTask', error);
    }
  }

  /**
   * Update task
   */
  async updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
    try {
      // First get current task to check it exists
      const task = await this.tmCore.tasks.get(id);
      if (!task) {
        throw new Error(`Task ${id} not found`);
      }

      // Apply updates
      await this.tmCore.tasks.update(id, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        details: payload.details,
        testStrategy: payload.testStrategy,
        dependencies: payload.dependencies,
        tags: payload.tags,
        effort: payload.effort,
        actualEffort: payload.actualEffort
      });

      // Return updated task
      return await this.tmCore.tasks.get(id) as Task;
    } catch (error) {
      throw this.handleError('updateTask', error);
    }
  }

  /**
   * Set task status (common operation)
   */
  async setTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    try {
      const task = await this.tmCore.tasks.get(id);
      if (!task) {
        throw new Error(`Task ${id} not found`);
      }

      // Verify status is valid
      const validStatuses = ['pending', 'in-progress', 'done', 'deferred', 'cancelled', 'blocked', 'review'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      await this.tmCore.tasks.setStatus(id, status);
      return await this.tmCore.tasks.get(id) as Task;
    } catch (error) {
      throw this.handleError('setTaskStatus', error);
    }
  }

  /**
   * Delete task
   */
  async deleteTask(id: string): Promise<boolean> {
    try {
      return await this.tmCore.tasks.delete(id);
    } catch (error) {
      throw this.handleError('deleteTask', error);
    }
  }

  /**
   * Batch create tasks
   */
  async batchCreateTasks(payloads: CreateTaskPayload[]): Promise<Task[]> {
    try {
      const results: Task[] = [];

      for (const payload of payloads) {
        try {
          const task = await this.createTask(payload);
          results.push(task);
        } catch (error) {
          // Log but continue with other tasks
          console.error(`Failed to create task: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return results;
    } catch (error) {
      throw this.handleError('batchCreateTasks', error);
    }
  }

  /**
   * Batch update tasks
   */
  async batchUpdateTasks(updates: BatchUpdatePayload[]): Promise<Task[]> {
    try {
      const results: Task[] = [];

      for (const update of updates) {
        try {
          const task = await this.updateTask(update.id, update);
          results.push(task);
        } catch (error) {
          console.error(`Failed to update task ${update.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return results;
    } catch (error) {
      throw this.handleError('batchUpdateTasks', error);
    }
  }

  // ============ Helper Methods ============

  /**
   * Get total task count
   */
  private async getTaskCount(): Promise<number> {
    try {
      const tasks = await this.tmCore.tasks.list({ limit: 10000 });
      return tasks.length;
    } catch {
      return 0;
    }
  }

  /**
   * Centralized error handling
   */
  private handleError(operation: string, error: any): Error {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('not found')) {
      return new Error(`${operation}: Resource not found`);
    }

    if (message.includes('validation')) {
      return new Error(`${operation}: Validation failed - ${message}`);
    }

    if (message.includes('permission')) {
      return new Error(`${operation}: Permission denied`);
    }

    return new Error(`${operation}: ${message}`);
  }
}
```

**Step 2: Update TaskController (minimal changes)**

The controller is already well-designed and delegates to service:
```typescript
// apps/api/src/controllers/task.controller.ts
// No changes needed - it already calls taskService.listTasks(), etc.
```

**Step 3: Update app.ts to guarantee TmCore initialization**

```typescript
// apps/api/src/app.ts - already has proper app creation
// No changes needed - the factory function already accepts tmCore
// But update index.ts to fail if TmCore doesn't initialize (see above)
```

### Testing Strategy

**File**: `apps/api/src/services/task.service.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from './task.service.js';
import type { TmCore, Task } from '@tm/core';

describe('TaskService - Real TmCore Integration', () => {
  let taskService: TaskService;
  let mockTmCore: Partial<TmCore>;

  beforeEach(() => {
    // Create mock TmCore that simulates real behavior
    mockTmCore = {
      tasks: {
        list: vi.fn(async () => [
          {
            id: '1',
            title: 'Test Task',
            status: 'pending',
            priority: 'high',
            description: 'Test description',
            details: '',
            testStrategy: '',
            dependencies: [],
            subtasks: []
          } as Task
        ]),
        get: vi.fn(async (id: string) => {
          if (id === '1') {
            return {
              id: '1',
              title: 'Test Task',
              status: 'pending',
              priority: 'high',
              description: 'Test description',
              details: '',
              testStrategy: '',
              dependencies: [],
              subtasks: []
            } as Task;
          }
          return null;
        }),
        create: vi.fn(async (payload) => ({
          id: '2',
          ...payload,
          subtasks: []
        } as Task)),
        update: vi.fn(async () => {}),
        setStatus: vi.fn(async () => {}),
        delete: vi.fn(async () => true)
      }
    } as any;

    taskService = new TaskService(mockTmCore as TmCore);
  });

  describe('listTasks', () => {
    it('should return tasks from TmCore', async () => {
      const result = await taskService.listTasks({});

      expect(mockTmCore.tasks.list).toHaveBeenCalled();
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Test Task');
    });

    it('should pass filter parameters to TmCore', async () => {
      await taskService.listTasks({
        status: 'done',
        priority: 'high',
        limit: 25
      });

      expect(mockTmCore.tasks.list).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'done',
          priority: 'high',
          limit: 25
        })
      );
    });
  });

  describe('getTask', () => {
    it('should return task from TmCore', async () => {
      const task = await taskService.getTask('1');

      expect(task).not.toBeNull();
      expect(task!.id).toBe('1');
      expect(mockTmCore.tasks.get).toHaveBeenCalledWith('1');
    });

    it('should return null if task not found', async () => {
      const task = await taskService.getTask('999');

      expect(task).toBeNull();
    });
  });

  describe('createTask', () => {
    it('should delegate to TmCore.tasks.create', async () => {
      const payload = {
        title: 'New Task',
        description: 'New task description'
      };

      const result = await taskService.createTask(payload);

      expect(mockTmCore.tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Task',
          description: 'New task description'
        })
      );
      expect(result.id).toBe('2');
    });
  });

  describe('setTaskStatus', () => {
    it('should update task status', async () => {
      const result = await taskService.setTaskStatus('1', 'done');

      expect(mockTmCore.tasks.setStatus).toHaveBeenCalledWith('1', 'done');
      expect(mockTmCore.tasks.get).toHaveBeenCalledWith('1');
    });

    it('should throw on invalid status', async () => {
      await expect(
        taskService.setTaskStatus('1', 'invalid-status' as any)
      ).rejects.toThrow('Invalid status');
    });
  });
});
```

### Verification Checklist

- [ ] TaskService methods call appropriate TmCore methods
- [ ] All error cases are handled (task not found, validation errors, etc.)
- [ ] Batch operations work with partial failures
- [ ] Tests mock TmCore properly
- [ ] Integration tests run against real TmCore instance
- [ ] API returns real task data (no mocks)
- [ ] All existing API tests still pass

---

## Atomic File Writes

### Current Problem

**File**: `packages/tm-core/src/modules/storage/adapters/file-storage/file-operations.ts`

Current write can be interrupted:
```typescript
async writeJson(filePath: string, data: any): Promise<void> {
  // If process dies here, file is corrupted
  await fs.writeJson(filePath, data, { spaces: 2 });
}
```

### Solution

**Complete Implementation**:

```typescript
// packages/tm-core/src/modules/storage/adapters/file-storage/file-operations.ts

import fs from 'fs-extra';
import path from 'node:path';
import type { PathLike } from 'node:fs';

export interface WriteOptions {
  /**
   * Whether to keep backup of original file
   */
  backup?: boolean;

  /**
   * Timeout for write operation (ms)
   */
  timeout?: number;

  /**
   * Whether to validate JSON after write
   */
  validate?: boolean;
}

/**
 * File operations with atomic write support
 */
export class FileOperations {
  private readonly writeTimeout = 5000; // 5 second timeout

  /**
   * Read JSON file
   */
  async readJson<T = any>(filePath: string): Promise<T> {
    try {
      const data = await fs.readJson(filePath);
      return data as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to read JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Write JSON file atomically
   * 1. Write to temp file
   * 2. Validate JSON
   * 3. Backup original
   * 4. Atomic rename temp -> original
   * 5. Clean up backup
   */
  async writeJson(
    filePath: string,
    data: any,
    options: WriteOptions = {}
  ): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.bak`;
    const { backup = true, timeout = this.writeTimeout, validate = true } = options;

    try {
      // Step 1: Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.ensureDir(dir);

      // Step 2: Write to temporary file
      const writePromise = fs.writeJson(tempPath, data, { spaces: 2 });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Write timeout after ${timeout}ms`)), timeout)
      );

      await Promise.race([writePromise, timeoutPromise]);

      // Step 3: Validate JSON (if enabled)
      if (validate) {
        try {
          const written = await fs.readJson(tempPath);
          // Verify it's the same data we wrote
          if (JSON.stringify(written) !== JSON.stringify(data)) {
            throw new Error('Written data does not match input data');
          }
        } catch (error) {
          await fs.remove(tempPath);
          throw new Error(`JSON validation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Step 4: Create backup if file exists and backup enabled
      if (backup && (await fs.pathExists(filePath))) {
        try {
          await fs.copy(filePath, backupPath, { overwrite: true });
        } catch (error) {
          console.warn(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
          // Don't fail if backup fails, but warn
        }
      }

      // Step 5: Atomic rename (OS guarantees this is atomic)
      await fs.rename(tempPath, filePath);

      // Step 6: Clean up backup if rename succeeded
      if (backup && (await fs.pathExists(backupPath))) {
        try {
          await fs.remove(backupPath);
        } catch (error) {
          console.warn(`Failed to remove backup: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      // Cleanup on error
      if (await fs.pathExists(tempPath)) {
        try {
          await fs.remove(tempPath);
        } catch (_) {
          // Ignore cleanup errors
        }
      }

      // Attempt recovery from backup
      if ((await fs.pathExists(backupPath)) && !(await fs.pathExists(filePath))) {
        try {
          await fs.copy(backupPath, filePath, { overwrite: true });
          console.info(`Recovered file from backup after write failure`);
        } catch (recoveryError) {
          console.error(`Failed to recover from backup: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
        }
      }

      throw new Error(
        `Atomic write failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Atomic file update using read-modify-write pattern
   */
  async updateJson<T = any>(
    filePath: string,
    updateFn: (current: T) => T,
    options: WriteOptions = {}
  ): Promise<T> {
    try {
      // Read current data
      const current = await this.readJson<T>(filePath);

      // Apply update function
      const updated = updateFn(current);

      // Write atomically
      await this.writeJson(filePath, updated, options);

      return updated;
    } catch (error) {
      throw new Error(`Atomic update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Other existing methods unchanged...
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  async getStats(filePath: string) {
    return await fs.stat(filePath);
  }

  async cleanup(): Promise<void> {
    // Cleanup any temp files from this process
  }
}
```

### Test Implementation

```typescript
// packages/tm-core/src/modules/storage/adapters/file-storage/file-operations.spec.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileOperations } from './file-operations.js';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

describe('FileOperations - Atomic Writes', () => {
  let fileOps: FileOperations;
  let testDir: string;

  beforeEach(async () => {
    fileOps = new FileOperations();
    testDir = path.join(os.tmpdir(), `test-file-ops-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('writeJson', () => {
    it('should write JSON file atomically', async () => {
      const filePath = path.join(testDir, 'test.json');
      const data = { id: 1, name: 'test' };

      await fileOps.writeJson(filePath, data);

      const written = await fs.readJson(filePath);
      expect(written).toEqual(data);
    });

    it('should create backup before overwriting', async () => {
      const filePath = path.join(testDir, 'test.json');
      const backupPath = `${filePath}.bak`;

      // Write initial data
      await fileOps.writeJson(filePath, { version: 1 });
      expect(await fs.pathExists(filePath)).toBe(true);

      // Overwrite with new data
      await fileOps.writeJson(filePath, { version: 2 }, { backup: true });

      // Backup should exist
      expect(await fs.pathExists(backupPath)).toBe(true);

      // Backup should contain old data
      const backupData = await fs.readJson(backupPath);
      expect(backupData.version).toBe(1);

      // Main file should have new data
      const mainData = await fs.readJson(filePath);
      expect(mainData.version).toBe(2);
    });

    it('should validate written JSON', async () => {
      const filePath = path.join(testDir, 'test.json');
      const data = { id: 1, name: 'test' };

      await fileOps.writeJson(filePath, data, { validate: true });

      // Data should be readable and valid
      const written = await fs.readJson(filePath);
      expect(written).toEqual(data);
    });

    it('should clean up temp file on error', async () => {
      const filePath = path.join(testDir, 'readonly', 'test.json');

      // Make directory read-only to cause write to fail
      const dir = path.dirname(filePath);
      await fs.ensureDir(dir);

      try {
        // This should fail because we're about to make it read-only
        await fileOps.writeJson(filePath, { test: true });
      } catch (error) {
        // Expected
      }

      // Temp file should be cleaned up
      const tempPath = `${filePath}.tmp`;
      expect(await fs.pathExists(tempPath)).toBe(false);
    });

    it('should recover from backup on rename failure', async () => {
      const filePath = path.join(testDir, 'test.json');

      // Write initial data
      await fileOps.writeJson(filePath, { version: 1 });
      const originalData = await fs.readJson(filePath);

      // Create a spy on fs.rename to simulate failure
      const originalRename = fs.rename.bind(fs);
      let callCount = 0;

      vi.spyOn(fs, 'rename').mockImplementation(async (...args) => {
        callCount++;
        throw new Error('Simulated rename failure');
      });

      try {
        // This should fail but recover
        await fileOps.writeJson(filePath, { version: 2 }, { backup: true });
      } catch (error) {
        // Expected
      }

      // File should still contain original data (recovered from backup)
      const recovered = await fs.readJson(filePath);
      expect(recovered.version).toBe(1);
    });
  });

  describe('updateJson', () => {
    it('should atomically update JSON using function', async () => {
      const filePath = path.join(testDir, 'test.json');

      // Write initial data
      await fileOps.writeJson(filePath, { counter: 1 });

      // Update atomically
      const result = await fileOps.updateJson(filePath, (data) => ({
        ...data,
        counter: data.counter + 1
      }));

      expect(result.counter).toBe(2);

      // Verify persistence
      const written = await fs.readJson(filePath);
      expect(written.counter).toBe(2);
    });
  });
});
```

---

## File System Watches

### Current Problem

File changes made via CLI aren't observed by API layer caching.

### Solution

**File**: `packages/tm-core/src/modules/storage/adapters/file-storage/file-storage.ts`

```typescript
import fs from 'fs-extra';
import { EventEmitter } from 'node:events';

export interface StorageChangeEvent {
  type: 'file-created' | 'file-changed' | 'file-deleted';
  path: string;
  timestamp: number;
}

export class FileStorage implements IStorage {
  private fileWatcher?: fs.FSWatcher;
  private changeEmitter: EventEmitter = new EventEmitter();
  private lastNotifiedTime: number = 0;
  private changeDebounceMs = 100; // Debounce rapid changes

  async initialize(): Promise<void> {
    await this.fileOps.ensureDir(this.pathResolver.getTasksDir());
    this.startFileWatch();
  }

  /**
   * Start watching for file changes
   */
  private startFileWatch(): void {
    const filePath = this.pathResolver.getTasksPath();

    try {
      this.fileWatcher = fs.watch(filePath, { persistent: false }, (event) => {
        // Debounce rapid changes (file systems sometimes emit multiple events)
        const now = Date.now();
        if (now - this.lastNotifiedTime < this.changeDebounceMs) {
          return;
        }
        this.lastNotifiedTime = now;

        // Only care about change events (not rename)
        if (event === 'change') {
          this.emitChange({
            type: 'file-changed',
            path: filePath,
            timestamp: now
          });
        }
      });

      console.log(`Started watching for changes: ${filePath}`);
    } catch (error) {
      console.warn(`Failed to start file watch: ${error instanceof Error ? error.message : String(error)}`);
      // File watching is optional, don't fail if it's not available
    }
  }

  /**
   * Subscribe to storage changes
   */
  onChange(callback: (event: StorageChangeEvent) => void): void {
    this.changeEmitter.on('change', callback);
  }

  /**
   * Unsubscribe from storage changes
   */
  offChange(callback: (event: StorageChangeEvent) => void): void {
    this.changeEmitter.off('change', callback);
  }

  /**
   * Emit change event
   */
  private emitChange(event: StorageChangeEvent): void {
    this.changeEmitter.emit('change', event);
  }

  async close(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }
    this.changeEmitter.removeAllListeners();
    await this.fileOps.cleanup();
  }
}
```

**API Integration**:

```typescript
// apps/api/src/app.ts

import { createApp, appConfig } from './app.js';
import { createTmCore } from '@tm/core';
import { cacheStore } from './middleware/cache.middleware.js';

async function startServer(): Promise<void> {
  try {
    const tmCore = await createTmCore({ projectPath: process.cwd() });

    // Setup cache invalidation on file changes
    const storage = tmCore.tasks.getStorage(); // Add method to expose storage
    storage.onChange((event) => {
      if (event.type === 'file-changed') {
        logger.info(`File changed, invalidating cache: ${event.path}`);
        cacheStore.clearPattern('.*:GET:.*/tasks.*');
      }
    });

    const app = createApp(tmCore);
    const server = app.listen(appConfig.port, () => {
      logger.info(`Server started on port ${appConfig.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

startServer();
```

### Testing

```typescript
describe('FileStorage - Change Events', () => {
  it('should emit change event when file is modified', async () => {
    const storage = new FileStorage(projectPath);
    await storage.initialize();

    const changeCallback = vi.fn();
    storage.onChange(changeCallback);

    // Modify file
    const filePath = storage.getTasksPath();
    await fs.writeJson(filePath, { id: '1', title: 'Updated' });

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(changeCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'file-changed'
      })
    );

    storage.offChange(changeCallback);
    await storage.close();
  });
});
```

---

## Storage Abstraction

### Design Pattern

Use **factory pattern** with **dependency injection**:

```typescript
// packages/tm-core/src/modules/storage/services/storage-factory.ts

import type { IStorage } from '../../../common/interfaces/storage.interface.js';
import { FileStorage } from '../adapters/file-storage/index.js';

export interface StorageFactoryConfig {
  type: 'file' | 'memory' | 'database';
  projectPath?: string;
  databaseUrl?: string;
  databaseUser?: string;
  databasePassword?: string;
}

export class StorageFactory {
  static create(config: StorageFactoryConfig): IStorage {
    switch (config.type) {
      case 'file':
        if (!config.projectPath) {
          throw new Error('projectPath is required for file storage');
        }
        return new FileStorage(config.projectPath);

      case 'memory':
        // Simple in-memory storage for testing
        return new MemoryStorage();

      case 'database':
        if (!config.databaseUrl) {
          throw new Error('databaseUrl is required for database storage');
        }
        // To be implemented in Phase 3
        throw new Error('Database storage not yet implemented');

      default:
        throw new Error(`Unknown storage type: ${config.type}`);
    }
  }

  /**
   * Create storage from environment variables
   */
  static fromEnv(projectPath: string): IStorage {
    const storageType = process.env.STORAGE_TYPE || 'file';
    const databaseUrl = process.env.DATABASE_URL;

    return this.create({
      type: storageType as any,
      projectPath,
      databaseUrl
    });
  }
}
```

### Update TmCore Initialization

```typescript
// packages/tm-core/src/tm-core.ts

import { StorageFactory } from './modules/storage/services/storage-factory.js';

export class TmCore {
  private async initialize(options: TmCoreOptions): Promise<void> {
    // Use factory instead of hardcoded FileStorage
    const storage = StorageFactory.fromEnv(options.projectPath);
    await storage.initialize();

    // Initialize domains with injected storage
    this._tasks = new TasksDomain(storage);
    // ... rest of initialization
  }
}
```

---

## Testing Strategy

### Integration Test Example

**File**: `tests/integration/api-core-integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTmCore } from '@tm/core';
import { createApp } from '@tm/api/app.js';
import request from 'supertest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

describe('API-to-TmCore Integration', () => {
  let testDir: string;
  let tmCore: any;
  let app: any;

  beforeEach(async () => {
    // Setup test project directory
    testDir = path.join(os.tmpdir(), `test-integration-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Initialize real TmCore instance
    tmCore = await createTmCore({ projectPath: testDir });

    // Create Express app with real TmCore
    app = createApp(tmCore);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Create Task', () => {
    it('should create task and persist to file', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Integration Test Task',
          description: 'Test creating task via API',
          priority: 'high'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();

      // Verify persisted to file
      const tasksFile = path.join(testDir, '.taskmaster/tasks/tasks.json');
      const fileData = await fs.readJson(tasksFile);
      expect(fileData.tasks).toContainEqual(
        expect.objectContaining({
          title: 'Integration Test Task'
        })
      );
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when file changes externally', async () => {
      // Create task via API
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Cache Test Task',
          description: 'Test cache invalidation',
          status: 'pending'
        });
      const taskId = createRes.body.data.id;

      // Get task (should be cached)
      const getRes1 = await request(app).get(`/api/v1/tasks/${taskId}`);
      expect(getRes1.body.data.status).toBe('pending');

      // Simulate external change (CLI or another process)
      const tasksFile = path.join(testDir, '.taskmaster/tasks/tasks.json');
      const fileData = await fs.readJson(tasksFile);
      const task = fileData.tasks.find((t: any) => t.id === taskId);
      if (task) {
        task.status = 'done';
        await fs.writeJson(tasksFile, fileData, { spaces: 2 });
      }

      // Wait for file watch to trigger cache invalidation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get task again (should show new status)
      const getRes2 = await request(app).get(`/api/v1/tasks/${taskId}`);
      expect(getRes2.body.data.status).toBe('done');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent writes safely', async () => {
      // Create multiple tasks concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/tasks')
          .send({
            title: `Concurrent Task ${i}`,
            description: 'Test concurrent creation'
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(res => {
        expect(res.status).toBe(201);
        expect(res.body.data.id).toBeDefined();
      });

      // Verify all persisted
      const tasksFile = path.join(testDir, '.taskmaster/tasks/tasks.json');
      const fileData = await fs.readJson(tasksFile);
      expect(fileData.tasks).toHaveLength(5);
    });
  });
});
```

---

## Success Criteria Checklist

### API-to-TmCore Integration
- [ ] TaskService delegates all operations to TmCore
- [ ] No mock data returned from API
- [ ] All CRUD operations work end-to-end
- [ ] Errors propagate correctly
- [ ] Batch operations handle partial failures

### Atomic Writes
- [ ] Writes to temporary file first
- [ ] Validates JSON before committing
- [ ] Backs up original file
- [ ] Atomic rename prevents corruption
- [ ] Recovery from backup works
- [ ] Tests pass for all scenarios

### File System Watches
- [ ] Changes detected within 100ms
- [ ] Debouncing prevents duplicate events
- [ ] Cache invalidation is automatic
- [ ] CLI changes visible to API
- [ ] No memory leaks in watchers

### Storage Abstraction
- [ ] Factory pattern implemented
- [ ] Can create FileStorage
- [ ] Can create MemoryStorage (for tests)
- [ ] Environment variable configuration works
- [ ] Storage swapping doesn't break domain logic

### Overall Testing
- [ ] 100+ new integration tests pass
- [ ] 987 existing tests still pass
- [ ] No regressions detected
- [ ] API-TmCore data consistency verified
- [ ] Performance acceptable (< 100ms for reads)

---

**End of Implementation Guide**

*Reference: See ARCHITECTURE_REVIEW.md for overall strategy and Phase planning.*
