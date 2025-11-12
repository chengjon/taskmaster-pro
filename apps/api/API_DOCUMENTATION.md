# Task Master API Documentation

## Overview

The Task Master API is a production-ready REST API for comprehensive task management. It provides full CRUD operations, batch processing, advanced filtering, and real-time synchronization capabilities.

**Base URL**: `http://localhost:3000/api/v1` (development)

**Documentation**: Available at `/api/v1/docs` via interactive Swagger UI

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Request/Response Format](#requestresponse-format)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Caching](#caching)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

---

## Authentication

### JWT Bearer Token

All protected endpoints require a valid JWT token in the Authorization header.

**Header Format**:
```
Authorization: Bearer <jwt_token>
```

**JWT Payload Requirements**:
```json
{
  "sub": "user-123",        // Required: User ID
  "email": "user@example.com",  // Optional
  "email_verified": true,   // Optional
  "role": "admin",          // Optional: defaults to 'user'
  "exp": 1700000000,        // Required: expiration timestamp
  "iat": 1699999000         // Issued at timestamp
}
```

**Token Algorithms Supported**:
- HS256 (HMAC with SHA-256)
- RS256 (RSA Signature with SHA-256)

**How to Obtain a Token**:
1. Authenticate with Supabase or your authentication provider
2. Extract the JWT token from the authentication response
3. Include the token in the Authorization header for all protected requests

### Public Endpoints
- `GET /health`
- `GET /health/ready`
- `GET /health/live`

---

## API Endpoints

### Health Endpoints

#### GET /health
Simple health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-11-12T10:30:00Z",
  "version": "1.0.0",
  "uptime": 12345.67
}
```

#### GET /health/ready
Kubernetes-style readiness probe.

**Response**:
```json
{
  "ready": true,
  "timestamp": "2024-11-12T10:30:00Z"
}
```

#### GET /health/live
Kubernetes-style liveness probe.

**Response**:
```json
{
  "alive": true,
  "timestamp": "2024-11-12T10:30:00Z"
}
```

---

### Task Management Endpoints

#### List Tasks
```
GET /tasks
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status (pending, in-progress, done, review, deferred, cancelled) |
| `priority` | string | - | Filter by priority (high, medium, low) |
| `tags` | string/array | - | Filter by tags (comma-separated or array) |
| `limit` | integer | 20 | Results per page (max 100) |
| `offset` | integer | 0 | Number of results to skip |
| `sortBy` | string | createdAt | Sort field (createdAt, updatedAt, dueDate, priority) |
| `sortOrder` | string | desc | Sort order (asc, desc) |

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/tasks?status=in-progress&priority=high&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task-1",
        "title": "Implement authentication",
        "description": "Set up JWT-based auth",
        "priority": "high",
        "status": "in-progress",
        "tags": ["backend", "urgent"],
        "dueDate": "2024-12-31T23:59:59Z",
        "assignedTo": "user-123",
        "subtaskCount": 3,
        "createdAt": "2024-11-01T00:00:00Z",
        "updatedAt": "2024-11-12T10:00:00Z"
      }
    ],
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

---

#### Create Task
```
POST /tasks
```

**Request Body**:
```json
{
  "title": "Implement user authentication",
  "description": "Set up JWT-based authentication with Supabase",
  "priority": "high",
  "status": "pending",
  "tags": ["backend", "auth", "urgent"],
  "dueDate": "2024-12-31T23:59:59Z",
  "assignedTo": "user-123"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "task-550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement user authentication",
    "description": "Set up JWT-based authentication with Supabase",
    "priority": "high",
    "status": "pending",
    "tags": ["backend", "auth", "urgent"],
    "dueDate": "2024-12-31T23:59:59Z",
    "assignedTo": "user-123",
    "subtaskCount": 0,
    "createdAt": "2024-11-12T10:30:00Z",
    "updatedAt": "2024-11-12T10:30:00Z"
  }
}
```

---

#### Get Task
```
GET /tasks/{id}
```

**Path Parameters**:
- `id` (required): Task ID

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "task-550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement user authentication",
    "description": "Set up JWT-based authentication with Supabase",
    "priority": "high",
    "status": "in-progress",
    "tags": ["backend", "auth"],
    "dueDate": "2024-12-31T23:59:59Z",
    "assignedTo": "user-123",
    "subtaskCount": 3,
    "createdAt": "2024-11-01T00:00:00Z",
    "updatedAt": "2024-11-12T10:00:00Z"
  }
}
```

---

#### Update Task
```
PATCH /tasks/{id}
```

**Request Body** (all fields optional):
```json
{
  "title": "Updated title",
  "priority": "medium",
  "status": "done",
  "tags": ["backend", "completed"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "task-550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated title",
    "priority": "medium",
    "status": "done",
    "updatedAt": "2024-11-12T10:45:00Z"
  }
}
```

---

#### Delete Task
```
DELETE /tasks/{id}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "task-550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Subtask Endpoints

#### Get Subtasks
```
GET /tasks/{id}/subtasks
```

**Response**:
```json
{
  "success": true,
  "data": {
    "subtasks": [
      {
        "id": "subtask-1",
        "title": "Set up JWT library",
        "status": "done",
        "parentTaskId": "task-1",
        "createdAt": "2024-11-01T00:00:00Z",
        "updatedAt": "2024-11-10T00:00:00Z"
      }
    ],
    "total": 3
  }
}
```

#### Create Subtask
```
POST /tasks/{id}/subtasks
```

**Request Body**:
```json
{
  "title": "Set up JWT verification",
  "description": "Implement JWT token verification middleware",
  "status": "pending"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "subtask-550e8400-e29b-41d4-a716-446655440001",
    "title": "Set up JWT verification",
    "description": "Implement JWT token verification middleware",
    "status": "pending",
    "parentTaskId": "task-1",
    "createdAt": "2024-11-12T10:30:00Z",
    "updatedAt": "2024-11-12T10:30:00Z"
  }
}
```

---

### Batch Operations

#### Batch Create Tasks
```
POST /tasks/batch/create
```

**Request Body**:
```json
{
  "tasks": [
    {
      "title": "Task 1",
      "priority": "high",
      "status": "pending"
    },
    {
      "title": "Task 2",
      "priority": "medium",
      "status": "pending"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "created": 2,
    "tasks": [
      { "id": "task-1", "title": "Task 1", ... },
      { "id": "task-2", "title": "Task 2", ... }
    ],
    "errors": []
  }
}
```

---

#### Batch Update Tasks
```
PATCH /tasks/batch/update
```

**Request Body**:
```json
{
  "updates": [
    {
      "id": "task-1",
      "changes": { "status": "done" }
    },
    {
      "id": "task-2",
      "changes": { "priority": "high", "status": "in-progress" }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "tasks": [...]
  }
}
```

---

#### Batch Delete Tasks
```
DELETE /tasks/batch/delete
```

**Request Body**:
```json
{
  "ids": ["task-1", "task-2", "task-3"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deleted": 3
  }
}
```

---

## Request/Response Format

### Request Format

All API requests use JSON format with UTF-8 encoding.

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Response Format

All API responses follow a consistent format:

**Success Response**:
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    // Additional error context
  },
  "requestId": "req-1234567890-abcdefg"
}
```

### Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Error Handling

### Common Error Responses

**Missing Authentication**:
```json
{
  "success": false,
  "error": "Missing Authorization header",
  "requestId": "req-1234567890-abcdefg"
}
```

**Invalid Input**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "title",
    "message": "Title is required"
  },
  "requestId": "req-1234567890-abcdefg"
}
```

**Rate Limited**:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": {
    "retryAfter": 60
  },
  "requestId": "req-1234567890-abcdefg"
}
```

**Resource Not Found**:
```json
{
  "success": false,
  "error": "Task not found",
  "requestId": "req-1234567890-abcdefg"
}
```

---

## Rate Limiting

The API implements multiple rate limiting strategies:

### Global Rate Limit
- **Limit**: 100 requests per minute per IP
- **Header**: `X-RateLimit-Limit: 100`

### Read Rate Limit
- **Endpoints**: GET requests
- **Limit**: 100 requests per minute per user
- **Use**: For queries and data retrieval

### Write Rate Limit
- **Endpoints**: POST, PATCH, DELETE requests
- **Limit**: 30 requests per minute per user
- **Use**: For create, update, delete operations

### Rate Limit Headers

When rate limited, responses include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700000000
```

---

## Caching

### Cache Strategy

The API implements intelligent caching to improve performance:

- **GET Request Caching**: Responses cached for 5 minutes
- **Cache Key**: `userId:method:path?query`
- **ETag Support**: Conditional requests with If-None-Match header
- **Auto-Invalidation**: Cache automatically cleared on CREATE, UPDATE, DELETE

### Cache Control Headers

```
Cache-Control: public, max-age=300
ETag: "abc123def456"
Last-Modified: 2024-11-12T10:00:00Z
```

### Forcing Fresh Data

To bypass caching, include:
```bash
curl -X GET "http://localhost:3000/api/v1/tasks" \
  -H "Cache-Control: no-cache" \
  -H "Authorization: Bearer <token>"
```

---

## Examples

### JavaScript/Node.js

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

// List tasks
const { data } = await api.get('/tasks', {
  params: {
    status: 'in-progress',
    limit: 10
  }
});

console.log(data.data.tasks);

// Create task
const newTask = await api.post('/tasks', {
  title: 'New task',
  priority: 'high',
  status: 'pending'
});

// Update task
await api.patch(`/tasks/${newTask.data.data.id}`, {
  status: 'done'
});

// Delete task
await api.delete(`/tasks/${newTask.data.data.id}`);
```

### Python

```python
import requests

headers = {'Authorization': f'Bearer {jwt_token}'}
base_url = 'http://localhost:3000/api/v1'

# List tasks
response = requests.get(
    f'{base_url}/tasks',
    headers=headers,
    params={'status': 'in-progress', 'limit': 10}
)
tasks = response.json()['data']['tasks']

# Create task
new_task = requests.post(
    f'{base_url}/tasks',
    headers=headers,
    json={
        'title': 'New task',
        'priority': 'high',
        'status': 'pending'
    }
).json()

# Update task
requests.patch(
    f'{base_url}/tasks/{new_task["data"]["id"]}',
    headers=headers,
    json={'status': 'done'}
)
```

### cURL

```bash
# List tasks
curl -X GET "http://localhost:3000/api/v1/tasks?status=pending" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Create task
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New task",
    "priority": "high",
    "status": "pending"
  }'

# Update task
curl -X PATCH "http://localhost:3000/api/v1/tasks/task-123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Delete task
curl -X DELETE "http://localhost:3000/api/v1/tasks/task-123" \
  -H "Authorization: Bearer <token>"
```

---

## Best Practices

### 1. Error Handling

Always handle errors appropriately:

```javascript
try {
  const response = await api.get('/tasks');
  // Process response
} catch (error) {
  if (error.response?.status === 401) {
    // Handle authentication error
  } else if (error.response?.status === 429) {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
```

### 2. Pagination

Use pagination for large result sets:

```javascript
const fetchAllTasks = async (limit = 20) => {
  const allTasks = [];
  let offset = 0;

  while (true) {
    const { data } = await api.get('/tasks', {
      params: { limit, offset }
    });

    allTasks.push(...data.data.tasks);

    if (allTasks.length >= data.data.total) break;
    offset += limit;
  }

  return allTasks;
};
```

### 3. Batch Operations

Use batch operations for bulk updates:

```javascript
// Instead of multiple single requests
const taskIds = ['task-1', 'task-2', 'task-3'];
await api.delete('/tasks/batch/delete', {
  data: { ids: taskIds }
});
```

### 4. Retry Logic

Implement exponential backoff for transient failures:

```javascript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### 5. Caching

Leverage API caching to reduce bandwidth:

```javascript
// Cache is automatically managed, but you can force refresh:
const freshData = await api.get('/tasks', {
  headers: { 'Cache-Control': 'no-cache' }
});
```

---

## Swagger UI

The API documentation is also available via interactive Swagger UI at:

```
http://localhost:3000/api/v1/docs
```

The Swagger UI provides:
- Interactive API exploration
- Request/response examples
- Schema validation
- Try-it-out functionality

You can also access the raw OpenAPI specification:
- JSON: `/api/v1/docs/spec.json`
- YAML: `/api/v1/docs/spec.yaml`

---

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/anthropics/taskmaster-pro/issues
- Documentation: https://docs.task-master.dev
- Email: support@task-master.dev

---

**Last Updated**: 2024-11-12
**Version**: 1.0.0
**License**: MIT
