# Task Master Pro - GitHub 更新手动指南

> ⚠️ 本文档用于当 GitHub 显示过时内容时的故障排除

## 📊 当前状态（本地）

```bash
# 查看本地状态
git status
git log --oneline -5

# 预期输出：
# - 当前分支: main
# - 最新提交: 2846c8ae (docs: add branch strategy documentation and update README)
# - 状态: "Your branch is up to date with 'origin/main'"
```

---

## 🔄 如果 GitHub 显示旧内容

### 问题 1: GitHub 缓存过期

**症状**: GitHub 网页显示的文件或提交不是最新的

**解决方案**:

```bash
# Step 1: 刷新本地的远程引用
cd /opt/claude/taskmaster-pro
git fetch origin

# Step 2: 验证远程是否已更新
git log origin/main --oneline -5

# Step 3: 清空浏览器缓存
# Windows/Linux: Ctrl + Shift + Delete
# Mac: Cmd + Shift + Delete

# Step 4: 重新访问 GitHub
# https://github.com/chengjon/taskmaster-pro
```

### 问题 2: GitHub 默认分支设置为 next

**症状**: GitHub 主页显示 next 分支内容，不是 main

**命令行解决**:

```bash
cd /opt/claude/taskmaster-pro

# 强制推送 main 分支
git push origin main --force-with-lease

# 等待 1-2 分钟
# 清空浏览器缓存（Ctrl+Shift+Delete）
# 重新访问 GitHub
```

**网页界面解决**:

1. 打开: https://github.com/chengjon/taskmaster-pro/settings/branches
2. 在 "Default branch" 部分
3. 点击下拉菜单选择 "main"
4. 点击 "Update" 确认

---

## ✅ 验证步骤

运行这些命令确保一切正常:

```bash
cd /opt/claude/taskmaster-pro

# 1. 检查本地状态
git status
# 应该显示: "Your branch is up to date with 'origin/main'"

# 2. 查看本地最新提交
git log --oneline -5
# 应该在最上面看到: 2846c8ae

# 3. 查看远程最新提交
git log origin/main --oneline -5
# 应该与本地相同

# 4. 检查远程地址
git remote -v
# 应该显示: git@github.com:chengjon/taskmaster-pro.git
```

在 GitHub 网页应该看到:
- ✅ main 分支是默认分支
- ✅ 最新提交: 2846c8ae
- ✅ README.md 显示清理后的内容
- ✅ docs/BRANCHES.md 文件存在
- ✅ agents/todo-hook-manager.js 文件存在

---

## 🚀 完整清单（按顺序执行）

```bash
# 进入项目目录
cd /opt/claude/taskmaster-pro

# Step 1: 刷新远程信息
git fetch origin

# Step 2: 显示远程状态
git log origin/main --oneline -5

# Step 3: 如果需要，强制推送
git push origin main --force-with-lease

# Step 4: 等待 1-2 分钟让 GitHub 处理

# Step 5: 清空浏览器缓存
# Ctrl+Shift+Delete (Windows/Linux)
# Cmd+Shift+Delete (Mac)

# Step 6: 访问 GitHub
# https://github.com/chengjon/taskmaster-pro

# Step 7: 确保 main 是默认分支
# Settings > Branches > Default branch = main

# Step 8: 刷新浏览器 (F5 或 Cmd+R)
```

---

## 📋 最后的检查清单

- [ ] 本地显示最新提交 2846c8ae
- [ ] `git status` 显示 "up to date"
- [ ] `git remote -v` 显示正确的 URL
- [ ] 浏览器缓存已清空
- [ ] GitHub 页面已刷新
- [ ] main 是默认分支
- [ ] README.md 显示新的项目信息

---

## 📚 相关文档

- [BRANCHES.md](docs/BRANCHES.md) - 分支策略
- [CLAUDE.md](CLAUDE.md) - Claude Code 集成
- [README.md](README.md) - 项目主文档

---

**最后更新**: 2025-11-11
**状态**: ✅ 所有更改已同步
**问题**: 如果 GitHub 显示过时内容，使用本指南中的命令
