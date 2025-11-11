# Task Master AI - 优化和增强路线图

## 📊 项目现状分析

### 已完成的核心架构
- ✅ Monorepo 架构（Turborepo + npm workspaces）
- ✅ 领域驱动设计（DDD）核心模块（@tm/core）
- ✅ 多 AI 提供商支持（10+ providers）
- ✅ MCP 协议集成
- ✅ 存储抽象层（File + API/Supabase）
- ✅ TDD 工作流自动化
- ✅ Git 集成和智能提交

### 技术债务识别

通过代码扫描，发现以下待迁移/待实现的区域：

#### 1. 遗留代码迁移（高优先级）
```
scripts/modules/ → packages/tm-core/src/modules/
```

**待迁移模块：**
- `scripts/modules/commands.js` → `@tm/core/modules/commands`
- `scripts/modules/dependency-manager.js` → `@tm/core/modules/dependencies`
- `scripts/modules/ui.js` → `@tm/core/modules/ui`

**影响：** 这些模块仍在 scripts/ 中，违反了"业务逻辑必须在 @tm/core"的架构原则。

#### 2. 不完整的实现
- `packages/tm-core/src/modules/ui/index.ts` - 仅有占位符
- `packages/tm-core/src/modules/git/services/scope-detector.ts` - 标记为 "TODO: remove this"
- `packages/tm-core/src/modules/storage/adapters/api-storage.ts` - 多处 TODO 标记
- `packages/tm-core/src/modules/config/services/config-loader.service.ts` - 全局配置未实现

#### 3. 临时代码标记
MCP 工具中有 TEMPORARY 标记，表明存在需要清理的临时实现。

---

## 🎯 优化建议分类

### A. 代码质量和架构优化

#### A1. 完成 DDD 迁移（关键）

**问题：** 遗留的 `scripts/modules/` 代码破坏了架构一致性。

**优化方案：**

1. **迁移 commands.js**
   ```typescript
   // 新位置: packages/tm-core/src/modules/commands/
   // 实现 CommandsDomain 类
   export class CommandsDomain {
     async executeCommand(command: string): Promise<CommandResult>
     async listAvailableCommands(): Promise<Command[]>
     async getCommandHelp(command: string): Promise<CommandHelp>
   }
   ```

2. **迁移 dependency-manager.js**
   ```typescript
   // 已有 dependencies 模块，需要完善：
   // packages/tm-core/src/modules/dependencies/
   export class DependenciesDomain {
     async validateDependencies(): Promise<ValidationResult>
     async fixDependencies(): Promise<FixResult>
     async analyzeDependencyGraph(): Promise<DependencyGraph>
   }
   ```

3. **实现 UI 模块**
   ```typescript
   // packages/tm-core/src/modules/ui/
   export class UIDomain {
     // 业务逻辑：UI 状态管理、交互流程
     async renderTaskList(tasks: Task[]): Promise<RenderableData>
     async formatOutput(data: any, format: OutputFormat): Promise<string>
   }
   ```

**收益：**
- 架构一致性
- 更好的可测试性
- CLI 和 MCP 可共享相同业务逻辑

---

#### A2. 完善全局配置系统

**问题：** `config-loader.service.ts` 中全局配置加载器未实现。

**优化方案：**

```typescript
// packages/tm-core/src/modules/config/services/config-loader.service.ts
async loadGlobalConfig(): Promise<PartialConfiguration | null> {
  try {
    const configData = await fs.readFile(this.globalConfigPath, 'utf-8');
    const globalConfig = JSON.parse(configData);

    // 实现配置合并策略：全局 < 项目 < 环境变量
    return this.mergeConfigs(globalConfig, this.localConfig);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw new TaskMasterError(...);
  }
}
```

**收益：**
- 用户级默认配置
- 多项目配置复用
- 减少重复配置

---

#### A3. 移除技术债务标记

**问题：** `scope-detector.ts` 有 "TODO: remove this" 注释。

**调查并执行以下之一：**
1. 如果该功能已被替代，删除此文件
2. 如果仍需要，移除 TODO 并完善实现
3. 如果废弃，创建迁移指南

```typescript
// 如果保留，应该完善文档并移除 TODO
/**
 * ScopeDetector - 从变更文件智能检测 commit scope
 *
 * 用于 TDD 工作流中自动生成符合 Conventional Commits 的提交信息。
 *
 * @example
 * const detector = new ScopeDetector();
 * const scope = detector.detectScope(['packages/tm-core/src/tasks/manager.ts']);
 * // 返回: 'core'
 */
export class ScopeDetector {
  // 实现...
}
```

---

### B. 测试和质量保证

#### B1. 增加测试覆盖率

**当前状态：** 项目有完整的 Jest 配置，但部分模块测试覆盖不足。

**优化方案：**

1. **为核心域添加集成测试**
   ```typescript
   // packages/tm-core/tests/integration/tasks/
   describe('TasksDomain Integration', () => {
     it('should handle complex task operations', async () => {
       const tmCore = await createTmCore({ projectPath: testProjectPath });

       // 创建任务
       await tmCore.tasks.add({ title: 'Test Task' });

       // 展开子任务
       await tmCore.tasks.expand('1', { numSubtasks: 3 });

       // 更新状态
       await tmCore.tasks.setStatus('1.1', 'done');

       // 验证依赖关系自动更新
       const task = await tmCore.tasks.get('1');
       expect(task.task.status).toBe('in-progress');
     });
   });
   ```

2. **E2E 测试场景**
   ```bash
   # tests/e2e/cli-workflow.test.ts
   describe('Complete CLI Workflow', () => {
     it('should execute full task lifecycle', async () => {
       // 初始化项目
       await exec('TAMP init');

       // 解析 PRD
       await exec('TAMP parse-prd test-prd.txt');

       // 执行工作流
       await exec('TAMP next');
       await exec('TAMP set-status --id=1 --status=done');

       // 验证状态
       const result = await exec('TAMP show 1');
       expect(result.stdout).toContain('Status: done');
     });
   });
   ```

**收益：**
- 早期发现回归问题
- 更安全的重构
- 更高的代码质量

---

#### B2. 性能测试

**优化方案：**

```typescript
// tests/performance/large-task-list.perf.ts
describe('Performance Tests', () => {
  it('should load 10,000 tasks in < 1s', async () => {
    const start = Date.now();
    const tasks = await tmCore.tasks.list();
    const duration = Date.now() - start;

    expect(tasks.length).toBe(10000);
    expect(duration).toBeLessThan(1000);
  });

  it('should handle complex dependency graph efficiently', async () => {
    // 创建 1000 个任务，复杂依赖关系
    const start = Date.now();
    await tmCore.tasks.validateDependencies();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });
});
```

---

### C. 性能优化

#### C1. 实现智能缓存

**问题：** 每次操作都可能重新加载任务列表。

**优化方案：**

```typescript
// packages/tm-core/src/modules/tasks/services/task-cache.service.ts
export class TaskCacheService {
  private cache: Map<string, { data: Task[]; timestamp: number }> = new Map();
  private readonly TTL = 5000; // 5 秒缓存

  async getCachedTasks(tag?: string): Promise<Task[] | null> {
    const key = tag || '_default';
    const cached = this.cache.get(key);

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCachedTasks(tasks: Task[], tag?: string): void {
    const key = tag || '_default';
    this.cache.set(key, { data: tasks, timestamp: Date.now() });
  }

  invalidate(tag?: string): void {
    const key = tag || '_default';
    this.cache.delete(key);
  }
}
```

**集成到 TasksDomain：**

```typescript
export class TasksDomain {
  private cache: TaskCacheService;

  async list(options?: ListOptions): Promise<Task[]> {
    // 尝试从缓存获取
    const cached = await this.cache.getCachedTasks(options?.tag);
    if (cached && !options?.forceRefresh) {
      return cached;
    }

    // 从存储加载
    const tasks = await this.storage.loadTasks(options?.tag, options);

    // 缓存结果
    this.cache.setCachedTasks(tasks, options?.tag);

    return tasks;
  }

  async setStatus(taskId: string, status: TaskStatus): Promise<void> {
    await this.storage.updateTaskStatus(taskId, status);

    // 更新后立即失效缓存
    this.cache.invalidate();
  }
}
```

**收益：**
- 显著减少文件系统 I/O
- 改善响应时间
- 更流畅的用户体验

---

#### C2. 延迟加载子任务

**问题：** 加载任务列表时会加载所有子任务，可能不必要。

**优化方案：**

```typescript
// packages/tm-core/src/modules/tasks/tasks-domain.ts
async list(options?: ListOptions): Promise<Task[]> {
  const tasks = await this.storage.loadTasks(options?.tag, {
    ...options,
    includeSubtasks: false // 默认不加载子任务
  });

  return tasks;
}

async getWithSubtasks(taskId: string): Promise<Task> {
  const result = await this.get(taskId);
  if (result.isSubtask) {
    throw new Error('Cannot load subtasks of a subtask');
  }

  // 延迟加载子任务
  const task = result.task;
  if (task.subtasks && task.subtasks.length > 0) {
    task.subtasks = await this.loadSubtasksRecursive(task.id);
  }

  return task;
}
```

**收益：**
- 减少初始加载时间
- 节省内存
- 按需加载

---

### D. 开发体验优化

#### D1. 改进 API 文档

**优化方案：**

1. **为 tm-core 生成 API 文档**
   ```json
   // package.json
   {
     "scripts": {
       "docs:generate": "typedoc --out docs/api packages/tm-core/src",
       "docs:serve": "npx serve docs/api"
     },
     "devDependencies": {
       "typedoc": "^0.25.0"
     }
   }
   ```

2. **添加 JSDoc 注释**
   ```typescript
   /**
    * 获取任务或子任务
    *
    * @param taskId - 任务 ID，支持点号表示法（如 "1.2.3" 表示子任务）
    * @param tag - 可选的标签上下文
    * @returns 任务对象和是否为子任务的标志
    *
    * @example
    * ```typescript
    * // 获取主任务
    * const { task, isSubtask } = await tmCore.tasks.get('1');
    * console.log(task.title); // "实现用户认证"
    *
    * // 获取子任务
    * const { task, isSubtask } = await tmCore.tasks.get('1.2');
    * console.log(isSubtask); // true
    * ```
    *
    * @throws {TaskMasterError} 当任务不存在时
    */
   async get(taskId: string, tag?: string): Promise<...>
   ```

---

#### D2. 改进错误消息

**优化方案：**

```typescript
// packages/tm-core/src/common/errors/task-master-error.ts
export class TaskMasterError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);

    // 添加用户友好的建议
    this.suggestion = this.generateSuggestion(code, context);
  }

  private generateSuggestion(code: ErrorCode, context?: Record<string, unknown>): string {
    switch (code) {
      case ERROR_CODES.NO_BRIEF_SELECTED:
        return '提示：使用 "tm context brief <brief-id>" 选择一个 brief';
      case ERROR_CODES.TASK_NOT_FOUND:
        return `提示：使用 "tm list" 查看所有可用任务`;
      case ERROR_CODES.CONFIG_ERROR:
        return `提示：运行 "tm models --setup" 配置 AI 模型`;
      default:
        return '';
    }
  }

  toString(): string {
    let output = `[${this.code}] ${this.message}`;
    if (this.suggestion) {
      output += `\n💡 ${this.suggestion}`;
    }
    if (this.context) {
      output += `\n📋 Context: ${JSON.stringify(this.context, null, 2)}`;
    }
    return output;
  }
}
```

---

### E. CI/CD 改进

#### E1. 增强 CI 流程

**优化方案：**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build

      - name: Test CLI installation
        run: |
          npm pack
          npm install -g ./taskmaster-pro-*.tgz
          TAMP --version

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run format-check
      - run: npm run turbo:typecheck
```

---

## 🤖 Agents/Skills 应用建议

### 1. 代码审查 Agent

**应用场景：** 自动审查 PR，确保符合架构规则。

**实现方案：**

```typescript
// .github/workflows/code-review-agent.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run AI Code Review
        uses: ./actions/ai-code-review
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          rules: |
            1. 检查是否有业务逻辑在 CLI/MCP 层（应该在 @tm/core）
            2. 验证是否有相应的测试
            3. 检查是否遵循 DDD 原则
            4. 验证是否更新了 CHANGELOG
```

**检查规则示例：**

```typescript
// tools/ai-code-review/rules/business-logic-separation.ts
export async function checkBusinessLogicSeparation(
  files: string[]
): Promise<ReviewComment[]> {
  const violations: ReviewComment[] = [];

  for (const file of files) {
    // 检查 CLI/MCP 文件中是否有业务逻辑
    if (file.startsWith('apps/cli/') || file.startsWith('apps/mcp/')) {
      const content = await readFile(file);

      // 检测业务逻辑模式
      const hasBusinessLogic =
        /class.*Manager|class.*Service|class.*Repository/.test(content) ||
        /complex.*calculation|data.*transformation/.test(content);

      if (hasBusinessLogic) {
        violations.push({
          file,
          line: 0,
          severity: 'error',
          message: '❌ 业务逻辑应该在 @tm/core 中，不应该在 CLI/MCP 层',
          suggestion: '将此逻辑移动到 packages/tm-core/src/modules/ 对应的域中'
        });
      }
    }
  }

  return violations;
}
```

---

### 2. 测试生成 Agent

**应用场景：** 为新代码自动生成测试框架。

**实现方案：**

```typescript
// tools/test-generator/index.ts
import { Anthropic } from '@anthropic-ai/sdk';

export async function generateTests(sourceFile: string): Promise<string> {
  const sourceCode = await readFile(sourceFile);
  const anthropic = new Anthropic();

  const prompt = `
分析以下 TypeScript 代码，生成完整的 Jest 测试文件：

源代码：
\`\`\`typescript
${sourceCode}
\`\`\`

要求：
1. 覆盖所有公开方法
2. 包含边界条件测试
3. 包含错误处理测试
4. 使用同步导入（不使用 async/await，除非测试异步操作）
5. 遵循项目测试风格

生成格式：
\`\`\`typescript
// [测试代码]
\`\`\`
`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  return extractCodeBlock(response.content);
}
```

**CLI 集成：**

```bash
# 为新文件生成测试
npm run generate:tests -- packages/tm-core/src/modules/tasks/manager.ts

# 输出：packages/tm-core/src/modules/tasks/manager.spec.ts
```

---

### 3. 文档生成 Agent

**应用场景：** 自动生成和更新文档。

**实现方案：**

```typescript
// tools/doc-generator/index.ts
export async function generateDomainDocs(domainPath: string): Promise<string> {
  // 分析域接口
  const domainClass = await analyzeDomain(domainPath);

  const prompt = `
为以下域类生成用户友好的文档：

类定义：
${domainClass.code}

要求：
1. 解释域的职责
2. 列出所有公开方法
3. 提供实际使用示例
4. 说明错误处理
5. 包含最佳实践

生成 Markdown 格式文档。
`;

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}
```

**输出示例：**

```markdown
# TasksDomain API 参考

## 概述

`TasksDomain` 负责所有任务管理操作，包括创建、更新、删除和查询任务。

## 方法

### list()

获取任务列表。

\`\`\`typescript
const tasks = await tmCore.tasks.list({ status: 'pending' });
\`\`\`

**参数：**
- `options.status?: TaskStatus` - 按状态过滤
- `options.tag?: string` - 标签上下文

**返回：** `Promise<Task[]>`

...
```

---

### 4. 重构助手 Agent

**应用场景：** 辅助遗留代码迁移。

**实现方案：**

```typescript
// tools/refactor-assistant/index.ts
export async function suggestRefactoring(legacyFile: string): Promise<RefactorPlan> {
  const code = await readFile(legacyFile);

  const prompt = `
分析以下遗留代码，并建议如何将其重构到 DDD 架构：

遗留代码：
\`\`\`javascript
${code}
\`\`\`

项目架构：
- 业务逻辑必须在 packages/tm-core/src/modules/
- 使用域驱动设计（DDD）
- 每个域有明确的单一职责
- 使用 TypeScript 和现代 ES 模块

请提供：
1. 建议的目标域（tasks/auth/workflow/git/config/integration）
2. 新的类结构
3. 迁移步骤
4. 需要更新的文件列表
`;

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseRefactorPlan(response.content);
}
```

**使用示例：**

```bash
# 获取重构建议
npm run refactor:suggest -- scripts/modules/commands.js

# 输出：
#
# 🎯 重构建议：scripts/modules/commands.js
#
# 目标域：commands
# 新位置：packages/tm-core/src/modules/commands/
#
# 建议的类结构：
# - CommandsDomain (主域类)
# - CommandExecutor (命令执行器)
# - CommandRegistry (命令注册表)
#
# 迁移步骤：
# 1. 创建 packages/tm-core/src/modules/commands/commands-domain.ts
# 2. 实现 CommandsDomain 类
# 3. 添加测试 commands-domain.spec.ts
# 4. 在 tm-core.ts 中注册域
# 5. 更新 CLI 调用
# 6. 更新 MCP 工具
# 7. 删除遗留文件
#
# 受影响的文件：
# - apps/cli/src/commands/*.ts (需要更新导入)
# - apps/mcp/src/tools/*.ts (需要更新导入)
```

---

### 5. 性能分析 Agent

**应用场景：** 自动发现性能瓶颈。

**实现方案：**

```typescript
// tools/performance-analyzer/index.ts
export async function analyzePerformance(
  profileData: ProfileData
): Promise<PerformanceReport> {
  const anthropic = new Anthropic();

  const prompt = `
分析以下性能剖析数据，识别瓶颈并提供优化建议：

性能数据：
${JSON.stringify(profileData, null, 2)}

请提供：
1. 主要性能瓶颈
2. 具体优化建议
3. 预期性能提升
4. 实现优先级
`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  });

  return parsePerformanceReport(response.content);
}
```

---

### 6. 安全扫描 Agent

**应用场景：** 检测安全漏洞和最佳实践违规。

**实现方案：**

```typescript
// tools/security-scanner/index.ts
export async function scanSecurity(files: string[]): Promise<SecurityReport> {
  const vulnerabilities: Vulnerability[] = [];

  for (const file of files) {
    const code = await readFile(file);

    // 1. 检测硬编码密钥
    if (/ANTHROPIC_API_KEY.*=.*["']sk-/.test(code)) {
      vulnerabilities.push({
        file,
        severity: 'critical',
        type: 'hardcoded-secret',
        message: '检测到硬编码的 API 密钥'
      });
    }

    // 2. 检测不安全的文件操作
    if (/fs\.readFileSync.*user.*input/i.test(code)) {
      vulnerabilities.push({
        file,
        severity: 'high',
        type: 'path-traversal',
        message: '可能存在路径遍历漏洞'
      });
    }

    // 3. 检测 SQL 注入风险（如果使用数据库）
    if (/\$\{.*\}.*query|query.*\+.*user/i.test(code)) {
      vulnerabilities.push({
        file,
        severity: 'critical',
        type: 'sql-injection',
        message: '可能存在 SQL 注入风险'
      });
    }
  }

  return { vulnerabilities, filesScanned: files.length };
}
```

---

## 📋 实施优先级建议

### 🔴 高优先级（立即开始）

1. **完成 DDD 迁移**
   - 迁移 commands.js
   - 迁移 dependency-manager.js
   - 实现 UI 模块
   - 预计时间：2-3 周
   - 收益：架构一致性，代码质量

2. **增加测试覆盖率**
   - 集成测试
   - E2E 测试
   - 预计时间：1-2 周
   - 收益：代码质量，稳定性

3. **实现智能缓存**
   - 任务列表缓存
   - 配置缓存
   - 预计时间：3-5 天
   - 收益：性能提升 50-70%

### 🟡 中优先级（下个迭代）

4. **完善全局配置**
   - 实现 loadGlobalConfig
   - 配置合并策略
   - 预计时间：2-3 天

5. **改进错误消息**
   - 用户友好的建议
   - 上下文信息
   - 预计时间：2-3 天

6. **集成代码审查 Agent**
   - GitHub Actions 集成
   - 自定义规则
   - 预计时间：1 周

### 🟢 低优先级（长期规划）

7. **API 文档生成**
   - TypeDoc 集成
   - JSDoc 注释
   - 预计时间：1-2 周

8. **性能监控**
   - 性能分析 Agent
   - 自动化性能测试
   - 预计时间：1-2 周

9. **其他 Agents**
   - 测试生成
   - 文档生成
   - 安全扫描
   - 预计时间：按需实施

---

## 🎯 预期收益

### 短期（1-2 个月）
- ✅ 架构一致性（DDD 迁移完成）
- ✅ 测试覆盖率 > 80%
- ✅ 性能提升 50%+（缓存实施）
- ✅ 更好的开发体验（错误消息改进）

### 中期（3-6 个月）
- ✅ 完整的 API 文档
- ✅ 自动化代码审查
- ✅ 持续性能监控
- ✅ 更高的代码质量

### 长期（6-12 个月）
- ✅ 全面的 AI 辅助开发流程
- ✅ 自动化测试生成
- ✅ 智能重构助手
- ✅ 行业领先的 DDD 示例项目

---

## 📚 参考资源

### 架构模式
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Facade Pattern](https://refactoring.guru/design-patterns/facade)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

### 测试最佳实践
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Testing TypeScript](https://www.typescriptlang.org/docs/handbook/testing.html)

### AI 辅助开发
- [GitHub Copilot for Business](https://github.com/features/copilot)
- [Claude Code](https://claude.ai/code)
- [Cursor AI](https://cursor.sh/)

---

**生成时间：** 2025-01-10
**基于版本：** Task Master AI v0.31.2
**下次审查：** 项目 v0.35.0 发布后
