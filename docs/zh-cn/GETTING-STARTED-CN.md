# Task Master Pro - 快速入门指南

> **AI 驱动的专业任务管理系统 (TAMP)** - 专为现代开发工作流程设计

[![npm version](https://badge.fury.io/js/taskmaster-pro.svg)](https://www.npmjs.com/package/taskmaster-pro)
[![CI](https://github.com/chengjon/taskmaster-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/chengjon/taskmaster-pro/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

## 目录

- [简介](#简介)
- [核心功能](#核心功能)
- [安装](#安装)
- [快速开始](#快速开始)
- [基本使用](#基本使用)
- [常用命令](#常用命令)
- [高级功能](#高级功能)
- [配置说明](#配置说明)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

## 简介

Task Master Pro (TAMP) 是一个强大的专业任务管理系统，专为 AI 驱动的开发工作流程设计。它可以：

- ✅ 从产品需求文档 (PRD) 自动生成任务
- ✅ 使用 AI 将复杂任务分解为可管理的子任务
- ✅ 智能管理任务依赖关系
- ✅ 支持 12+ AI 提供商（Claude、GPT-4、Gemini、Grok 等）
- ✅ 提供 TDD（测试驱动开发）自动化工作流
- ✅ 与主流 AI 编辑器无缝集成（Cursor、Windsurf、Claude Code 等）

## 核心功能

### 1. 智能任务生成

从 PRD 文档自动生成结构化任务列表：

```bash
TAMP parse-prd .taskmaster/docs/prd.txt
# 或使用短命令
TAMP parse-prd .taskmaster/docs/prd.txt
```

### 2. 任务分解 (Task Expansion)

使用 AI 将复杂任务自动分解为详细的子任务：

```bash
# 分解单个任务
TAMP expand --id=5 --research

# 分解所有待处理任务
TAMP expand --all --research
# 或使用短命令
TAMP expand --all --research
```

### 3. 多上下文管理 (Tagged Lists)

为不同工作流程创建独立的任务列表：

```bash
# 创建新标签
TAMP add-tag feature-auth --description="认证功能开发"

# 切换标签
TAMP use-tag feature-auth

# 列出所有标签
TAMP list-tags
```

### 4. 依赖管理

自动检测和管理任务之间的依赖关系：

```bash
# 添加依赖
TAMP add-dependency --id=3 --depends-on=1

# 验证依赖
TAMP validate-dependencies

# 修复依赖问题
TAMP fix-dependencies
```

### 5. AI 研究助手

使用 AI 进行实时信息研究：

```bash
# 研究最新技术
TAMP research "React 19 的最新特性和迁移指南"

# 带上下文研究
TAMP research "如何优化 Next.js 14 的 SSR 性能" --task-ids=5,6
```

### 6. TDD 自动化工作流 (Autopilot)

自动执行测试驱动开发循环：

```bash
# 启动 TDD 工作流
TAMP autopilot start 5

# 查看下一步操作
TAMP autopilot next

# 完成当前阶段
TAMP autopilot complete --results '{"total":10,"passed":10,"failed":0}'

# 提交更改
TAMP autopilot commit
```

## 安装

### 方式一：全局安装（推荐）

```bash
npm install -g taskmaster-pro
```

### 方式二：项目内安装

```bash
npm install taskmaster-pro
```

### 方式三：MCP 集成（AI 编辑器）

#### Cursor / Windsurf / Q Developer CLI

在 `~/.cursor/mcp.json` 或 `~/.codeium/windsurf/mcp_config.json` 添加：

```json
{
  "mcpServers": {
    "taskmaster-pro": {
      "command": "npx",
      "args": ["-y", "taskmaster-pro"],
      "env": {
        "ANTHROPIC_API_KEY": "你的_ANTHROPIC_密钥",
        "PERPLEXITY_API_KEY": "你的_PERPLEXITY_密钥",
        "OPENAI_API_KEY": "你的_OPENAI_密钥"
      }
    }
  }
}
```

#### Claude Code CLI

```bash
claude mcp add taskmaster-ai -- npx -y taskmaster-pro
```

## 快速开始

### 步骤 1：初始化项目

```bash
TAMP init
# 或使用短命令
TAMP init
```

初始化完成后，会创建以下结构：

```
your-project/
├── .taskmaster/
│   ├── tasks/              # 任务文件
│   │   └── tasks.json      # 主任务数据库
│   ├── docs/               # 文档目录
│   │   └── prd.txt         # 产品需求文档
│   ├── templates/          # 模板文件
│   ├── reports/            # 分析报告
│   └── config.json         # 配置文件
└── .env                    # API 密钥
```

### 步骤 2：配置 API 密钥

编辑 `.env` 文件，添加至少一个 AI 提供商的 API 密钥：

```bash
# 推荐：Claude（Anthropic）
ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# 推荐：用于研究功能
PERPLEXITY_API_KEY="pplx-your-key-here"

# 可选：其他提供商
OPENAI_API_KEY="sk-proj-your-key-here"
GOOGLE_API_KEY="your-google-key-here"
XAI_API_KEY="your-xai-key-here"
```

**获取 API 密钥：**

- Anthropic (Claude): https://console.anthropic.com/
- Perplexity: https://www.perplexity.ai/settings/api
- OpenAI: https://platform.openai.com/api-keys
- Google (Gemini): https://aistudio.google.com/app/apikey
- xAI (Grok): https://console.x.ai/

### 步骤 3：配置 AI 模型

```bash
# 交互式配置
TAMP models --setup

# 或者直接设置
TAMP models --set-main claude-3-5-sonnet-20241022
TAMP models --set-research perplexity-llama-3.1-sonar-large-128k-online
TAMP models --set-fallback gpt-4o-mini
```

### 步骤 4：创建 PRD（产品需求文档）

在 `.taskmaster/docs/prd.txt` 创建你的产品需求文档：

```
# 项目名称：用户认证系统

## 目标
实现一个完整的 JWT 认证系统

## 功能需求
1. 用户注册
   - 邮箱和密码注册
   - 密码强度验证
   - 邮箱验证

2. 用户登录
   - JWT token 生成
   - 刷新 token 机制
   - 记住我功能

3. 密码管理
   - 忘记密码
   - 重置密码
   - 修改密码

## 技术要求
- 使用 bcrypt 加密密码
- JWT token 有效期 1 小时
- 刷新 token 有效期 7 天
- Redis 存储 token 黑名单

## 测试要求
- 单元测试覆盖率 > 80%
- 集成测试覆盖所有 API 端点
```

### 步骤 5：解析 PRD 生成任务

```bash
TAMP parse-prd .taskmaster/docs/prd.txt
```

### 步骤 6：分析并展开任务

```bash
# 分析任务复杂度
TAMP analyze-complexity --research

# 查看复杂度报告
TAMP complexity-report

# 自动展开所有任务为子任务
TAMP expand --all --research
```

## 基本使用

### 查看任务

```bash
# 列出所有任务
TAMP list

# 列出特定状态的任务
TAMP list --status=pending
TAMP list --status=in-progress
TAMP list --status=done

# 包含子任务
TAMP list --with-subtasks

# JSON 格式输出
TAMP list --format=json
```

### 获取下一个任务

```bash
# 基于依赖关系获取下一个可执行任务
TAMP next
# 或使用短命令
TAMP next
```

### 查看任务详情

```bash
# 查看单个任务
TAMP show 1

# 查看子任务
TAMP show 1.2

# 查看多个任务
TAMP show 1,3,5
```

### 更新任务状态

```bash
# 标记任务为进行中
TAMP set-status --id=1 --status=in-progress

# 标记任务为完成
TAMP set-status --id=1 --status=done

# 批量更新
TAMP set-status --id=1,2,3 --status=done

# 更新子任务
TAMP set-status --id=1.1 --status=done
```

**可用状态：**
- `pending` - 待处理
- `in-progress` - 进行中
- `done` - 已完成
- `deferred` - 已推迟
- `cancelled` - 已取消
- `blocked` - 被阻塞

## 常用命令

### 任务管理

```bash
# 添加新任务
TAMP add-task --prompt="实现用户登录功能" --research

# 添加带依赖的任务
TAMP add-task --prompt="集成测试" --dependencies=1,2,3 --priority=high

# 删除任务
TAMP remove-task --id=5

# 移动任务
TAMP move --from=5 --to=3
```

### 任务更新

```bash
# 更新单个任务
TAMP update-task --id=5 --prompt="添加 OAuth 2.0 支持" --research

# 批量更新（从指定 ID 开始）
TAMP update --from=5 --prompt="切换到 TypeScript" --research

# 更新子任务（追加信息）
TAMP update-subtask --id=5.2 --prompt="添加限流：每分钟 100 次请求"
```

### 子任务管理

```bash
# 手动添加子任务
TAMP add-subtask --id=5 --title="实现登录 API" --description="..."

# 清除子任务
TAMP clear-subtasks --id=5

# 清除所有任务的子任务
TAMP clear-subtasks --all

# 将子任务转换为独立任务
TAMP remove-subtask --id=5.2 --convert
```

### 依赖管理

```bash
# 添加依赖关系
TAMP add-dependency --id=3 --depends-on=1

# 删除依赖
TAMP remove-dependency --id=3 --depends-on=1

# 验证所有依赖
TAMP validate-dependencies

# 自动修复依赖问题
TAMP fix-dependencies
```

### 标签（多上下文）管理

```bash
# 创建新标签
TAMP add-tag feature-auth

# 从当前标签复制任务
TAMP add-tag hotfix --copy-from-current

# 从 git 分支创建标签
TAMP add-tag --from-branch

# 切换标签
TAMP use-tag feature-auth

# 列出所有标签
TAMP list-tags

# 重命名标签
TAMP rename-tag old-name new-name

# 删除标签
TAMP delete-tag feature-auth

# 跨标签移动任务
TAMP move --from=5 --from-tag=backlog --to-tag=in-progress
```

### 研究功能

```bash
# 基础研究
TAMP research "Next.js 15 的新特性"

# 带任务上下文的研究
TAMP research "如何实现 WebSocket 认证" --task-ids=5,6

# 带文件上下文的研究
TAMP research "优化 API 性能" --file-paths="src/api.ts,src/db.ts"

# 保存研究结果到文件
TAMP research "JWT 最佳实践" --save-to-file

# 将研究结果保存到任务
TAMP research "JWT 安全性" --save-to=5.2
```

## 高级功能

### 复杂度分析

```bash
# 分析所有任务
TAMP analyze-complexity --research

# 分析指定范围
TAMP analyze-complexity --from=5 --to=10

# 分析特定任务
TAMP analyze-complexity --ids=1,3,5

# 设置复杂度阈值
TAMP analyze-complexity --threshold=7

# 查看报告
TAMP complexity-report
```

### TDD 自动化工作流（Autopilot）

Autopilot 是一个自动化的测试驱动开发工作流，它强制执行 RED → GREEN → COMMIT 循环：

```bash
# 1. 启动工作流
TAMP autopilot start 5

# 2. 获取下一步操作（带详细上下文）
TAMP autopilot next

# 3. 写失败的测试，然后完成 RED 阶段
TAMP autopilot complete-phase --results '{"total":5,"passed":0,"failed":5}'

# 4. 实现代码，然后完成 GREEN 阶段
TAMP autopilot complete-phase --results '{"total":5,"passed":5,"failed":0}'

# 5. 提交更改
TAMP autopilot commit

# 重复步骤 2-5 直到所有子任务完成

# 查看状态
TAMP autopilot status

# 暂停后恢复
TAMP autopilot resume

# 终止工作流
TAMP autopilot abort

# 完成所有工作
TAMP autopilot finalize
```

### 生成任务文件

```bash
# 从 tasks.json 生成 markdown 文件
TAMP generate

# 指定输出目录
TAMP generate --output=./custom-tasks/
```

### 规则管理

规则是针对不同 AI 编辑器的配置和提示：

```bash
# 初始化时添加规则
TAMP init --rules cursor,windsurf,claude

# 后续添加规则
TAMP rules add vscode,roo

# 删除规则
TAMP rules remove cursor
```

**可用规则：**
- `cursor` - Cursor AI
- `windsurf` - Windsurf
- `claude` - Claude Code
- `vscode` - VS Code
- `roo` - Roo Cline
- `cline` - Cline
- `codex` - Codex
- 更多...

## 配置说明

### 配置文件位置

- **全局配置**：`~/.taskmaster/config.json`
- **项目配置**：`.taskmaster/config.json`
- **环境变量**：`.env`

### 模型配置

Task Master Pro 支持三种模型角色：

1. **主模型（Main Model）**：用于任务生成、更新等主要操作
2. **研究模型（Research Model）**：用于实时信息研究
3. **备用模型（Fallback Model）**：主模型或研究模型失败时使用

```bash
# 查看当前配置
TAMP models

# 列出所有可用模型
TAMP models --list-available-models

# 配置模型
TAMP models --set-main claude-3-5-sonnet-20241022
TAMP models --set-research perplexity-llama-3.1-sonar-large-128k-online
TAMP models --set-fallback gpt-4o-mini

# 配置自定义模型
TAMP models --set-main "custom-model-id" --openai-compatible --base-url="https://api.example.com/v1"
```

### 支持的 AI 提供商

| 提供商 | 需要 API 密钥 | 示例模型 |
|--------|---------------|----------|
| Anthropic (Claude) | ✅ | claude-3-5-sonnet-20241022 |
| OpenAI | ✅ | gpt-4o, gpt-4-turbo |
| Google (Gemini) | ✅ | gemini-2.0-flash-exp |
| Perplexity | ✅ | perplexity-llama-3.1-sonar-large-128k-online |
| xAI (Grok) | ✅ | grok-2-latest |
| Groq | ✅ | llama-3.3-70b-versatile |
| OpenRouter | ✅ | anthropic/claude-3.5-sonnet |
| Mistral | ✅ | mistral-large-latest |
| Azure OpenAI | ✅ | 自定义部署 |
| AWS Bedrock | ❌ (使用 AWS 凭证) | anthropic.claude-3-5-sonnet-20241022-v2:0 |
| Google Vertex | ❌ (使用服务账号) | gemini-2.0-flash-exp |
| Ollama | ❌ (本地) | llama3.1, qwen2.5 |
| Claude Code | ❌ (使用 OAuth) | claude-code/sonnet |
| Gemini CLI | ❌ (使用 OAuth) | gemini-cli/gemini-2.0-flash-exp |
| Grok CLI | ❌ (使用 CLI 配置) | grok-cli/grok-2-latest |

### 响应语言配置

```bash
# 设置响应语言为中文
TAMP response-language 中文

# 设置为英文
TAMP response-language English

# 设置为西班牙语
TAMP response-language Español
```

## 最佳实践

### 1. 编写高质量 PRD

```
✅ 好的 PRD：
- 清晰的目标和范围
- 详细的功能需求
- 具体的技术要求
- 明确的验收标准
- 测试策略

❌ 不好的 PRD：
- "做一个登录系统"
- 缺少技术细节
- 没有明确的完成标准
```

### 2. 任务命名规范

```
✅ 好的任务标题：
- "实现 JWT 认证中间件"
- "添加用户注册 API 端点"
- "编写密码加密单元测试"

❌ 不好的任务标题：
- "修复 bug"
- "做一些优化"
- "更新代码"
```

### 3. 合理使用依赖

```bash
# ✅ 正确使用
TAMP add-dependency --id=3 --depends-on=1  # 任务 3 依赖任务 1

# ❌ 避免循环依赖
TAMP add-dependency --id=1 --depends-on=3  # 错误：形成循环
```

### 4. 标签组织策略

```bash
# 按功能分组
TAMP add-tag feature-auth
TAMP add-tag feature-payment

# 按阶段分组
TAMP add-tag phase-1-mvp
TAMP add-tag phase-2-enhancement

# 按团队分组
TAMP add-tag team-frontend
TAMP add-tag team-backend
```

### 5. 使用研究功能

```bash
# 在实现前研究最佳实践
TAMP research "Node.js JWT 认证最佳实践" --save-to=5

# 研究性能优化
TAMP research "React 性能优化技巧" --file-paths="src/components/"

# 研究安全问题
TAMP research "防止 SQL 注入的方法" --task-ids=3,4,5
```

### 6. TDD 工作流最佳实践

```bash
# 1. 启动前确保任务已经完全展开为子任务
TAMP expand --id=5 --research

# 2. 使用 autopilot 自动化 TDD 循环
TAMP autopilot start 5

# 3. 每个子任务都遵循 RED-GREEN-COMMIT
# - RED: 写失败的测试
# - GREEN: 实现代码让测试通过
# - COMMIT: 提交更改

# 4. 随时查看进度
TAMP autopilot status
```

## 故障排查

### API 密钥问题

```bash
# 检查密钥配置
TAMP models

# 如果看到 "API key not configured"，检查 .env 文件
cat .env

# 或在 MCP 配置中检查
cat ~/.cursor/mcp.json
```

### 依赖问题

```bash
# 检测依赖问题
TAMP validate-dependencies

# 自动修复
TAMP fix-dependencies
```

### 任务文件同步问题

```bash
# 重新生成任务文件
TAMP generate

# 如果 tasks.json 损坏，从备份恢复
cp .taskmaster/tasks/tasks.json.backup .taskmaster/tasks/tasks.json
```

### MCP 连接问题

1. **检查 MCP 配置文件**
   ```bash
   cat ~/.cursor/mcp.json
   ```

2. **重启编辑器**

3. **检查 Node.js 版本**
   ```bash
   node --version  # 需要 >= 18
   ```

4. **使用 CLI 作为备选方案**
   ```bash
   npm install -g taskmaster-pro
   ```

### 常见错误

#### "No API key configured"
```bash
# 添加至少一个 API 密钥到 .env
echo "ANTHROPIC_API_KEY=your-key" >> .env
```

#### "Circular dependency detected"
```bash
# 检查并修复循环依赖
TAMP validate-dependencies
TAMP fix-dependencies
```

#### "Task not found"
```bash
# 列出所有任务查看正确的 ID
TAMP list
```

#### "Command not found: taskmaster-pro"
```bash
# 如果全局安装，检查 PATH
echo $PATH

# 或使用 npx
npx TAMP <command>

# 或使用短命令
TAMP <command>
```

## 工作流示例

### 示例 1：从零开始的新项目

```bash
# 1. 初始化
TAMP init

# 2. 添加 API 密钥
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
echo "PERPLEXITY_API_KEY=pplx-..." >> .env

# 3. 配置模型
TAMP models --set-main claude-3-5-sonnet-20241022
TAMP models --set-research perplexity-llama-3.1-sonar-large-128k-online

# 4. 创建 PRD
vim .taskmaster/docs/prd.txt

# 5. 解析 PRD
TAMP parse-prd .taskmaster/docs/prd.txt

# 6. 分析复杂度
TAMP analyze-complexity --research

# 7. 展开任务
TAMP expand --all --research

# 8. 开始开发
TAMP next
TAMP show 1
TAMP set-status --id=1 --status=in-progress
# ... 实现功能 ...
TAMP set-status --id=1 --status=done
```

### 示例 2：使用 TDD 工作流

```bash
# 1. 选择一个任务
TAMP show 5

# 2. 启动 TDD 工作流
TAMP autopilot start 5

# 3. 循环：对每个子任务执行
while true; do
  # 获取下一步
  TAMP autopilot next

  # RED: 写失败的测试
  # ... 编写测试 ...
  npm test
  TAMP autopilot complete-phase --results '{"total":5,"passed":0,"failed":5}'

  # GREEN: 实现代码
  # ... 实现功能 ...
  npm test
  TAMP autopilot complete-phase --results '{"total":5,"passed":5,"failed":0}'

  # COMMIT: 提交
  TAMP autopilot commit
done

# 4. 完成工作流
TAMP autopilot finalize
```

### 示例 3：多团队协作

```bash
# 1. 创建不同团队的标签
TAMP add-tag team-frontend
TAMP add-tag team-backend
TAMP add-tag team-devops

# 2. 为每个团队分配任务
TAMP use-tag team-frontend
TAMP move --from=1,2,3 --from-tag=master --to-tag=team-frontend

TAMP use-tag team-backend
TAMP move --from=4,5,6 --from-tag=master --to-tag=team-backend

# 3. 各团队在自己的标签下工作
TAMP use-tag team-frontend
TAMP list
TAMP next
# ... 工作 ...

# 4. 查看全局进度
TAMP list-tags
```

## 更多资源

### 官方文档

- 📚 **完整文档**：https://docs.task-master.dev
- 💬 **Discord 社区**：https://discord.gg/taskmasterai
- 🐛 **问题反馈**：https://github.com/chengjon/taskmaster-pro/issues
- ⭐ **GitHub**：https://github.com/chengjon/taskmaster-pro

### 快速链接

- [配置指南](https://docs.task-master.dev/configuration)
- [命令参考](https://docs.task-master.dev/command-reference)
- [最佳实践](https://docs.task-master.dev/best-practices)
- [TDD 工作流](https://docs.task-master.dev/tdd-workflow)
- [MCP 集成](https://docs.task-master.dev/getting-started/quick-start/installation)

## 贡献

我们欢迎贡献！请查看我们的 [贡献指南](https://docs.task-master.dev/getting-started/contribute)。

## 许可证

Task Master Pro 使用 MIT License with Commons Clause 许可。

**允许：**
- ✅ 用于任何目的（个人、商业、学术）
- ✅ 修改代码
- ✅ 分发副本
- ✅ 创建并销售使用 Task Master Pro 构建的产品

**不允许：**
- ❌ 销售 Task Master Pro 本身
- ❌ 提供 Task Master Pro 作为托管服务
- ❌ 基于 Task Master Pro 创建竞争产品

查看 [LICENSE](LICENSE) 文件了解完整许可证文本。

---

**由 [@eyaltoledano](https://x.com/eyaltoledano) 和 [@RalphEcom](https://x.com/RalphEcom) 创建**

⭐ 如果这个项目对你有帮助，请在 GitHub 上给我们一个 star！
