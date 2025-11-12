# Task Master Pro - 快速参考指南

本指南提供了Phase 2和Phase 3最新功能的快速参考。

## 目录

- [Python SDK 快速参考](#python-sdk-快速参考)
- [OpenAPI/Swagger 快速参考](#openapiswagger-快速参考)
- [开发者常见任务](#开发者常见任务)
- [故障排除](#故障排除)

---

## Python SDK 快速参考

### 安装

```bash
pip install tm-python-sdk
```

### 基础用法

#### 初始化客户端

```python
from tm_sdk import TaskClient

# 异步模式
async with TaskClient(
    base_url="http://localhost:3000/api/v1",
    token="your-jwt-token"
) as client:
    # 使用client
    pass

# 同步模式
client = TaskClient(
    base_url="http://localhost:3000/api/v1",
    token="your-jwt-token"
)
```

### 任务操作

#### 创建任务

```python
from tm_sdk.models import CreateTaskRequest

task = await client.create_task(
    CreateTaskRequest(
        title="实现用户认证",
        description="使用JWT实现用户认证系统",
        priority="high",
        status="pending"
    )
)
print(f"任务创建成功: {task.id}")
```

#### 列出任务

```python
# 获取所有待处理任务
tasks = await client.list_tasks(status="pending")

# 获取进行中的任务，限制10条
tasks = await client.list_tasks(
    status="in-progress",
    limit=10
)

# 获取高优先级任务
tasks = await client.list_tasks(priority="high")
```

#### 获取单个任务

```python
task = await client.get_task("task-123")
print(f"任务标题: {task.title}")
print(f"状态: {task.status}")
print(f"优先级: {task.priority}")
```

#### 更新任务

```python
from tm_sdk.models import UpdateTaskRequest

updated_task = await client.update_task(
    "task-123",
    UpdateTaskRequest(
        title="更新的标题",
        status="in-progress",
        priority="medium"
    )
)
```

#### 删除任务

```python
await client.delete_task("task-123")
print("任务已删除")
```

### 批量操作

#### 批量创建任务

```python
tasks = await client.batch_create([
    CreateTaskRequest(title="任务1", priority="high"),
    CreateTaskRequest(title="任务2", priority="medium"),
    CreateTaskRequest(title="任务3", priority="low")
])
print(f"创建了 {len(tasks)} 个任务")
```

#### 批量更新任务

```python
updated_tasks = await client.batch_update([
    UpdateTaskRequest(id="task-1", status="done"),
    UpdateTaskRequest(id="task-2", status="done"),
    UpdateTaskRequest(id="task-3", status="done")
])
```

#### 批量删除任务

```python
deleted_tasks = await client.batch_delete(["task-1", "task-2", "task-3"])
```

### 子任务操作

#### 获取子任务

```python
subtasks = await client.get_subtasks("task-123")
for subtask in subtasks:
    print(f"- {subtask.title} ({subtask.status})")
```

#### 创建子任务

```python
subtask = await client.create_subtask(
    "task-123",
    CreateTaskRequest(
        title="实现登录功能",
        description="使用JWT实现登录流程"
    )
)
```

### 缓存与性能

```python
# SDK自动缓存GET请求（5分钟TTL）
# 对同一端点的多个请求会使用缓存，提高性能

# 首次请求：从API获取
tasks1 = await client.list_tasks()  # API调用

# 第二次请求（2秒内）：从缓存返回
tasks2 = await client.list_tasks()  # 缓存命中，无API调用

# 修改操作（POST/PUT/DELETE）自动清除相关缓存
await client.create_task(...)  # 自动清除list_tasks缓存
```

### 错误处理

```python
from tm_sdk.exceptions import (
    TaskNotFoundError,
    ValidationError,
    AuthenticationError
)

try:
    task = await client.get_task("non-existent")
except TaskNotFoundError:
    print("任务不存在")
except ValidationError as e:
    print(f"验证错误: {e}")
except AuthenticationError:
    print("认证失败，请检查token")
```

### 速率限制

SDK自动处理速率限制，使用指数退避算法：

```python
# 超过速率限制时，SDK会自动重试
# 重试策略：1秒、2秒、4秒、8秒...
# 最多重试5次

try:
    tasks = await client.list_tasks()
except RateLimitError:
    print("即使在重试后仍然超过速率限制")
```

---

## OpenAPI/Swagger 快速参考

### 启动API服务

```bash
cd apps/api
npm install
npm run dev
```

### 访问Swagger UI

打开浏览器访问：
```
http://localhost:3000/api/v1/docs
```

### 获取API规范

#### JSON格式

```bash
curl -s http://localhost:3000/api/v1/docs/spec.json | jq .
```

#### YAML格式

```bash
curl -s http://localhost:3000/api/v1/docs/spec.yaml
```

#### 使用工具解析

```bash
# 使用openapi-generator生成客户端代码
openapi-generator-cli generate \
  -i http://localhost:3000/api/v1/docs/spec.json \
  -g python \
  -o ./generated-client
```

### API端点快速查表

#### 健康检查

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/health` | 应用状态检查 |
| GET | `/api/v1/health/ready` | 就绪性探针 |
| GET | `/api/v1/health/live` | 活性探针 |

#### 任务管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/tasks` | 列出所有任务 |
| POST | `/api/v1/tasks` | 创建新任务 |
| GET | `/api/v1/tasks/{id}` | 获取单个任务 |
| PATCH | `/api/v1/tasks/{id}` | 更新任务 |
| DELETE | `/api/v1/tasks/{id}` | 删除任务 |

#### 批量操作

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/v1/tasks/batch/create` | 批量创建 |
| PATCH | `/api/v1/tasks/batch/update` | 批量更新 |
| DELETE | `/api/v1/tasks/batch/delete` | 批量删除 |

#### 子任务

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/tasks/{id}/subtasks` | 列出子任务 |
| POST | `/api/v1/tasks/{id}/subtasks` | 创建子任务 |

### cURL 示例

#### 列出任务

```bash
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/tasks?status=pending&limit=10"
```

#### 创建任务

```bash
TOKEN="your-jwt-token"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新任务",
    "priority": "high",
    "status": "pending"
  }' \
  http://localhost:3000/api/v1/tasks
```

#### 更新任务

```bash
TOKEN="your-jwt-token"
TASK_ID="task-123"
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}' \
  "http://localhost:3000/api/v1/tasks/$TASK_ID"
```

#### 删除任务

```bash
TOKEN="your-jwt-token"
TASK_ID="task-123"
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/tasks/$TASK_ID"
```

### JavaScript 示例

#### 使用 Fetch API

```javascript
const token = "your-jwt-token";
const baseURL = "http://localhost:3000/api/v1";

// 列出任务
const response = await fetch(
  `${baseURL}/tasks?status=pending`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const data = await response.json();

// 创建任务
const createResponse = await fetch(
  `${baseURL}/tasks`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "新任务",
      priority: "high"
    })
  }
);
```

#### 使用 Axios

```javascript
import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:3000/api/v1",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// 列出任务
const tasks = await client.get("/tasks", {
  params: { status: "pending" }
});

// 创建任务
const newTask = await client.post("/tasks", {
  title: "新任务",
  priority: "high"
});
```

### Python 示例

#### 使用 Requests

```python
import requests

token = "your-jwt-token"
base_url = "http://localhost:3000/api/v1"
headers = {"Authorization": f"Bearer {token}"}

# 列出任务
response = requests.get(
    f"{base_url}/tasks",
    headers=headers,
    params={"status": "pending"}
)
tasks = response.json()

# 创建任务
response = requests.post(
    f"{base_url}/tasks",
    headers=headers,
    json={
        "title": "新任务",
        "priority": "high"
    }
)
new_task = response.json()
```

---

## 开发者常见任务

### 任务1：获取所有待处理任务

```python
# 使用Python SDK
from tm_sdk import TaskClient

async with TaskClient(base_url="http://localhost:3000/api/v1") as client:
    pending_tasks = await client.list_tasks(status="pending")
    for task in pending_tasks:
        print(f"- {task.title} (优先级: {task.priority})")
```

```bash
# 使用cURL
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/tasks?status=pending"
```

### 任务2：将任务标记为完成

```python
from tm_sdk.models import UpdateTaskRequest

# 使用Python SDK
async with TaskClient(base_url="http://localhost:3000/api/v1") as client:
    updated = await client.update_task(
        "task-123",
        UpdateTaskRequest(status="done")
    )
    print(f"任务已更新: {updated.status}")
```

```bash
# 使用cURL
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}' \
  "http://localhost:3000/api/v1/tasks/task-123"
```

### 任务3：创建包含子任务的任务

```python
# 使用Python SDK
async with TaskClient(base_url="http://localhost:3000/api/v1") as client:
    # 创建主任务
    parent_task = await client.create_task(
        CreateTaskRequest(title="项目开发")
    )

    # 创建子任务
    subtask = await client.create_subtask(
        parent_task.id,
        CreateTaskRequest(title="需求分析")
    )

    print(f"主任务: {parent_task.id}")
    print(f"子任务: {subtask.id}")
```

### 任务4：批量更新任务状态

```python
from tm_sdk.models import UpdateTaskRequest

# 使用Python SDK
async with TaskClient(base_url="http://localhost:3000/api/v1") as client:
    updated = await client.batch_update([
        UpdateTaskRequest(id="task-1", status="done"),
        UpdateTaskRequest(id="task-2", status="done"),
        UpdateTaskRequest(id="task-3", status="in-progress")
    ])
    print(f"更新了 {len(updated)} 个任务")
```

### 任务5：集成到现有项目

```python
# 项目中使用Task Master API
import asyncio
from tm_sdk import TaskClient
from tm_sdk.models import CreateTaskRequest

async def sync_tasks():
    """与Task Master同步任务"""
    async with TaskClient(
        base_url="http://localhost:3000/api/v1",
        token=os.getenv("TASK_MASTER_TOKEN")
    ) as client:
        # 获取待处理任务
        tasks = await client.list_tasks(status="pending")

        # 处理任务...
        for task in tasks:
            print(f"处理: {task.title}")
            # 你的业务逻辑

            # 标记为完成
            await client.update_task(
                task.id,
                UpdateTaskRequest(status="done")
            )

# 运行
asyncio.run(sync_tasks())
```

---

## 故障排除

### 问题：401 Unauthorized

**原因**: JWT令牌无效或过期

**解决方案**:
```python
# 确保token有效
client = TaskClient(
    base_url="http://localhost:3000/api/v1",
    token="valid-jwt-token"
)

# 或者SDK会自动刷新（如果配置了刷新密钥）
```

### 问题：429 Too Many Requests

**原因**: 超过API速率限制

**解决方案**:
```python
# SDK自动处理，会自动重试
# 如果仍然失败，请稍候几秒钟后重试
import asyncio

try:
    tasks = await client.list_tasks()
except Exception as e:
    print(f"速率限制，等待重试...")
    await asyncio.sleep(5)
    tasks = await client.list_tasks()  # 重试
```

### 问题：404 Not Found

**原因**: 任务不存在

**解决方案**:
```python
from tm_sdk.exceptions import TaskNotFoundError

try:
    task = await client.get_task("non-existent-id")
except TaskNotFoundError:
    print("任务不存在，请检查任务ID")
```

### 问题：Swagger UI 无法加载

**原因**: API服务未运行或OpenAPI规范文件缺失

**解决方案**:
```bash
# 确保API服务在运行
cd apps/api
npm run dev

# 检查openapi.yaml文件存在
ls -la apps/api/openapi.yaml

# 验证中间件已启用
grep "setupSwaggerUI" apps/api/src/app.ts
```

### 问题：Python SDK 导入错误

**原因**: SDK未正确安装

**解决方案**:
```bash
# 重新安装SDK
pip uninstall tm-python-sdk -y
pip install tm-python-sdk

# 或从源代码安装
pip install -e packages/tm-python-sdk/
```

---

## 更多资源

- 📖 [完整API文档](../apps/api/API_DOCUMENTATION.md)
- 🐍 [Python SDK完整文档](../packages/tm-python-sdk/README.md)
- 📚 [阶段优化总结](./PHASE-OPTIMIZATION-SUMMARY.md)
- 🔗 [OpenAPI规范](../apps/api/openapi.yaml)

---

**最后更新**: 2025-11-12
