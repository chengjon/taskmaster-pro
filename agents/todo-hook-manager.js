#!/usr/bin/env node

/**
 * TODO Hook Manager
 * TODO Hook管理器 - 集成Claude Code Hooks，实现任务自动化流程
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class TodoHookManager {
    constructor() {
        this.todoFilePath = 'TODO.md';
        this.configPath = '.claude/hooks-config.json';
        this.statusPath = '.claude/todo-status.json';
        this.logPath = '.claude/todo-hook.log';
    }

    async initialize() {
        await this.ensureDirectories();
        await this.loadConfiguration();
        await this.setupHooks();
    }

    async ensureDirectories() {
        const claudeDir = '.claude';
        try {
            await fs.mkdir(claudeDir, { recursive: true });
        } catch (error) {
            // Directory already exists
        }
    }

    async loadConfiguration() {
        try {
            const configContent = await fs.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(configContent);
        } catch (error) {
            // 如果配置文件不存在，创建默认配置
            this.config = this.createDefaultConfig();
            await this.saveConfiguration();
        }
    }

    createDefaultConfig() {
        return {
            hooks: {
                PostToolUse: [
                    {
                        matcher: "Edit|MultiEdit|Write",
                        hooks: [
                            {
                                type: "command",
                                command: "node agents/todo-hook-manager.js handle-file-change"
                            }
                        ]
                    }
                ],
                "Subagent Stop": [
                    {
                        matcher: "*",
                        hooks: [
                            {
                                type: "command",
                                command: "node agents/todo-hook-manager.js handle-task-complete"
                            }
                        ]
                    }
                ],
                Notification: [
                    {
                        matcher: "",
                        hooks: [
                            {
                                type: "command",
                                command: "node agents/todo-hook-manager.js handle-notification"
                            }
                        ]
                    }
                ]
            },
            settings: {
                auto_trigger_next_task: true,
                update_progress_stats: true,
                log_all_activities: true,
                notification_enabled: true
            }
        };
    }

    async saveConfiguration() {
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
        console.log(`✅ Hook配置已保存: ${this.configPath}`);
    }

    async setupHooks() {
        // 检查Claude Code是否支持hooks
        try {
            const claudeConfigPath = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'settings.json');
            let claudeConfig = {};

            try {
                const claudeConfigContent = await fs.readFile(claudeConfigPath, 'utf-8');
                claudeConfig = JSON.parse(claudeConfigContent);
            } catch (error) {
                console.log('创建新的Claude配置文件');
            }

            // 合并hooks配置
            claudeConfig.hooks = { ...claudeConfig.hooks, ...this.config.hooks };

            await fs.writeFile(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
            console.log('✅ Claude Code Hooks配置已更新');

        } catch (error) {
            console.warn('⚠️  无法自动配置Claude Code Hooks:', error.message);
            console.log('请手动将以下配置添加到 ~/.claude/settings.json:');
            console.log(JSON.stringify(this.config.hooks, null, 2));
        }
    }

    async handleFileChange() {
        try {
            const timestamp = new Date().toISOString();
            await this.log(`📝 [${timestamp}] 文件变更检测到，检查TODO状态...`);

            // 获取hook上下文信息
            const hookData = await this.getHookContext();

            if (hookData && hookData.tool_input && hookData.tool_input.file_path) {
                const filePath = hookData.tool_input.file_path;
                await this.log(`   文件: ${filePath}`);

                // 如果修改的是TODO.md文件，更新统计信息
                if (filePath.endsWith('TODO.md')) {
                    await this.updateTodoStats();
                }

                // 如果修改的是任务相关文件，检查是否需要更新任务状态
                if (this.isTaskRelatedFile(filePath)) {
                    await this.checkTaskCompletion(filePath);
                }
            }

        } catch (error) {
            await this.log(`❌ 处理文件变更失败: ${error.message}`);
        }
    }

    async handleTaskComplete() {
        try {
            const timestamp = new Date().toISOString();
            await this.log(`✅ [${timestamp}] 子代理任务完成，更新TODO状态...`);

            // 获取hook上下文信息
            const hookData = await this.getHookContext();

            if (hookData && hookData.agent_name) {
                const agentName = hookData.agent_name;
                await this.log(`   完成代理: ${agentName}`);

                // 查找并标记该代理的任务为完成
                await this.markAgentTaskCompleted(agentName);

                // 更新统计信息
                await this.updateTodoStats();

                // 如果启用自动触发，启动下一个任务
                if (this.config.settings.auto_trigger_next_task) {
                    await this.triggerNextTask();
                }
            }

        } catch (error) {
            await this.log(`❌ 处理任务完成失败: ${error.message}`);
        }
    }

    async handleNotification() {
        try {
            const timestamp = new Date().toISOString();

            if (this.config.settings.notification_enabled) {
                await this.log(`🔔 [${timestamp}] 收到通知，发送进度更新...`);

                const hookData = await this.getHookContext();
                if (hookData && hookData.message) {
                    await this.sendProgressNotification(hookData.message);
                }
            }

        } catch (error) {
            await this.log(`❌ 处理通知失败: ${error.message}`);
        }
    }

    async getHookContext() {
        try {
            // 从stdin读取hook数据
            const stdinData = await this.readStdin();
            if (stdinData) {
                return JSON.parse(stdinData);
            }
        } catch (error) {
            await this.log(`⚠️  无法解析hook上下文: ${error.message}`);
        }
        return null;
    }

    async readStdin() {
        return new Promise((resolve) => {
            let data = '';

            if (process.stdin.isTTY) {
                resolve(''); // 没有stdin数据
                return;
            }

            process.stdin.setEncoding('utf8');

            process.stdin.on('data', (chunk) => {
                data += chunk;
            });

            process.stdin.on('end', () => {
                resolve(data.trim());
            });

            // 超时处理
            setTimeout(() => {
                resolve(data.trim());
            }, 1000);
        });
    }

    isTaskRelatedFile(filePath) {
        const taskRelatedPatterns = [
            /\.js$/,
            /\.ts$/,
            /\.py$/,
            /\.md$/,
            /\.json$/,
            /components\//,
            /src\//,
            /lib\//,
            /utils\//
        ];

        return taskRelatedPatterns.some(pattern => pattern.test(filePath));
    }

    async checkTaskCompletion(filePath) {
        try {
            // 基于文件路径推断可能完成的任务
            const todoContent = await this.readTodoFile();
            const lines = todoContent.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const taskMatch = line.match(/- \[ \] \*\*Task ([^:]+):\*\* (.+)/);

                if (taskMatch) {
                    const taskId = taskMatch[1];
                    const taskDesc = taskMatch[2];

                    // 检查任务描述是否与文件路径相关
                    if (this.isTaskRelatedToFile(taskDesc, filePath)) {
                        await this.log(`   检测到可能完成的任务: ${taskId}`);
                        // 这里可以添加更精确的完成检测逻辑
                        // 例如检查文件是否包含特定的完成标记
                        const isCompleted = await this.checkFileCompletionMarkers(filePath);
                        if (isCompleted) {
                            await this.markTaskCompleted(taskId);
                        }
                    }
                }
            }

        } catch (error) {
            await this.log(`❌ 检查任务完成状态失败: ${error.message}`);
        }
    }

    isTaskRelatedToFile(taskDesc, filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const lowerTaskDesc = taskDesc.toLowerCase();
        const lowerFileName = fileName.toLowerCase();

        // 检查任务描述是否包含文件名相关的关键词
        return lowerTaskDesc.includes(lowerFileName) ||
            lowerTaskDesc.includes('create') && lowerFileName.includes('component') ||
            lowerTaskDesc.includes('implement') && filePath.includes('src/');
    }

    async checkFileCompletionMarkers(filePath) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');

            // 检查完成标记
            const completionMarkers = [
                '// TODO-COMPLETED',
                '# TODO-COMPLETED',
                '<!-- TODO-COMPLETED -->',
                'export default', // 对于组件文件
                'module.exports', // 对于Node.js模块
                'class ', // 对于类定义
                'function ' // 对于函数定义
            ];

            return completionMarkers.some(marker => fileContent.includes(marker));

        } catch (error) {
            return false;
        }
    }

    async markAgentTaskCompleted(agentName) {
        try {
            const todoContent = await this.readTodoFile();
            const lines = todoContent.split('\n');
            let updated = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // 查找分配给该代理的未完成任务
                if (line.includes(`🤖 **分配给**: ${agentName}`) &&
                    lines[i - 1] && lines[i - 1].includes('- [ ]')) {

                    // 标记前面的任务为完成
                    lines[i - 1] = lines[i - 1].replace('- [ ]', '- [x]');
                    updated = true;

                    const taskMatch = lines[i - 1].match(/\*\*Task ([^:]+):\*\*/);
                    if (taskMatch) {
                        await this.log(`   ✅ 任务 ${taskMatch[1]} 已标记为完成`);
                    }
                }
            }

            if (updated) {
                await this.writeTodoFile(lines.join('\n'));
                await this.log('📝 TODO文件已更新');
            }

        } catch (error) {
            await this.log(`❌ 标记代理任务完成失败: ${error.message}`);
        }
    }

    async markTaskCompleted(taskId) {
        try {
            const todoContent = await this.readTodoFile();
            const lines = todoContent.split('\n');
            let updated = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.includes(`**Task ${taskId}:**`) && line.includes('- [ ]')) {
                    lines[i] = line.replace('- [ ]', '- [x]');
                    updated = true;
                    await this.log(`   ✅ 任务 ${taskId} 已标记为完成`);
                    break;
                }
            }

            if (updated) {
                await this.writeTodoFile(lines.join('\n'));
                await this.log('📝 TODO文件已更新');
            }

        } catch (error) {
            await this.log(`❌ 标记任务完成失败: ${error.message}`);
        }
    }

    async updateTodoStats() {
        try {
            const todoContent = await this.readTodoFile();
            const stats = this.calculateTodoStats(todoContent);

            // 更新TODO.md中的统计信息
            const updatedContent = this.updateStatsInTodo(todoContent, stats);
            await this.writeTodoFile(updatedContent);

            // 保存状态到JSON文件
            await this.saveStatus(stats);

            await this.log(`📊 统计信息已更新: ${stats.completed}/${stats.total} 完成`);

        } catch (error) {
            await this.log(`❌ 更新统计信息失败: ${error.message}`);
        }
    }

    calculateTodoStats(todoContent) {
        const lines = todoContent.split('\n');
        let total = 0;
        let completed = 0;
        let inProgress = 0;
        let pending = 0;

        const currentTasks = [];
        const completedTasks = [];

        for (const line of lines) {
            if (line.match(/- \[[ x]\] \*\*Task/)) {
                total++;
                if (line.includes('- [x]')) {
                    completed++;
                    const taskMatch = line.match(/\*\*Task ([^:]+):\*\* (.+)/);
                    if (taskMatch) {
                        completedTasks.push({
                            id: taskMatch[1],
                            title: taskMatch[2].trim()
                        });
                    }
                } else {
                    // 检查是否是进行中的任务（通过后续行判断）
                    const taskMatch = line.match(/\*\*Task ([^:]+):\*\* (.+)/);
                    if (taskMatch) {
                        currentTasks.push({
                            id: taskMatch[1],
                            title: taskMatch[2].trim(),
                            status: 'pending' // 默认待开始
                        });
                    }
                }
            } else if (line.includes('🚀 进行中')) {
                inProgress++;
                // 更新最后一个任务状态为进行中
                if (currentTasks.length > 0) {
                    currentTasks[currentTasks.length - 1].status = 'in_progress';
                }
            }
        }

        pending = total - completed - inProgress;

        return {
            total,
            completed,
            inProgress,
            pending,
            completionRate: total > 0 ? (completed / total * 100).toFixed(1) : 0,
            currentTasks,
            completedTasks,
            lastUpdated: new Date().toISOString()
        };
    }

    updateStatsInTodo(todoContent, stats) {
        let updatedContent = todoContent;

        // 更新项目总览中的统计数据
        updatedContent = updatedContent.replace(
            /\| 📋 \*\*总任务数\*\* \| \d+ \|/,
            `| 📋 **总任务数** | ${stats.total} |`
        );

        updatedContent = updatedContent.replace(
            /\| ✅ \*\*已完成\*\* \| \d+ \|/,
            `| ✅ **已完成** | ${stats.completed} |`
        );

        updatedContent = updatedContent.replace(
            /\| 🚀 \*\*进行中\*\* \| \d+ \|/,
            `| 🚀 **进行中** | ${stats.inProgress} |`
        );

        updatedContent = updatedContent.replace(
            /\| ⏳ \*\*待开始\*\* \| \d+ \|/,
            `| ⏳ **待开始** | ${stats.pending} |`
        );

        updatedContent = updatedContent.replace(
            /\| 🎯 \*\*完成率\*\* \| [\d.]+% \|/,
            `| 🎯 **完成率** | ${stats.completionRate}% |`
        );

        // 更新最后更新时间
        updatedContent = updatedContent.replace(
            /\*📅 最后更新: [^*]+\*/,
            `*📅 最后更新: ${stats.lastUpdated}*`
        );

        return updatedContent;
    }

    async triggerNextTask() {
        try {
            const todoContent = await this.readTodoFile();
            const nextTask = this.findNextPendingTask(todoContent);

            if (nextTask) {
                await this.log(`🚀 触发下一个任务: ${nextTask.id} - ${nextTask.title}`);

                // 标记任务为进行中
                await this.markTaskInProgress(nextTask.id);

                // 如果有分配的代理，可以尝试自动执行
                if (nextTask.agent) {
                    await this.executeTaskWithAgent(nextTask);
                }

            } else {
                await this.log('🎉 所有任务已完成！');
            }

        } catch (error) {
            await this.log(`❌ 触发下一个任务失败: ${error.message}`);
        }
    }

    findNextPendingTask(todoContent) {
        const lines = todoContent.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const taskMatch = line.match(/- \[ \] \*\*Task ([^:]+):\*\* (.+)/);

            if (taskMatch) {
                const taskId = taskMatch[1];
                const taskTitle = taskMatch[2];
                let agent = null;

                // 查找分配的代理
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    const agentMatch = lines[j].match(/🤖 \*\*分配给\*\*: ([a-zA-Z-]+)/);
                    if (agentMatch) {
                        agent = agentMatch[1];
                        break;
                    }
                }

                return {
                    id: taskId,
                    title: taskTitle.trim(),
                    agent: agent
                };
            }
        }

        return null;
    }

    async markTaskInProgress(taskId) {
        try {
            const todoContent = await this.readTodoFile();
            const lines = todoContent.split('\n');

            // 找到任务行并在其后添加进行中状态
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.includes(`**Task ${taskId}:**`)) {
                    // 在任务详情中添加进行中状态标记
                    for (let j = i + 1; j < lines.length; j++) {
                        if (lines[j].includes('📅 **预计开始**:')) {
                            lines[j] = `  - 📅 **状态**: 🚀 进行中 (${new Date().toLocaleString()})`;
                            break;
                        }
                    }
                    break;
                }
            }

            await this.writeTodoFile(lines.join('\n'));
            await this.log(`🚀 任务 ${taskId} 已标记为进行中`);

        } catch (error) {
            await this.log(`❌ 标记任务进行中失败: ${error.message}`);
        }
    }

    async executeTaskWithAgent(task) {
        try {
            if (!task.agent) {
                await this.log(`⚠️  任务 ${task.id} 没有分配代理，跳过自动执行`);
                return;
            }

            await this.log(`🤖 尝试使用代理 ${task.agent} 执行任务 ${task.id}`);

            // 构建执行命令
            const command = `claude task ${task.agent} "Execute task ${task.id}: ${task.title}"`;

            // 异步执行命令
            setTimeout(() => {
                this.executeCommand(command, task);
            }, 1000);

        } catch (error) {
            await this.log(`❌ 自动执行任务失败: ${error.message}`);
        }
    }

    async executeCommand(command, task) {
        try {
            await this.log(`▶️  执行命令: ${command}`);

            // 在后台执行命令
            execSync(command, {
                stdio: 'inherit',
                timeout: 30 * 60 * 1000 // 30分钟超时
            });

            await this.log(`✅ 任务 ${task.id} 执行完成`);

        } catch (error) {
            await this.log(`❌ 命令执行失败: ${error.message}`);
        }
    }

    async sendProgressNotification(message) {
        try {
            const stats = await this.loadStatus();
            if (stats) {
                const notification = {
                    title: 'Claude Code - 任务进度更新',
                    message: `进度: ${stats.completed}/${stats.total} (${stats.completionRate}%)\n${message}`,
                    timestamp: new Date().toISOString()
                };

                await this.log(`🔔 发送通知: ${notification.message}`);

                // 这里可以集成实际的通知系统
                // 例如桌面通知、Slack、钉钉等
            }

        } catch (error) {
            await this.log(`❌ 发送通知失败: ${error.message}`);
        }
    }

    async readTodoFile() {
        try {
            return await fs.readFile(this.todoFilePath, 'utf-8');
        } catch (error) {
            throw new Error(`无法读取TODO文件: ${error.message}`);
        }
    }

    async writeTodoFile(content) {
        try {
            await fs.writeFile(this.todoFilePath, content, 'utf-8');
        } catch (error) {
            throw new Error(`无法写入TODO文件: ${error.message}`);
        }
    }

    async saveStatus(stats) {
        try {
            await fs.writeFile(this.statusPath, JSON.stringify(stats, null, 2));
        } catch (error) {
            await this.log(`⚠️  保存状态失败: ${error.message}`);
        }
    }

    async loadStatus() {
        try {
            const statusContent = await fs.readFile(this.statusPath, 'utf-8');
            return JSON.parse(statusContent);
        } catch (error) {
            return null;
        }
    }

    async log(message) {
        const logMessage = `${new Date().toISOString()} - ${message}\n`;

        try {
            await fs.appendFile(this.logPath, logMessage);
        } catch (error) {
            // 如果日志写入失败，至少输出到控制台
            console.log(message);
        }

        if (this.config?.settings?.log_all_activities) {
            console.log(message);
        }
    }
}

// CLI 接口
async function main() {
    const manager = new TodoHookManager();
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        await manager.initialize();

        switch (command) {
            case 'handle-file-change':
                await manager.handleFileChange();
                break;

            case 'handle-task-complete':
                await manager.handleTaskComplete();
                break;

            case 'handle-notification':
                await manager.handleNotification();
                break;

            case 'update-stats':
                await manager.updateTodoStats();
                break;

            case 'trigger-next':
                await manager.triggerNextTask();
                break;

            case 'status':
                const stats = await manager.loadStatus();
                if (stats) {
                    console.log('📊 TODO状态统计:');
                    console.log(`   总任务: ${stats.total}`);
                    console.log(`   已完成: ${stats.completed}`);
                    console.log(`   进行中: ${stats.inProgress}`);
                    console.log(`   待开始: ${stats.pending}`);
                    console.log(`   完成率: ${stats.completionRate}%`);
                    console.log(`   最后更新: ${stats.lastUpdated}`);
                } else {
                    console.log('ℹ️  暂无状态信息');
                }
                break;

            case 'install-hooks':
                await manager.setupHooks();
                break;

            default:
                console.log('🔧 TODO Hook管理器');
                console.log('可用命令:');
                console.log('  handle-file-change  - 处理文件变更事件');
                console.log('  handle-task-complete - 处理任务完成事件');
                console.log('  handle-notification - 处理通知事件');
                console.log('  update-stats       - 更新TODO统计信息');
                console.log('  trigger-next       - 触发下一个任务');
                console.log('  status            - 显示当前状态');
                console.log('  install-hooks     - 安装Hook配置');
        }

    } catch (error) {
        console.error('❌ Hook管理器执行失败:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TodoHookManager; 