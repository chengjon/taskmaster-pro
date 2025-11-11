# Git 分支策略

## 分支概述

Task Master Pro 使用以下分支结构来管理项目演变：

### 主要分支

#### `main` (官方默认分支) ⭐
- **用途**: Task Master Pro 全新项目的官方起点
- **状态**: 生产就绪
- **描述**:
  - 从第 0a9f9565 次提交开始的全新独立项目
  - 包含清理后的代码库（移除旧项目信息）
  - 采用新的文档结构和配置
  - 适合新用户和新项目使用

**关键特征**:
- ✅ 全新的项目标识
- ✅ 清理的 README（移除原始项目信息）
- ✅ 组织化的文档结构
- ✅ 现代化的开发环境配置
- ✅ 独立的提交历史起点

#### `next`
- **用途**: 原始 Task Master AI 项目的开发分支
- **状态**: 活跃开发
- **描述**: 包含原始项目的完整历史和所有贡献者

**用途**: 仅当需要参考原始项目实现时使用

---

## 分支分离事件

### 时间线

| 日期 | 提交 | 事件 |
|------|------|------|
| 2025-11-11 | 0a9f9565 | Task Master Pro 作为独立项目创建 |
| 2025-11-11 | a0fc6ef9 | 文档重组和 README 清理 |
| 2025-11-11 | 6b3d4525 | 添加 todo-hook-manager 支持 |
| 2025-11-11 | 883c86cf | 优化 .gitignore 和 VS Code 配置 |

### 分支分化点

```
ac4328ae (feat: Add proxy support for AI providers)
  |
  +-- main (0a9f9565 onwards)
  |   └── 官方新项目分支
  |       ├── a0fc6ef9 文档重组
  |       ├── 6b3d4525 Hook 支持
  |       └── 883c86cf 配置优化
  |
  +-- next (e108f431)
      └── 原始项目继续开发
          └── 包含额外的功能和修复
```

---

## 何时使用哪个分支

### 使用 `main` 分支当:
- ✅ 启动新的 Task Master Pro 项目
- ✅ 查看干净的、无历史包袱的代码
- ✅ 按照 CLAUDE.md 中的现代最佳实践工作
- ✅ 需要独立的项目标识和版本控制

### 使用 `next` 分支当:
- 需要参考原始 Task Master AI 的实现
- 要合并原始项目的某些功能
- 研究项目的演变历史

---

## 工作流程

### 创建新功能

对于新功能，始终基于 `main` 创建特性分支:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 合并 PR

- **目标分支**: `main`
- **来源分支**: `feature/*` 或 `fix/*`
- **要求**: 至少一个代码审查

### 版本发布

版本遵循 Semantic Versioning:
- 主版本号: 重大更改
- 次版本号: 新功能
- 修订号: 错误修复

---

## 常见问题

### Q: 为什么有两个 main 分支？
A: `main` 和 `next` 不是重复的。`main` 是 Task Master Pro 的全新独立项目，而 `next` 保留了原始项目的历史。

### Q: 我应该使用哪个分支作为基础？
A: **使用 `main`**。它是官方的默认分支，也是 GitHub 显示的首选分支。

### Q: 原始项目在哪里？
A: 原始项目的完整历史仍在 `next` 分支中，可以参考但不应该作为新开发的基础。

### Q: 我可以删除 `next` 分支吗？
A: 不建议。保留它以维护原始项目的历史记录和参考。

---

## 分支管理

### 保护规则

**main 分支受保护**:
- 需要 Pull Request 审查
- CI/CD 检查必须通过
- 不允许强制推送

### 分支清理

定期清理过期的特性分支:

```bash
git branch -d feature/completed-feature
git push origin --delete feature/completed-feature
```

---

## 参考

- [CLAUDE.md](CLAUDE.md) - Claude Code 集成指南
- [FILE_ORGANIZATION_RULES.md](standards/FILE_ORGANIZATION_RULES.md) - 文件组织规则
- [贡献指南](guides/CONTRIBUTING.md) - 如何贡献

---

**最后更新**: 2025-11-11
**维护者**: Project Team
**状态**: ✅ 生效中
