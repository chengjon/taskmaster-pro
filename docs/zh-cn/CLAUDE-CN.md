# CLAUDE-CN.md

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供中文指导。

## Task Master AI 使用说明

**导入 Task Master 的开发工作流命令和指南，将其视为主 CLAUDE.md 文件的一部分。**
@./.taskmaster/CLAUDE.md

## 项目概述

Task Master AI 是一个基于 monorepo 架构的任务管理系统，专为 AI 驱动的开发设计。它使用 TypeScript 构建，采用领域驱动架构，严格分离业务逻辑和表现层。

## Monorepo 结构

这是一个由 Turborepo 管理、使用 npm workspaces 的 monorepo 项目：

```
claude-task-master/
├── apps/                       # 应用程序
│   ├── cli/                   # CLI 应用 (@tm/cli)
│   ├── mcp/                   # MCP 服务器 (@tm/mcp)
│   ├── docs/                  # Mintlify 文档站点
│   └── extension/             # VS Code 扩展（未来）
├── packages/                   # 共享包
│   ├── tm-core/               # 核心业务逻辑 (@tm/core) - 关键
│   ├── tm-bridge/             # 遗留桥接层 (@tm/bridge)
│   ├── build-config/          # 共享构建配置
│   ├── claude-code-plugin/    # Claude Code 插件
│   └── ai-sdk-provider-grok-cli/ # Grok 的 AI SDK 提供者
├── scripts/                   # 遗留脚本（正在迁移到 tm-core）
└── src/                       # 共享工具和重构后的代码
```

## 关键架构规则：业务逻辑分离

**所有业务逻辑必须放在 `@tm/core` (packages/tm-core/) 中，而不是表现层。**

### @tm/core 包

`@tm/core` 是所有业务逻辑的唯一真实来源。它提供一个统一的门面（`TmCore`），暴露特定领域的 API：

- **`tasks`** - 任务管理（TasksDomain）
- **`auth`** - 身份认证（AuthDomain）
- **`workflow`** - 工作流编排（WorkflowDomain）
- **`git`** - Git 操作（GitDomain）
- **`config`** - 配置管理（ConfigDomain）
- **`integration`** - 外部集成（IntegrationDomain）

**使用示例：**
```typescript
import { createTmCore } from '@tm/core';

const tmCore = await createTmCore({ projectPath: process.cwd() });
const tasks = await tmCore.tasks.list();
await tmCore.tasks.setStatus('1', 'done');
```

### 表现层（仅作为轻量包装器）

- **`@tm/cli`** (apps/cli/) - CLI 命令调用 tm-core 方法并格式化输出
- **`@tm/mcp`** (apps/mcp/) - MCP 工具调用 tm-core 方法并返回 MCP 响应
- **`apps/extension`** - VS Code 扩展（未来）

**表现层应该做的：**
- 解析 CLI 参数或 MCP 工具参数
- 调用适当的 tm-core 领域方法
- 格式化并显示响应

**表现层绝对不应该做的：**
- 解析任务 ID（使用 `tmCore.tasks.get(taskId)`）
- 验证数据（验证逻辑在 tm-core 中）
- 转换数据（转换逻辑在 tm-core 中）
- 在 CLI 和 MCP 之间重复逻辑

### 迁移状态

代码库正在从遗留的 `scripts/` 积极迁移到新的 `@tm/core` 架构。处理功能时：

1. **新功能**：首先在 `@tm/core` 中实现，然后通过表现层暴露
2. **Bug 修复**：如果代码在 `scripts/` 中，考虑先将其迁移到 `@tm/core`
3. **重构**：优先将逻辑从 `scripts/` → `packages/tm-core/src/modules/` 迁移

## 开发命令

### 构建

```bash
# 构建所有包和应用（使用 Turbo 和 tsdown）
npm run build

# 在开发/监视模式下构建
npm run dev
npm run turbo:dev  # Turbo 并行监视模式

# 仅构建 build-config 包（前置条件）
npm run build:build-config

# 类型检查但不构建
npm run turbo:typecheck
```

### 测试

```bash
# 运行所有测试（使用 Jest 和 ES 模块）
npm test

# 运行特定测试套件
npm run test:unit          # 仅单元测试
npm run test:integration   # 仅集成测试
npm run test:e2e          # 端到端测试

# 在监视模式下运行测试
npm run test:watch

# 仅运行失败的测试
npm run test:fails

# 生成覆盖率报告
npm run test:coverage
npm run test:ci           # CI 模式，带覆盖率
```

**重要的测试执行细节：**
- 所有测试命令使用 `node --experimental-vm-modules` 以支持 ESM
- 测试使用 Jest 和 `ts-jest` 进行 TypeScript 转换
- 测试文件必须使用 `.ts` 扩展名，而不是 `.js`

### 代码质量

```bash
# 使用 Biome 格式化代码
npm run format
npm run format-check

# 检查工作区间的依赖一致性
npm run deps:check
npm run deps:fix
```

### MCP 开发

```bash
# 本地运行 MCP 服务器
npm run mcp-server

# 使用官方检查器检查 MCP 服务器
npm run inspector
```

## 测试文件放置指南

### 首选：协同定位的测试

尽可能将测试放在源文件旁边：

- **包单元测试**：`packages/<package-name>/src/<module>/<file>.spec.ts`
- **应用单元测试**：`apps/<app-name>/src/<module>/<file>.spec.ts`
- **包集成测试**：`packages/<package-name>/tests/integration/<module>/<file>.test.ts`
- **应用集成测试**：`apps/<app-name>/tests/integration/<module>/<file>.test.ts`

### 备选：集中式测试

仅在无法协同定位时使用集中位置：

- **独立单元测试**：`tests/unit/packages/<package-name>/`
- **E2E 测试**：`tests/e2e/`

### 测试文件命名

- **单元测试**：`*.spec.ts`（例如 `task-manager.spec.ts`）
- **集成测试**：`*.test.ts`（例如 `task-api.test.ts`）
- **始终使用 `.ts` 扩展名**，永远不要用 `.js`

## 同步测试模式

**除非测试实际的异步操作，否则永远不要在测试函数中使用 async/await。**

```typescript
// ✅ 正确 - 同步导入和测试
import { MyClass } from '../src/my-class.js';

it('应该验证行为', () => {
  expect(new MyClass().property).toBe(value);
});

// ❌ 错误 - 不必要的异步
it('应该验证行为', async () => {
  const { MyClass } = await import('../src/my-class.js');
  expect(new MyClass().property).toBe(value);
});
```

## 何时编写测试

**始终为以下情况编写测试：**
- Bug 修复（防止回归）
- 业务逻辑（计算、验证、转换）
- 边界情况（边界、错误、null/undefined）
- 公共 API（其他代码依赖的方法）
- 集成点（数据库、文件系统、外部 API）

**跳过以下情况的测试：**
- 简单的 getter/setter
- 琐碎的传递函数
- 纯配置对象
- 仅委托给已测试函数的代码

**Bug 修复工作流：**
1. 遇到 bug
2. 编写能重现 bug 的失败测试
3. 修复 bug
4. 验证测试通过
5. 一起提交修复和测试

## 构建系统

### tsdown 配置

项目使用 `tsdown`（由 esbuild 驱动）进行快速构建：

- **配置**：`tsdown.config.ts`
- **入口点**：
  - `task-master`：`scripts/dev.js`（CLI）
  - `mcp-server`：`mcp-server/server.js`（MCP）
- **输出**：`dist/` 目录
- **打包**：打包 `@tm/*` 工作区包，保持 npm 依赖为外部
- **环境变量**：为 `TM_PUBLIC_*` 变量进行构建时注入

### TypeScript 配置

- **根配置**：`tsconfig.json`
- **目标**：ES2022
- **模块**：ESNext，使用 bundler 解析
- **路径别名**：所有包使用 `@tm/<package>` 导入
- **严格模式**：已启用

路径别名示例：
```typescript
import { createTmCore } from '@tm/core';
import { TasksDomain } from '@tm/core/modules/tasks';
```

## Package.json 脚本说明

### 主要构建脚本
- `build` - 生产构建（先构建 build-config，然后运行 tsdown）
- `dev` - 开发监视模式
- `turbo:build` / `turbo:dev` - Turborepo 并行构建

### 测试脚本
- `test` - 使用 Jest + ESM 支持运行所有测试
- `test:unit` - 仅单元测试（路径模式：`unit`）
- `test:integration` - 仅集成测试（路径模式：`integration`）
- `test:watch` - 交互式监视模式
- `test:fails` - 重新运行仅失败的测试
- `test:coverage` - 生成覆盖率报告
- `test:ci` - CI 模式，带覆盖率
- `test:e2e` - 运行端到端测试（bash 脚本）

### 发布管理
- `changeset` - 创建 changeset（大多数 PR 需要）
- `release` - 发布包（仅维护者）
- `publish-packages` - 完整的发布流程

## 使用 Changesets

当进行影响用户的更改时，创建一个 changeset：

```bash
npm run changeset
```

**选择适当的版本升级类型：**
- **Major**：破坏性更改
- **Minor**：新功能
- **Patch**：Bug 修复、文档、性能改进

**Changeset 摘要提示：**
- 编写面向用户的描述（进入 CHANGELOG.md）
- 关注对用户的变化是什么，而不是如何实现
- 示例："添加对自定义 Ollama 模型的支持"（而不是"实现模型验证类"）

## 文档指南

- **文档站点**：`apps/docs/`（Mintlify 驱动）
- **公共 URL**：https://docs.task-master.dev
- **不要**在 `docs/` 目录中创建文档
- **不要**在面向用户的文档中引用本地文件路径

## 重要文件模式

### 永远不要手动编辑的文件

- `.taskmaster/tasks/tasks.json` - 改用 CLI/MCP 命令
- `.taskmaster/config.json` - 使用 `TAMP models` 命令
- `package-lock.json` - 由 npm 自动管理

### 配置文件

- `.env.example` - API 密钥模板（复制到 `.env`）
- `biome.json` - 代码格式化器配置（制表符、单引号）
- `jest.config.js` - 测试运行器配置
- `turbo.json` - Turborepo 任务流程
- `.manypkg.json` - 工作区依赖验证

## TypeScript 路径解析

项目使用 TypeScript 路径别名进行清晰的导入：

```typescript
// 工作区包
import { createTmCore } from '@tm/core';
import { TasksDomain } from '@tm/core/modules/tasks';
import { CLI } from '@tm/cli';

// 在包内，对内部模块使用相对导入
import { TaskManager } from './task-manager.js';
import type { Task } from '../types/task.js';
```

**注意**：导入 TypeScript 文件时，在导入路径中使用 `.js` 扩展名（TypeScript 的 ESM 约定）。

## MCP 服务器开发

MCP 服务器（`apps/mcp/`）为 AI 编辑器提供与 Task Master 交互的工具：

- **工具位置**：`apps/mcp/src/tools/`
- **共享工具**：`apps/mcp/src/shared/`
- **工具实现**：每个工具调用 `@tm/core` 方法
- **测试**：使用 `npm run inspector` 通过 MCP Inspector 测试工具

## 遗留代码迁移

`scripts/` 目录包含正在迁移到 `@tm/core` 的遗留代码。处理此代码时：

1. **识别**函数属于哪个领域（tasks、config、git 等）
2. **创建** `@tm/core` 中相应领域类的等效方法
3. **更新** CLI 和 MCP 以使用新的 tm-core 方法
4. **测试**新实现
5. **移除**遗留脚本代码

## 常见陷阱

### 导入扩展名
在 TypeScript 导入中始终使用 `.js` 扩展名以实现 ESM 兼容性：
```typescript
import { foo } from './bar.js';  // ✅ 正确
import { foo } from './bar';     // ❌ 错误
```

### 测试文件扩展名
测试文件必须使用 `.ts` 扩展名：
```typescript
// ✅ 正确
task-manager.spec.ts
task-api.test.ts

// ❌ 错误
task-manager.spec.js
task-api.test.js
```

### 异步测试
仅在实际测试异步操作时使用 async：
```typescript
// ✅ 正确 - 测试异步操作
it('应该获取数据', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ❌ 错误 - 同步操作不需要 async
it('应该解析 ID', async () => {
  expect(parseId('1.2')).toEqual({ taskId: 1, subtaskId: 2 });
});
```

### 业务逻辑位置
永远不要在 CLI 或 MCP 层中放置业务逻辑：
```typescript
// ❌ 错误 - CLI 中的逻辑
async function handleShowTask(id: string) {
  const parts = id.split('.');
  const taskId = parseInt(parts[0]);
  // ... 更多解析逻辑
}

// ✅ 正确 - tm-core 中的逻辑
const task = await tmCore.tasks.get(id);  // tm-core 处理解析
```

## 运行单个测试

要运行特定的测试文件或模式：

```bash
# 运行特定测试文件
npm test -- path/to/test.spec.ts

# 运行匹配模式的测试
npm test -- --testNamePattern="应该解析任务 ID"

# 运行特定包中的测试
npm test -- packages/tm-core

# 为特定文件运行带覆盖率的测试
npm test -- --coverage --collectCoverageFrom="packages/tm-core/src/**/*.ts"
```

## 环境变量

### 测试所需
将 `.env.example` 复制到 `.env` 并添加至少一个 API 密钥：
- `ANTHROPIC_API_KEY` - Claude 模型（推荐）
- `PERPLEXITY_API_KEY` - 研究功能（推荐）
- `OPENAI_API_KEY` - GPT 模型
- `GOOGLE_API_KEY` - Gemini 模型

### 构建时变量
以 `TM_PUBLIC_*` 为前缀的变量在构建时注入：
- `TM_PUBLIC_VERSION` - 从 package.json 自动注入

## 代码风格

- **格式化器**：Biome（制表符、单引号、80 字符行宽）
- **Linting**：Biome linter（目前仅为扩展应用启用）
- **提交前**：提交前格式化代码
- **导入**：工作区包使用路径别名，内部模块使用相对路径

## 贡献工作流

1. **分支**：始终针对 `next` 分支创建 PR，而不是 `main`
2. **测试**：推送前在本地运行 `npm test`
3. **格式化**：提交前运行 `npm run format`
4. **Changeset**：为面向用户的更改创建 changeset
5. **构建**：确保 `npm run build` 成功
6. **审查**：在请求审查前自我审查您的更改

## 常见开发任务

### 添加新命令
1. 在 `@tm/core` 领域中实现业务逻辑
2. 在 `apps/cli/src/commands/` 中创建 CLI 命令
3. 在 `apps/mcp/src/tools/` 中创建 MCP 工具
4. 在相应的测试目录中添加测试
5. 创建 changeset

### 修复 bug
1. 编写能重现 bug 的失败测试
2. 修复 bug（最好在 `@tm/core` 中）
3. 验证测试通过
4. 创建 changeset
5. 一起提交修复和测试

### 迁移遗留代码
1. 识别它属于哪个领域（tasks、config、git 等）
2. 在相应的 `@tm/core` 领域类中实现
3. 在 `packages/tm-core/src/<domain>/*.spec.ts` 中添加测试
4. 更新 CLI 以使用新的 tm-core 方法
5. 更新 MCP 以使用新的 tm-core 方法
6. 移除遗留代码
7. 创建 changeset
