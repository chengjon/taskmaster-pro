# Task Master Pro - Python SDK

Official Python SDK for the [Task Master Pro API](https://docs.taskmaster.io)

![Python Version](https://img.shields.io/badge/python-3.8+-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-alpha-orange)

## Features

- ✅ Full CRUD operations for tasks and subtasks
- ✅ JWT authentication support with Supabase compatibility
- ✅ Automatic retry with exponential backoff
- ✅ Pydantic models for data validation and serialization
- ✅ Structured exception handling with custom error types
- ✅ Context manager support for resource cleanup
- ✅ Type hints for better IDE support
- ✅ Comprehensive documentation and examples

## Installation

### From PyPI (when available)

```bash
pip install taskmaster-pro
```

### From source (development)

```bash
git clone https://github.com/anthropics/taskmaster-pro.git
cd packages/python-sdk
pip install -e ".[dev]"
```

## Quick Start

### Basic Usage

```python
from taskmaster import TaskMasterClient

# Initialize the client
client = TaskMasterClient(
    api_url="http://localhost:3000/api/v1",
    token="your-jwt-token"
)

# List all tasks
tasks = client.list_tasks()
for task in tasks:
    print(f"{task.id}: {task.title}")

# Get a specific task
task = client.get_task("1")
print(f"Task: {task.title}")
print(f"Status: {task.status}")
print(f"Priority: {task.priority}")

# Create a new task
new_task = client.create_task({
    "title": "Implement new feature",
    "description": "Add support for webhooks",
    "priority": "high"
})
print(f"Created task: {new_task.id}")

# Update a task
updated_task = client.update_task("1", {
    "status": "in-progress",
    "priority": "critical"
})

# Delete a task
client.delete_task("1")
```

### Working with Subtasks

```python
# List subtasks
subtasks = client.list_subtasks("1")

# Get a specific subtask
subtask = client.get_subtask("1", "1.1")

# Create a subtask
new_subtask = client.create_subtask("1", {
    "title": "Subtask 1",
    "description": "First subtask"
})

# Update a subtask
updated_subtask = client.update_subtask("1", "1.1", {
    "status": "done"
})

# Delete a subtask
client.delete_subtask("1", "1.1")
```

### Context Manager Usage

```python
# Automatically closes the session when done
with TaskMasterClient(api_url=url, token=token) as client:
    tasks = client.list_tasks()
    # Session is automatically closed here
```

### Filtering and Pagination

```python
# Filter by status
pending_tasks = client.list_tasks(status="pending")

# Filter by priority
high_priority = client.list_tasks(priority="high")

# Pagination
first_page = client.list_tasks(limit=10, offset=0)
second_page = client.list_tasks(limit=10, offset=10)

# Combined
filtered = client.list_tasks(
    status="in-progress",
    priority="high",
    limit=20,
    offset=0
)
```

### Error Handling

```python
from taskmaster import (
    TaskMasterClient,
    NotFoundError,
    BadRequestError,
    AuthenticationError,
)

client = TaskMasterClient(api_url=url, token=token)

try:
    task = client.get_task("nonexistent-id")
except NotFoundError as e:
    print(f"Task not found: {e}")
except AuthenticationError as e:
    print(f"Authentication failed: {e}")
except BadRequestError as e:
    print(f"Invalid request: {e}")
```

### Data Models

All responses are automatically converted to Pydantic models with full type hints:

```python
from taskmaster import Task, TaskStatus, TaskPriority

task = client.get_task("1")

# Access task properties
print(task.title)           # str
print(task.description)     # Optional[str]
print(task.status)          # TaskStatus enum
print(task.priority)        # TaskPriority enum
print(task.created_at)      # datetime
print(task.subtasks)        # List[SubTask]

# Use helper methods
if task.is_completed():
    print("Task is done!")

completion = task.get_completion_percentage()
print(f"Subtask completion: {completion}%")

# Convert to dictionary
task_dict = task.to_dict()
task_api_request = task.to_api_request()
```

### Task Status Values

- `pending` - Task is waiting to be started
- `in-progress` - Task is currently being worked on
- `done` - Task has been completed
- `deferred` - Task has been postponed
- `cancelled` - Task has been cancelled
- `blocked` - Task is blocked by dependencies

### Task Priority Values

- `low` - Low priority
- `medium` - Medium priority (default)
- `high` - High priority
- `critical` - Critical/urgent priority

## Configuration

### Environment Variables

```bash
# API Configuration
TASK_MASTER_API_URL=http://localhost:3000/api/v1
TASK_MASTER_API_TOKEN=your-jwt-token

# Logging
TASK_MASTER_LOG_LEVEL=INFO
```

### Load from Environment

```python
import os
from taskmaster import TaskMasterClient

client = TaskMasterClient(
    api_url=os.getenv("TASK_MASTER_API_URL"),
    token=os.getenv("TASK_MASTER_API_TOKEN")
)
```

### Using python-dotenv

```python
from dotenv import load_dotenv
import os
from taskmaster import TaskMasterClient

load_dotenv()

client = TaskMasterClient(
    api_url=os.getenv("TASK_MASTER_API_URL"),
    token=os.getenv("TASK_MASTER_API_TOKEN")
)
```

## Exception Hierarchy

```
TaskMasterError (base)
├── AuthenticationError
│   ├── TokenExpiredError
│   ├── InvalidTokenError
│   └── MissingCredentialsError
├── APIError
│   ├── BadRequestError (400)
│   ├── NotFoundError (404)
│   ├── ConflictError (409)
│   ├── RateLimitError (429)
│   ├── ServerError (500)
│   └── ServiceUnavailableError (503)
└── ValidationError
```

## Advanced Features

### Automatic Retries

The client automatically retries failed requests with exponential backoff:

```python
client = TaskMasterClient(
    api_url=url,
    token=token,
    max_retries=3,           # Maximum 3 retries
    retry_backoff=1.0,       # Exponential backoff multiplier
    timeout=30               # Request timeout in seconds
)
```

### Retry Configuration

The client retries on:
- HTTP 429 (Rate Limited)
- HTTP 500 (Server Error)
- HTTP 502 (Bad Gateway)
- HTTP 503 (Service Unavailable)
- HTTP 504 (Gateway Timeout)

## API Reference

### TaskMasterClient

Main client class for interacting with the API.

#### Methods

- `list_tasks(status=None, priority=None, limit=50, offset=0)` - Get task list
- `get_task(task_id)` - Get a specific task
- `create_task(task_data)` - Create a new task
- `update_task(task_id, task_data)` - Update an existing task
- `delete_task(task_id)` - Delete a task

- `list_subtasks(task_id)` - Get subtasks for a task
- `get_subtask(task_id, subtask_id)` - Get a specific subtask
- `create_subtask(task_id, subtask_data)` - Create a subtask
- `update_subtask(task_id, subtask_id, subtask_data)` - Update a subtask
- `delete_subtask(task_id, subtask_id)` - Delete a subtask

- `close()` - Close the client session

### Models

#### Task

Represents a task with all its properties and helper methods.

```python
task.is_completed() -> bool
task.is_active() -> bool
task.is_blocked() -> bool
task.get_subtask_count() -> int
task.get_completed_subtask_count() -> int
task.get_completion_percentage() -> float
```

#### SubTask

Represents a subtask with helper methods.

```python
subtask.is_completed() -> bool
subtask.is_active() -> bool
```

## Development

### Setup Development Environment

```bash
cd packages/python-sdk

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Check code quality
black src tests
ruff check src tests
mypy src
```

### Running Tests

```bash
# All tests
pytest

# Specific test file
pytest tests/test_client.py

# With coverage
pytest --cov=taskmaster tests/

# Verbose output
pytest -v
```

### Code Style

This project uses:
- **Black** for code formatting
- **Ruff** for linting
- **MyPy** for type checking

```bash
# Format code
black src tests

# Check style
ruff check src tests

# Type check
mypy src
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests for new functionality
5. Format code (`black src tests`)
6. Check linting (`ruff check src tests`)
7. Check types (`mypy src`)
8. Commit changes (`git commit -m 'Add amazing feature'`)
9. Push to the branch (`git push origin feature/amazing-feature`)
10. Open a Pull Request

## Testing

The SDK includes comprehensive tests:

- **Unit tests** - Test individual components
- **Integration tests** - Test with real API responses
- **Mock tests** - Test error handling and edge cases

```bash
# Run all tests
pytest

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Generate coverage report
pytest --cov=taskmaster --cov-report=html
```

## Documentation

Full API documentation is available at:
- [Official Docs](https://docs.taskmaster.io/python)
- [API Reference](https://docs.taskmaster.io/api)
- [Examples](./examples/)

## Troubleshooting

### "Missing credentials" error

Make sure you're providing a valid JWT token:

```python
client = TaskMasterClient(
    api_url="http://localhost:3000/api/v1",
    token="your-valid-jwt-token"  # Required!
)
```

### "Rate limit exceeded" error

The API enforces rate limits. Use exponential backoff or wait before retrying:

```python
from taskmaster import RateLimitError
import time

try:
    task = client.get_task("1")
except RateLimitError as e:
    # Wait and retry
    time.sleep(60)
    task = client.get_task("1")
```

### Connection timeouts

Increase the timeout if requests are slow:

```python
client = TaskMasterClient(
    api_url=url,
    token=token,
    timeout=60  # 60 seconds
)
```

## License

MIT License - see LICENSE file for details

## Support

- 📖 [Documentation](https://docs.taskmaster.io)
- 🐛 [Issue Tracker](https://github.com/anthropics/taskmaster-pro/issues)
- 💬 [Discussions](https://github.com/anthropics/taskmaster-pro/discussions)
- 📧 [Email](mailto:dev@taskmaster.io)

## Version History

### 0.1.0 (Current)
- Initial release
- Full CRUD operations
- JWT authentication
- Automatic retries
- Comprehensive error handling
- Type hints and Pydantic models
