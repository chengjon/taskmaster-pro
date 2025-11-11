# Task Master AI 项目架构深度分析

## 项目概述

Task Master AI 是一个**面向 AI 驱动开发的任务管理系统**，采用现代化的 **Monorepo + 领域驱动设计（DDD）** 架构。它本身不是传统意义上的"前后端"应用，而是一个**CLI 工具 + MCP 服务器**的组合，为 AI 编辑器（如 Cursor、Claude Code、Windsurf）提供任务管理能力。

## 架构层次概览

```
┌─────────────────────────────────────────────────────────────┐
│                       表现层 (Presentation)                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │   CLI 应用       │  │   MCP 服务器      │  │  VS Code    │ │
│  │  (@tm/cli)      │  │   (@tm/mcp)      │  │  Extension  │ │
│  │  Commander.js   │  │   FastMCP        │  │  (未来)      │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ 调用
┌─────────────────────────────────────────────────────────────┐
│                    核心业务层 (@tm/core)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      TmCore 门面                       │  │
│  │        (统一入口，暴露所有领域能力)                      │  │
│  └───────────────────────────────────────────────────────┘  │
│         ↓           ↓          ↓          ↓          ↓       │
│  ┌──────────┐ ┌─────────┐ ┌────────┐ ┌───────┐ ┌─────────┐ │
│  │  Tasks   │ │  Auth   │ │ Work-  │ │  Git  │ │ Config  │ │
│  │  Domain  │ │ Domain  │ │ flow   │ │Domain │ │ Domain  │ │
│  │          │ │         │ │ Domain │ │       │ │         │ │
│  └──────────┘ └─────────┘ └────────┘ └───────┘ └─────────┘ │
│                     领域驱动设计 (DDD)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓ 使用
┌─────────────────────────────────────────────────────────────┐
│                        基础设施层                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  存储层      │  │   AI 层      │  │   集成层          │   │
│  │ FileStorage │  │ AI Providers │  │  Git / Export    │   │
│  │ APIStorage  │  │ (多种模型)    │  │  Supabase        │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 核心框架与技术栈

### 1. 构建与开发工具链

#### Monorepo 管理
- **Turborepo**: 任务编排和缓存，并行构建
- **npm workspaces**: 包管理和依赖链接
- **tsdown (esbuild)**: 快速 TypeScript 构建工具
  - 生产构建时间 < 1秒
  - 支持 ESM + CommonJS 双格式输出
  - 工作区包打包，npm 依赖外部化

```typescript
// tsdown.config.ts 配置示例
export default defineConfig({
  entry: {
    'task-master': 'scripts/dev.js',      // CLI 入口
    'mcp-server': 'mcp-server/server.js'  // MCP 入口
  },
  outDir: 'dist',
  noExternal: [/^@tm\//],  // 打包工作区包
  env: getBuildTimeEnvs()  // 注入环境变量
})
```

#### 测试框架
- **Jest + ts-jest**: 单元测试和集成测试
- **ESM 模式**: `node --experimental-vm-modules`
- **测试覆盖率**: 80% 阈值要求

### 2. CLI 层实现

#### 框架：Commander.js
```typescript
// scripts/dev.js - CLI 入口
import { runCLI } from './modules/commands.js';
runCLI(process.argv);
```

**CLI 命令结构**（apps/cli/src/commands/）:
```
commands/
├── list.command.ts          # 列出任务
├── show.command.ts          # 显示任务详情
├── next.command.ts          # 获取下一个任务
├── set-status.command.ts    # 更新任务状态
├── auth.command.ts          # 身份认证
├── start.command.ts         # 开始任务
├── export.command.ts        # 导出任务
└── autopilot/               # TDD 自动驾驶模式
    ├── start.command.ts
    ├── resume.command.ts
    ├── complete.command.ts
    └── commit.command.ts
```

**CLI 命令实现模式**（薄包装器）:
```typescript
// 示例：show.command.ts
export class ShowCommand {
  async execute(taskId: string, options: any) {
    // 1. 创建 tm-core 实例
    const tmCore = await createTmCore({
      projectPath: process.cwd()
    });

    // 2. 调用核心业务逻辑
    const result = await tmCore.tasks.get(taskId, options.tag);

    // 3. 格式化输出（仅表现层关注）
    if (result.isSubtask) {
      ui.displaySubtask(result.task);
    } else {
      ui.displayTask(result.task);
    }
  }
}
```

### 3. MCP 服务器层实现

#### 框架：FastMCP
FastMCP 是一个实现 Model Context Protocol 的框架，使 AI 编辑器能够与 Task Master 交互。

```typescript
// mcp-server/src/index.js
class TaskMasterMCPServer {
  constructor() {
    this.server = new FastMCP({
      name: 'Task Master MCP Server',
      version: packageJson.version
    });
  }

  async init() {
    // 注册所有工具（Tool）
    registerTaskMasterTools(this.server, normalizedToolMode);
  }

  async start() {
    // 启动 stdio 传输
    await this.server.start({
      transportType: 'stdio',
      timeout: 120000  // 2分钟超时
    });
  }
}
```

**MCP 工具实现模式**（apps/mcp/src/tools/）:
```typescript
// 示例：get-tasks.tool.ts
export function registerGetTasksTool(server: FastMCP) {
  server.addTool({
    name: 'get_tasks',
    description: 'Get all tasks from Task Master...',
    parameters: GetTasksSchema,  // Zod schema

    execute: async (args, context) => {
      // 1. 创建 tm-core（带 MCP 日志）
      const tmCore = await createTmCore({
        projectPath: args.projectRoot,
        loggerConfig: {
          mcpMode: true,
          logCallback: context.log  // MCP 日志回调
        }
      });

      // 2. 调用核心业务逻辑
      const result = await tmCore.tasks.list({
        tag: args.tag,
        filter: buildFilter(args.status),
        includeSubtasks: args.withSubtasks
      });

      // 3. 返回 MCP 格式化响应
      return handleApiResult(result, context);
    }
  });
}
```

**支持的工具类型**:
- **Core** (7个): get_tasks, next_task, get_task, set_task_status, update_subtask, parse_prd, expand_task
- **Standard** (15个): 核心工具 + 项目初始化、复杂度分析等
- **All** (36个): 完整功能集，包括依赖管理、标签系统、研究功能等

### 4. 核心业务层 (@tm/core) - 重点

#### 架构模式：领域驱动设计（DDD）

```typescript
// packages/tm-core/src/tm-core.ts
export class TmCore {
  // 领域门面（Domain Facades）
  readonly tasks: TasksDomain;
  readonly auth: AuthDomain;
  readonly workflow: WorkflowDomain;
  readonly git: GitDomain;
  readonly config: ConfigDomain;
  readonly integration: IntegrationDomain;

  static async create(options: TmCoreOptions): Promise<TmCore> {
    const instance = new TmCore(options);
    await instance.initialize();
    return instance;
  }

  private async initialize(): Promise<void> {
    // 1. 初始化配置管理器
    this._configManager = await ConfigManager.create(this._projectPath);

    // 2. 初始化所有领域
    this._tasks = new TasksDomain(this._configManager);
    this._auth = new AuthDomain();
    // ... 其他领域

    // 3. 异步初始化
    await this._tasks.initialize();
  }
}
```

#### Tasks Domain 内部架构（典型领域实现）

```
packages/tm-core/src/modules/tasks/
├── tasks-domain.ts              # 领域门面（Domain Facade）
├── entities/                    # 领域实体
│   ├── task.entity.ts
│   └── subtask.entity.ts
├── services/                    # 领域服务
│   ├── task-service.ts          # 核心任务服务
│   ├── task-execution-service.ts # 任务执行服务
│   ├── task-loader.service.ts   # 任务加载服务
│   └── preflight-checker.service.ts # 预检查服务
├── parser/                      # 解析器（领域特定逻辑）
│   └── task-id-parser.ts
└── repositories/                # 仓储（数据访问抽象）
    └── task-repository.interface.ts
```

**TasksDomain 公共 API**:
```typescript
export class TasksDomain {
  // === 任务检索 ===
  async list(options?: GetTaskListOptions): Promise<TaskListResult>

  async get(taskId: string, tag?: string): Promise<
    | { task: Task; isSubtask: false }
    | { task: Subtask; isSubtask: true }
    | { task: null; isSubtask: boolean }
  >

  async getByStatus(status: TaskStatus[], tag?: string): Promise<Task[]>
  async getNext(tag?: string): Promise<Task | null>

  // === 任务执行 ===
  async start(options: StartTaskOptions): Promise<StartTaskResult>
  async setStatus(taskId: string, status: TaskStatus, tag?: string): Promise<void>

  // === 任务操作 ===
  async addTask(task: Partial<Task>): Promise<Task>
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task>
  async removeTask(taskId: string): Promise<void>

  // === 子任务操作 ===
  async addSubtask(parentId: string, subtask: Partial<Subtask>): Promise<void>
  async updateSubtask(taskId: string, subtaskId: string, updates: any): Promise<void>

  // === 依赖管理 ===
  async addDependency(taskId: string, dependsOn: string): Promise<void>
  async removeDependency(taskId: string, dependsOn: string): Promise<void>
  async validateDependencies(): Promise<ValidationResult>

  // === 预检查 ===
  async preflight(taskId: string): Promise<PreflightResult>
}
```

### 5. 存储层实现

#### 接口抽象
```typescript
// packages/tm-core/src/common/interfaces/storage.interface.ts
export interface IStorage {
  // 生命周期
  initialize(): Promise<void>;
  close(): Promise<void>;

  // CRUD 操作
  loadTasks(options?: LoadTasksOptions): Promise<Task[]>;
  saveTasks(tasks: Task[], tag?: string): Promise<void>;
  getTask(taskId: string, tag?: string): Promise<Task | null>;

  // 状态管理
  updateStatus(taskId: string, status: TaskStatus, tag?: string): Promise<UpdateStatusResult>;

  // 标签系统
  getTags(): Promise<string[]>;
  getCurrentTag(): Promise<string>;

  // 统计信息
  getStats(): Promise<StorageStats>;
  getStorageType(): 'file' | 'api';
}
```

#### 实现类型

**1. FileStorage（文件存储）**
```typescript
// packages/tm-core/src/modules/storage/adapters/file-storage/file-storage.ts
export class FileStorage implements IStorage {
  private formatHandler: FormatHandler;      // JSON 格式处理
  private fileOps: FileOperations;           // 文件操作
  private pathResolver: PathResolver;        // 路径解析
  private complexityManager: ComplexityReportManager;

  constructor(projectPath: string) {
    this.formatHandler = new FormatHandler();
    this.fileOps = new FileOperations();
    this.pathResolver = new PathResolver(projectPath);
  }

  async loadTasks(options?: LoadTasksOptions): Promise<Task[]> {
    const filePath = this.pathResolver.getTasksPath();
    const data = await this.fileOps.readJson(filePath);
    const tag = options?.tag || await this.getCurrentTag();
    return this.formatHandler.extractTasks(data, tag);
  }
}
```

**文件结构**:
```
.taskmaster/
├── tasks/
│   ├── tasks.json           # 主任务数据文件（标签化）
│   ├── task-1.md           # 自动生成的任务文件
│   └── task-2.md
├── config.json              # AI 模型配置
├── docs/
│   └── prd.txt             # 产品需求文档
└── reports/
    └── task-complexity-report.json
```

**tasks.json 结构**:
```json
{
  "tags": {
    "master": {
      "metadata": { "description": "主任务列表" },
      "tasks": [
        {
          "id": "1",
          "title": "实现用户认证",
          "status": "pending",
          "priority": "high",
          "dependencies": [],
          "subtasks": [
            {
              "id": "1",
              "title": "设置 JWT",
              "status": "done"
            }
          ]
        }
      ]
    }
  },
  "currentTag": "master"
}
```

**2. APIStorage（API 存储 - Supabase）**
```typescript
// packages/tm-core/src/modules/storage/adapters/api-storage.ts
export class APIStorage implements IStorage {
  private supabase: SupabaseClient;
  private briefName: string;

  constructor(config: APIStorageConfig) {
    this.supabase = createClient(config.apiUrl, config.apiKey);
    this.briefName = config.briefName;
  }

  async loadTasks(): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('brief_name', this.briefName)
      .order('id');
    return data || [];
  }
}
```

### 6. AI 层实现

#### AI SDK 生态系统
Task Master 使用 **Vercel AI SDK** 作为统一的 AI 提供者抽象层。

```typescript
// package.json 依赖
"ai": "^5.0.51",                        // Vercel AI SDK 核心
"@ai-sdk/anthropic": "^2.0.18",         // Claude
"@ai-sdk/openai": "^2.0.34",            // GPT
"@ai-sdk/google": "^2.0.16",            // Gemini
"@ai-sdk/perplexity": "^2.0.10",        // Perplexity（研究）
"@ai-sdk/xai": "^2.0.22",               // Grok
"@ai-sdk/mistral": "^2.0.16",           // Mistral
"@ai-sdk/groq": "^2.0.21",              // Groq
"@openrouter/ai-sdk-provider": "^1.2.0", // OpenRouter
"ai-sdk-provider-claude-code": "^1.1.4"  // Claude Code（无需API密钥）
```

#### BaseProvider 抽象类（模板方法模式）
```typescript
// packages/tm-core/src/modules/ai/providers/base-provider.ts
export abstract class BaseProvider implements IAIProvider {
  protected readonly apiKey: string;
  protected model: string;

  // 模板方法
  async generateCompletion(prompt: string, options?: AIOptions): Promise<AIResponse> {
    // 1. 验证输入
    this.validateInput(prompt, options);

    // 2. 预处理请求
    const prepared = await this.preprocessRequest(prompt, options);

    // 3. 执行带重试的完成（抽象方法）
    const result = await this.executeWithRetry(
      () => this.doGenerateCompletion(prepared.prompt, prepared.options)
    );

    // 4. 后处理响应
    return this.postprocessResponse(result);
  }

  // 子类必须实现
  protected abstract doGenerateCompletion(
    prompt: string,
    options: AIOptions
  ): Promise<CompletionResult>;

  // 指数退避重试
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (!this.isRetryableError(error) || attempt === MAX_RETRIES - 1) {
          throw error;
        }
        await this.sleep(this.calculateBackoff(attempt));
      }
    }
  }
}
```

#### AI 模型配置系统
```typescript
// .taskmaster/config.json
{
  "models": {
    "main": "claude-3-5-sonnet-20241022",       // 主模型（任务生成）
    "research": "perplexity-llama-3.1-sonar-large-128k-online",  // 研究模型
    "fallback": "gpt-4o-mini"                   // 备用模型
  },
  "projectName": "Task Master AI",
  "lastUpdated": "2025-01-10T..."
}
```

**模型角色**:
- **Main Model**: 任务生成、任务扩展、更新等核心功能
- **Research Model**: 使用 Perplexity 进行联网研究，获取最新信息
- **Fallback Model**: 当主模型失败时自动切换

### 7. Git 集成层

```typescript
// packages/tm-core/src/modules/git/git-domain.ts
export class GitDomain {
  private gitAdapter: GitAdapter;
  private messageGenerator: CommitMessageGenerator;

  async commit(message: string, files?: string[]): Promise<void> {
    await this.gitAdapter.stageFiles(files);
    await this.gitAdapter.commit(message);
  }

  async createBranch(branchName: string): Promise<void> {
    await this.gitAdapter.createBranch(branchName);
  }

  async generateCommitMessage(options: CommitMessageOptions): Promise<string> {
    return this.messageGenerator.generate(options);
  }
}

// packages/tm-core/src/modules/git/adapters/git-adapter.ts
export class GitAdapter {
  async stageFiles(files?: string[]): Promise<void> {
    const args = files ? ['add', ...files] : ['add', '.'];
    await this.executeGit(args);
  }

  private async executeGit(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(`git ${args.join(' ')}`, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
}
```

### 8. Workflow 工作流层（TDD 自动驾驶）

```typescript
// packages/tm-core/src/modules/workflow/workflow-domain.ts
export class WorkflowDomain {
  private orchestrator: WorkflowOrchestrator;
  private stateManager: WorkflowStateManager;

  async start(options: StartWorkflowOptions): Promise<WorkflowState> {
    // 1. 创建 git 分支
    await this.git.createBranch(`task/${options.taskId}`);

    // 2. 初始化工作流状态机
    const state = await this.stateManager.initialize(options);

    // 3. 开始 TDD 循环
    return this.orchestrator.start(state);
  }

  async next(): Promise<NextAction> {
    const state = await this.stateManager.loadState();
    return this.orchestrator.getNextAction(state);
  }

  async completePhase(testResults: TestResult): Promise<WorkflowState> {
    // RED -> GREEN -> REFACTOR -> COMMIT 状态机转换
    return this.orchestrator.completePhase(testResults);
  }
}
```

**TDD 工作流状态机**:
```
START
  ↓
RED (写失败测试)
  ↓
GREEN (实现功能使测试通过)
  ↓
REFACTOR (重构代码)
  ↓
COMMIT (提交代码)
  ↓
检查是否有更多子任务
  ├─ 是 → 返回 RED
  └─ 否 → COMPLETE
```

## 数据流图

### 1. CLI 命令执行流程
```
用户输入: TAMP show 1.2 --tag=feature
         ↓
┌────────────────────────────────────────┐
│  Commander.js 解析参数                  │
│  taskId = "1.2"                        │
│  options = { tag: "feature" }         │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  ShowCommand.execute()                 │
│  创建 TmCore 实例                       │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  tmCore.tasks.get("1.2", "feature")   │
│  TasksDomain 处理                       │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  TaskService.getTask("1", "feature")  │
│  解析 ID: parentId=1, subtaskId=2     │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  TaskRepository.findById(1)            │
│  通过 Storage 接口加载                  │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  FileStorage.loadTasks()               │
│  读取 .taskmaster/tasks/tasks.json     │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  FormatHandler.extractTasks()          │
│  提取 "feature" 标签下的任务            │
└────────────────────────────────────────┘
         ↓
         返回 Task 对象
         ↓
┌────────────────────────────────────────┐
│  TasksDomain 返回结果                   │
│  { task: Subtask, isSubtask: true }   │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  ShowCommand 格式化输出                 │
│  ui.displaySubtask(subtask)            │
└────────────────────────────────────────┘
         ↓
    控制台输出格式化的任务信息
```

### 2. MCP 工具调用流程
```
AI 编辑器（Cursor）: 调用 get_tasks 工具
         ↓
┌────────────────────────────────────────┐
│  FastMCP Server                        │
│  接收 MCP 协议请求（stdio）             │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  get_tasks.tool.ts                     │
│  Zod schema 验证参数                    │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  创建 TmCore（带 MCP 日志回调）         │
│  loggerConfig: { mcpMode: true }       │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  tmCore.tasks.list({ tag, filter })   │
│  所有日志通过 context.log 发送到编辑器  │
└────────────────────────────────────────┘
         ↓
         （与 CLI 相同的内部流程）
         ↓
┌────────────────────────────────────────┐
│  handleApiResult()                     │
│  格式化为 MCP 响应格式                  │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  FastMCP 返回 JSON 响应                │
│  通过 stdio 发送给编辑器                │
└────────────────────────────────────────┘
         ↓
    AI 编辑器显示任务列表
```

### 3. AI 任务生成流程（parse-prd）
```
用户: TAMP parse-prd prd.txt
         ↓
┌────────────────────────────────────────┐
│  读取 PRD 文件内容                      │
│  FileOperations.readFile()             │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  ConfigManager 加载 AI 模型配置         │
│  mainModel = "claude-3-5-sonnet"       │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  构建 AI Prompt                        │
│  - PRD 内容                            │
│  - 任务数量要求                         │
│  - 任务格式规范                         │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  AIProviderRegistry.getProvider()      │
│  根据 model ID 选择提供者               │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  AnthropicProvider.generateCompletion()│
│  调用 Claude API                        │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  BaseProvider.executeWithRetry()       │
│  - 指数退避重试                         │
│  - 超时处理                             │
└────────────────────────────────────────┘
         ↓
    Claude API 返回任务 JSON
         ↓
┌────────────────────────────────────────┐
│  JSON 解析和验证                        │
│  TaskValidator.validate()              │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  FileStorage.saveTasks()               │
│  写入 tasks.json                        │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  TaskGenerator.generate()              │
│  生成 task-*.md 文件                    │
└────────────────────────────────────────┘
         ↓
    输出：已生成 10 个任务
```

## 关键设计模式

### 1. 门面模式（Facade Pattern）
**TmCore** 作为统一入口，隐藏内部复杂性：
```typescript
const tmCore = await createTmCore({ projectPath });
await tmCore.tasks.list();      // 不需要知道内部实现
await tmCore.workflow.start();   // 统一接口
```

### 2. 仓储模式（Repository Pattern）
**Storage Interface** 抽象数据访问：
```typescript
interface IStorage {
  loadTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
}

// 可以轻松切换实现
const storage = new FileStorage(projectPath);  // 本地文件
const storage = new APIStorage(config);        // Supabase API
```

### 3. 策略模式（Strategy Pattern）
**AI Provider** 可插拔：
```typescript
interface IAIProvider {
  generateCompletion(prompt: string): Promise<AIResponse>;
}

// 运行时选择提供者
const provider = registry.getProvider(modelId);
const response = await provider.generateCompletion(prompt);
```

### 4. 模板方法模式（Template Method）
**BaseProvider** 定义算法骨架：
```typescript
abstract class BaseProvider {
  // 模板方法（final）
  async generateCompletion() {
    this.validateInput();
    const prepared = await this.preprocessRequest();
    const result = await this.executeWithRetry(
      () => this.doGenerateCompletion(prepared)  // 抽象方法
    );
    return this.postprocessResponse(result);
  }

  // 子类实现
  protected abstract doGenerateCompletion(): Promise<CompletionResult>;
}
```

### 5. 工厂模式（Factory Pattern）
**StorageFactory** 根据配置创建存储实例：
```typescript
class StorageFactory {
  static async create(config: StorageConfig): Promise<IStorage> {
    if (config.storageType === 'api') {
      return new APIStorage(config.api);
    }
    return new FileStorage(config.projectPath);
  }
}
```

### 6. 依赖注入（Dependency Injection）
**ConfigManager** 注入到所有领域：
```typescript
class TmCore {
  constructor(options: TmCoreOptions) {
    this._configManager = await ConfigManager.create(options.projectPath);

    // 注入依赖
    this._tasks = new TasksDomain(this._configManager);
    this._workflow = new WorkflowDomain(this._configManager);
    this._config = new ConfigDomain(this._configManager);
  }
}
```

## 性能优化措施

### 1. 构建优化
- **增量构建**: Turborepo 缓存机制
- **并行构建**: 多包同时构建
- **快速构建**: tsdown (esbuild) < 1秒

### 2. 运行时优化
- **懒加载**: 按需加载领域模块
- **连接池**: 复用 Supabase 连接
- **缓存**: 配置文件内存缓存

### 3. AI 调用优化
- **指数退避**: 避免频繁重试
- **超时控制**: 2分钟超时保护
- **流式响应**: 支持大型任务生成

## 安全性设计

### 1. API 密钥管理
```bash
# .env 文件（不提交到 git）
ANTHROPIC_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...

# MCP 配置（用户级）
~/.cursor/mcp.json
```

### 2. 输入验证
- Zod schema 验证所有输入
- 路径遍历防护
- SQL 注入防护（Supabase RLS）

### 3. 错误处理
```typescript
try {
  await tmCore.tasks.get(taskId);
} catch (error) {
  if (error instanceof TaskMasterError) {
    // 结构化错误
    console.error(error.code, error.message);
  }
}
```

## 总结

Task Master AI 的架构特点：

1. **不是传统前后端应用**，而是 **CLI + MCP Server** 的组合
2. **领域驱动设计**：核心业务逻辑完全在 @tm/core
3. **表现层薄包装**：CLI 和 MCP 仅负责参数解析和输出格式化
4. **多 AI 提供者**：统一接口，可插拔实现
5. **多存储后端**：支持本地文件和 Supabase API
6. **Monorepo 架构**：Turborepo + npm workspaces
7. **现代构建工具链**：tsdown (esbuild) 快速构建
8. **测试驱动**：Jest + 80% 覆盖率要求

这是一个**高度模块化、可扩展、面向 AI 的任务管理系统**，专为 AI 驱动的开发工作流设计。
