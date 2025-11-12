# Task Master Pro (TAMP)

**AI驱动的专业任务管理系统** | 让AI助手轻松管理你的开发工作流

---

## 什么是 Task Master Pro？

Task Master Pro (TAMP) 是一个为现代AI驱动开发设计的任务管理系统。它与Claude、ChatGPT、Gemini等AI助手完美配合，帮助你：

- 🎯 **有序管理任务** - 用AI自动生成、分解和优化任务
- 🔗 **追踪依赖关系** - 清晰地管理任务间的依赖
- 📊 **分析复杂度** - AI智能评估任务复杂度
- 🚀 **加速开发** - 通过AI助手快速完成工作
- 🔄 **支持多编辑器** - Cursor、Claude Code、Windsurf、VS Code等

---

## 快速开始

### 最简单的方式：Cursor 一键安装

[![一键安装到Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=taskmaster-pro&config=eyJjb21tYW5kIjoibnB4IC15IC0tcGFja2FnZT10YXNrLW1hc3Rlci1haSB0YXNrLW1hc3Rlci1haSIsImVudiI6eyJBTlRIUk9QSUNfQVBJX0tFWSI6IllPVVJfQU5USFJPUElDX0FQSV9LRVlfSEVSRSIsIlBFUlBMRVhJVFlfQVBJX0tFWSI6IllPVVJfUEVSUExFWElUWV9BUElfS0VZX0hFUkUiLCJPUEVOQUlfQVBJX0tFWSI6IllPVVJfT1BFTkFJX0tFWV9IRVJFIiwiR09PR0xFX0FQSV9LRVkiOiJZT1VSX0dPT0dMRV9LRVlfSEVSRSIsIk1JU1RSQUxfQVBJX0tFWSI6IllPVVJfTUlTVFJBTF9LRVlfSEVSRSIsIkdST1FfQVBJX0tFWSI6IllPVVJfR1JPUV9LRVlfSEVSRSIsIk9QRU5ST1VURVJfQVBJX0tFWSI6IllPVVJfT1BFTlJPVVRFUl9LRVlfSEVSRSIsIlhBSV9BUElfS0VZIjoiWU9VUl9YQUlfS0VZX0hFUkUiLCJBWlVSRV9PUEVOQUlfQVBJX0tFWSI6IllPVVJfQVpVUkVfS0VZX0hFUkUiLCJPTExBTUFfQVBJX0tFWSI6IllPVVJfT0xMQU1BX0FQSV9LRVlfSEVSRSJ9fQ%3D%3D)

> 安装后需配置API密钥。选择一个或多个AI提供商的密钥。

### Claude Code 用户安装

```bash
claude mcp add taskmaster-pro -- npx -y taskmaster-pro
```

然后在你的AI聊天窗口说：`Initialize Task Master Pro in my project`

### 手工配置（所有编辑器）

#### 编辑器配置文件位置

| 编辑器 | 配置文件路径 | 配置键名 |
|--------|----------|---------|
| Cursor | `~/.cursor/mcp.json` | `mcpServers` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| Claude Code | `.mcp.json` (项目根目录) | `mcpServers` |
| VS Code | `.vscode/mcp.json` (项目根目录) | `servers` |

#### 配置示例（Cursor/Windsurf/Claude Code）

```json
{
  "mcpServers": {
    "taskmaster-pro": {
      "command": "npx",
      "args": ["-y", "taskmaster-pro"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here",
        "OPENAI_API_KEY": "your_key_here",
        "GOOGLE_API_KEY": "your_key_here"
      }
    }
  }
}
```

#### 配置示例（VS Code）

```json
{
  "servers": {
    "taskmaster-pro": {
      "command": "npx",
      "args": ["-y", "taskmaster-pro"],
      "type": "stdio",
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here",
        "OPENAI_API_KEY": "your_key_here",
        "GOOGLE_API_KEY": "your_key_here"
      }
    }
  }
}
```

---

## 需要什么

**至少需要以下之一的API密钥：**

- 🔹 Anthropic (Claude) - 推荐
- 🔹 OpenAI (GPT-4)
- 🔹 Google (Gemini)
- 🔹 Perplexity (研究功能 - 推荐)
- 🔹 xAI (Grok)
- 🔹 OpenRouter (多模型)
- 🔹 Mistral
- 🔹 Ollama

**不需要API密钥的方案：**

- ✨ Claude Code CLI (使用本地Claude实例)
- ✨ Codex CLI (使用ChatGPT订阅)

---

## 使用方式

### 方式1：通过AI聊天（推荐）

在编辑器的AI聊天窗口中使用自然语言：

```
初始化项目：Initialize Task Master Pro in my project

解析需求：Parse my PRD at .taskmaster/docs/prd.txt

查看任务：Show me all tasks

查看下一个任务：What's the next task?

研究信息：Research the latest best practices for JWT authentication

扩展任务：Expand task 3 into subtasks
```

### 方式2：命令行

```bash
# 全局安装
npm install -g taskmaster-pro

# 初始化项目
TAMP init

# 解析PRD生成任务
TAMP parse-prd .taskmaster/docs/prd.txt

# 列出所有任务
TAMP list

# 查看下一个任务
TAMP next

# 查看特定任务
TAMP show 1,3,5

# 设置任务状态
TAMP set-status --id=1 --status=done

# 生成任务文件
TAMP generate
```

---

## 项目结构

初始化后，你的项目会有这样的结构：

```
.taskmaster/
├── tasks/
│   ├── tasks.json          # 任务数据库
│   ├── task_1.txt          # 个别任务文件
│   └── ...
├── docs/
│   ├── prd.txt             # 产品需求文档
│   └── templates/
└── config.json             # 配置文件
```

---

## 文档和资源

### 📚 完整文档

- **[官方文档网站](https://docs.task-master.dev)** - 详细的API参考和指南
- **[阶段优化总结](docs/PHASE-OPTIMIZATION-SUMMARY.md)** - Phase 2/3 工作成果汇总

### 📖 快速参考

- **[快速参考指南](docs/QUICK-REFERENCE.md)** - SDK和API使用速查表
- **[性能优化方案](docs/PERFORMANCE-OPTIMIZATION-PLAN.md)** - 完整的性能优化策略
- **[中文快速入门](docs/zh-cn/GETTING-STARTED-CN.md)** - 完整的中文教程
- **[Claude Code集成](docs/zh-cn/CLAUDE-CN.md)** - Claude Code专项指南
- [API文档](apps/api/API_DOCUMENTATION.md) - 完整的REST API参考
- [Python SDK](packages/tm-python-sdk/README.md) - Python开发者指南
- [命令参考](docs/command-reference.md) - 所有可用命令
- [配置指南](docs/configuration.md) - 环境变量配置
- [任务结构](docs/task-structure.md) - 理解任务格式
- [使用示例](docs/examples.md) - 常见使用场景
- [迁移指南](docs/migration-guide.md) - 项目升级指南
- [贡献指南](docs/guides/CONTRIBUTING.md) - 如何贡献代码

### 🏗️ 架构文档

- [分支策略](docs/BRANCHES.md) - 项目分支说明
- [项目演进](docs/architecture/PROJECT-EVOLUTION.md) - 功能发展历史

---

## 最新功能

### 🐍 Python SDK (Phase 2)

完整的Python SDK，使Python开发者能够轻松集成Task Master API。

**功能特性：**
- ✅ 完整的CRUD操作 (创建、读取、更新、删除)
- ✅ 批量操作支持 (批量创建、更新、删除)
- ✅ 自动JWT认证与刷新
- ✅ 智能缓存（5分钟TTL）
- ✅ 速率限制处理（指数退避）
- ✅ 100%类型提示与IDE补全
- ✅ 异步/同步双模式

**快速开始：**
```python
from tm_sdk import TaskClient

async with TaskClient(base_url="http://localhost:3000/api/v1") as client:
    # 创建任务
    task = await client.create_task({
        "title": "实现用户认证",
        "priority": "high"
    })

    # 列出任务
    tasks = await client.list_tasks(status="in-progress")

    # 更新任务状态
    await client.update_task("task-1", {"status": "done"})
```

📖 [Python SDK 完整文档](packages/tm-python-sdk/README.md)

### 📚 OpenAPI/Swagger 文档 (Phase 3)

交互式API文档，开发者可以直观地浏览、测试所有API端点。

**功能特性：**
- ✅ 完整的OpenAPI 3.0规范 (1000+ 行)
- ✅ 交互式Swagger UI界面
- ✅ 所有11个端点的详细文档
- ✅ 请求/响应示例（JavaScript、Python、cURL）
- ✅ 内置尝试功能（Try It Out）
- ✅ 多格式规范下载 (JSON/YAML)
- ✅ 企业级文档（700+ 行）

**访问方式：**
```bash
# 启动API服务
cd apps/api && npm run dev

# 在浏览器中打开Swagger UI
http://localhost:3000/api/v1/docs
```

**获取规范：**
```bash
# 获取JSON格式
curl http://localhost:3000/api/v1/docs/spec.json

# 获取YAML格式
curl http://localhost:3000/api/v1/docs/spec.yaml
```

📖 [API 完整文档](apps/api/API_DOCUMENTATION.md)

### ⚡ 性能特性

Task Master Pro 内置多项性能优化，确保高效的API操作：

**缓存机制**
- ✅ 智能内存缓存 (5分钟TTL)
- ✅ ETag支持 (304 Not Modified)
- ✅ 自动缓存失效
- ✅ 缓存统计与监控

**速率限制**
- ✅ 多层限制策略 (全局/读/写/认证)
- ✅ Token Bucket算法
- ✅ 用户ID和IP双重识别
- ✅ 灵活的限流配置

**性能指标**
- 缓存命中: **>10,000 req/s**
- 缓存未中: **>1,000 req/s**
- 响应时间 P95: **<100ms**
- 内存占用: **<500MB**

📊 [完整性能优化方案](docs/PERFORMANCE-OPTIMIZATION-PLAN.md)

**性能基准测试**
```bash
# 运行性能基准测试
node scripts/performance-benchmark.js --url http://localhost:3000 --token <JWT>

# 测试结果示例
# 吞吐量: ⭐⭐⭐⭐⭐ 优秀 (8234 req/s)
# 响应时间: ⭐⭐⭐⭐⭐ 优秀 (8.23ms)
```

---

## 优化MCP工具加载

如果想减少token使用，可以配置工具加载模式：

| 模式 | 工具数 | Token消耗 | 适用场景 |
|------|-------|---------|---------|
| `all` (默认) | 36 | ~21,000 | 完整功能集 |
| `standard` | 15 | ~10,000 | 常见操作 |
| `core` | 7 | ~5,000 | 日常开发 |
| 自定义 | 可变 | 可变 | 指定工具 |

### 配置方式

在MCP配置的 `env` 部分添加：

```json
"env": {
  "TASK_MASTER_TOOLS": "core",
  // 其他配置...
}
```

或通过Claude Code CLI：

```bash
claude mcp add taskmaster-pro \
  --env TASK_MASTER_TOOLS="core" \
  -- npx -y taskmaster-pro@latest
```

---

## 常见问题

### TAMP init 没有响应？

直接用Node运行：

```bash
node node_modules/taskmaster-pro/scripts/init.js
```

或克隆项目运行：

```bash
git clone https://github.com/chengjon/taskmaster-pro.git
cd taskmaster-pro
node scripts/init.js
```

### 如何使用Claude模型而不需要API密钥？

使用Claude Code CLI：

```bash
claude mcp add taskmaster-pro -- npx -y taskmaster-pro
```

然后在聊天中配置模型：

```
Change the main model to claude-code/sonnet
```

### 需要PRD吗？

强烈推荐！详细的PRD会生成更好的任务。

对于简单的任务，你也可以直接问AI：`Can you help me implement [功能描述]?`

---

## 许可证

Task Master Pro 采用 **MIT License + Commons Clause** 许可证。

✅ **允许：**

- 个人、商业、学术用途
- 修改代码
- 分发拷贝
- 用于构建商业产品

❌ **不允许：**

- 出售 Task Master Pro 本身
- 提供Task Master Pro的托管服务
- 基于Task Master Pro创建竞争产品

详见 [LICENSE](LICENSE) 和 [许可证详情](docs/licensing.md)

---

## 关于本项目

这是 **Task Master Pro (TAMP)** - 一个全新的、独立的项目，从提交 `0a9f9565` 开始的官方版本。

特点：

- ✨ 现代化代码库
- 📚 组织清晰的文档结构
- 🔄 独立的开发分支
- 🛠️ 增强的工具和配置

详见 [分支策略](docs/BRANCHES.md) 了解项目结构。

---

## 获取帮助

- 📖 查看 [官方文档](https://docs.task-master.dev)
- 💬 在编辑器AI聊天中提问
- 🐛 提交 [Issue](https://github.com/chengjon/taskmaster-pro/issues)
- 📧 查看 [贡献指南](docs/guides/CONTRIBUTING.md)

---

**Made with ❤️ for AI-driven development**
