# .gitignore 规则指南

此文档解释Task Master Pro中的`.gitignore`规则和为什么这些文件被跟踪或忽略。

---

## 📋 应该被跟踪的文件 ✅

### 文档和指南
```
✅ docs/**/*.md              # 用户文档
✅ .taskmaster/docs/**.*     # 项目文档
✅ README.md                 # 项目说明
✅ CLAUDE.md                 # Claude Code主文档
✅ CHANGELOG.md              # 版本历史
✅ LICENSE                   # 许可证
```

### 编辑器和IDE配置（团队共享）
```
✅ .claude/                  # Claude Code集成
✅ .cursor/mcp.json          # Cursor MCP配置（共享）
✅ .cursor/rules/            # Cursor规则
✅ .kiro/                    # Kiro自动化配置
✅ .vscode/settings.json     # VS Code工作区设置
✅ .vscode/extensions.json   # 推荐的扩展
✅ .vscode/launch.json       # 调试配置
✅ .vscode/tasks.json        # 任务定义
```

### 项目配置
```
✅ .github/                  # GitHub工作流和模板
✅ .changeset/               # 版本变更日志
✅ .mcp.json                 # MCP服务器配置
✅ .env.example              # 环境变量模板
✅ tsconfig.json             # TypeScript配置
✅ turbo.json                # Turborepo配置
✅ jest.config.js            # Jest配置
✅ biome.json                # Biome格式化配置
✅ tsdown.config.ts          # 构建配置
✅ package.json              # npm工作区（所有级别）
```

### 资源和模板
```
✅ assets/                   # IDE资源、示例、模板
✅ context/                  # 参考文档（可选）
✅ agents/                   # AI代理和钩子
✅ bin/                      # 脚本和二进制
```

### 源代码
```
✅ apps/                     # 所有应用代码
✅ packages/                 # 所有包代码
✅ src/                      # 根级工具库
✅ scripts/                  # 构建和开发脚本
✅ tests/                    # 测试套件
```

---

## 🚫 应该被忽略的文件 ✅

### 依赖项
```
node_modules/               # npm包（太大）
jspm_packages/             # 旧的包管理器
```

### 构建输出
```
dist/                      # esbuild输出（可重新生成）
.next/                     # Next.js构建
.nuxt/                     # Nuxt.js构建
```

### IDE缓存
```
.turbo/                    # Turborepo缓存
.jest/                     # Jest缓存
.eslintcache               # ESLint缓存
.vscode-test/              # VS Code测试临时文件
apps/extension/.vscode-test/
```

### 测试临时文件
```
coverage/                  # 测试覆盖报告
*.lcov                     # LCOV格式
tests/temp/                # 临时测试文件
tests/e2e/_runs/           # E2E测试运行
tests/e2e/log/             # 测试日志
tests/**/*.log             # 测试日志
tests/**/coverage/         # 测试覆盖
tests/**/*.db              # 测试数据库
tests/**/*.sqlite          # SQLite测试文件
tests/**/*.sqlite3         # SQLite3测试文件
```

### 环境和日志
```
.env                       # 本地API密钥（敏感）
.env.local                 # 本地环境
.env.development.local     # 开发环境
.env.test.local            # 测试环境
.env.production.local      # 生产环境
.env.test                  # 测试环境

logs/                      # 应用日志
*.log                      # 通用日志
npm-debug.log*             # npm日志
yarn-debug.log*            # yarn日志
lerna-debug.log*           # lerna日志
init-debug.log             # 初始化调试日志
dev-debug.log              # 开发调试日志
```

### 系统文件
```
.DS_Store                  # macOS系统文件
.npmrc                     # npm配置（可能有敏感信息）
```

### 其他
```
.cache                     # Parcel缓存
.node_repl_history        # Node REPL历史
*.npm                      # npm缓存
*.tgz                      # 打包文件
.yarn-integrity           # Yarn完整性检查
.idea                     # IntelliJ IDE
*.suo                     # Visual Studio
*.ntvs*                   # Visual Studio
*.njsproj                 # Visual Studio
*.sln                     # Visual Studio
*.sw?                     # Vim交换文件
apps/extension/vsix-build/ # VS Code扩展构建
```

---

## 📏 规则优先级

Git按从上到下的顺序处理`.gitignore`规则。**后面的规则可以用`!`覆盖前面的规则**。

例如：
```gitignore
# 忽略所有.log文件
*.log

# 但跟踪重要的日志
!important.log
```

---

## 🔍 当前.gitignore中的关键规则

### 1. 文档（应该跟踪）
```gitignore
# ❌ 没有忽略.md或.txt文件
# ✅ 所有文档都会被跟踪
```

### 2. 编辑器配置
```gitignore
.idea              # IntelliJ - 忽略（个人配置）
.vscode/*          # VS Code - 忽略所有...
!.vscode/settings.json    # ...除了这些共享文件
!.vscode/extensions.json
!.vscode/launch.json
!.vscode/tasks.json
```

**说明：** VS Code的设置被选择性地跟踪，以便团队共享配置

### 3. Cursor特定配置
```gitignore
# .cursor/ 未被忽略 - 完全跟踪
# 包括：
#   - .cursor/mcp.json（MCP配置）
#   - .cursor/rules/（编辑器规则）
```

### 4. Kiro配置
```gitignore
# .kiro/ 未被忽略 - 完全跟踪
# 包括：
#   - .kiro/hooks/（自动化钩子）
#   - .kiro/steering/（AI工作流规则）
```

### 5. Claude Code配置
```gitignore
# .claude/ 未被忽略 - 完全跟踪
# 包括：
#   - .claude/settings.json（工具许可）
#   - .claude/commands/（slash命令）
```

---

## 📝 最佳实践

### 1. 提交`.env.example`，忽略`.env`
```gitignore
.env                    # 本地敏感数据
.env.example            # 不要忽略 - 此文件应跟踪
```

### 2. 跟踪配置，忽略缓存
```gitignore
*.config.js             # 跟踪配置文件
.eslintcache            # 忽略缓存
```

### 3. 跟踪文档模板，忽略生成的文档
```gitignore
# 跟踪
docs/**/*.md            # 手写文档
.taskmaster/templates/  # 模板

# 忽略
.taskmaster/reports/    # 生成的报告（可选）
```

### 4. 跟踪项目配置，忽略IDE缓存
```gitignore
# 跟踪
.cursor/mcp.json        # 团队配置
.kiro/hooks/            # 团队自动化

# 忽略
.turbo/                 # 本地缓存
.jest/                  # 本地缓存
```

---

## 🔧 如何检查什么被跟踪

### 查看被Git忽略的文件
```bash
git status --ignored
```

### 检查特定文件是否被跟踪
```bash
git ls-files | grep filename
```

### 查看.gitignore规则
```bash
cat .gitignore
```

### 强制添加被忽略的文件（不推荐）
```bash
git add -f filename
```

---

## 🎯 合理性总结

| 文件/目录 | 决定 | 原因 |
|----------|------|------|
| 所有`.md`文档 | ✅ 跟踪 | 项目的一部分；必须保持同步 |
| `docs/` | ✅ 跟踪 | 用户文档 |
| `.taskmaster/docs/` | ✅ 跟踪 | 项目管理文档 |
| `.claude/` | ✅ 跟踪 | Claude Code团队配置 |
| `.cursor/rules/` | ✅ 跟踪 | Cursor IDE团队规则 |
| `.kiro/` | ✅ 跟踪 | Kiro自动化团队配置 |
| `assets/` | ✅ 跟踪 | IDE集成资源 |
| `.vscode/settings.json` | ✅ 跟踪 | 工作区共享设置 |
| `.vscode/extensions.json` | ✅ 跟踪 | 推荐的扩展 |
| `node_modules/` | 🚫 忽略 | 由package-lock.json管理 |
| `dist/` | 🚫 忽略 | 从源代码生成 |
| `.env` | 🚫 忽略 | 包含敏感的API密钥 |
| `coverage/` | 🚫 忽略 | 测试产物 |

---

*本文档应与.gitignore规则同步更新*
