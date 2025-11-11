"""
Task Master Pro - Official Python SDK

A comprehensive Python SDK for interacting with the Task Master Pro API.

Features:
    - Full CRUD operations for tasks and subtasks
    - JWT authentication support
    - Automatic retry with exponential backoff
    - Pydantic models for data validation
    - Structured exception handling
    - Context manager support

Example:
    >>> from taskmaster import TaskMasterClient, Task
    >>> client = TaskMasterClient(
    ...     api_url="http://localhost:3000/api/v1",
    ...     token="your-jwt-token"
    ... )
    >>> tasks = client.list_tasks()
    >>> task = client.get_task("1")
    >>> new_task = client.create_task({
    ...     "title": "My Task",
    ...     "description": "Task description",
    ...     "priority": "high"
    ... })
"""

__version__ = "0.1.0"
__author__ = "Task Master Team"
__email__ = "dev@taskmaster.io"

from .client import TaskMasterClient
from .models import (
    Task,
    TaskStatus,
    TaskPriority,
    SubTask,
    ApiResponse,
    ApiError,
)
from .exceptions import (
    TaskMasterError,
    AuthenticationError,
    TokenExpiredError,
    InvalidTokenError,
    MissingCredentialsError,
    APIError,
    BadRequestError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ServerError,
    ServiceUnavailableError,
    ValidationError,
)

__all__ = [
    # Version
    "__version__",
    # Client
    "TaskMasterClient",
    # Models
    "Task",
    "TaskStatus",
    "TaskPriority",
    "SubTask",
    "ApiResponse",
    "ApiError",
    # Exceptions
    "TaskMasterError",
    "AuthenticationError",
    "TokenExpiredError",
    "InvalidTokenError",
    "MissingCredentialsError",
    "APIError",
    "BadRequestError",
    "NotFoundError",
    "ConflictError",
    "RateLimitError",
    "ServerError",
    "ServiceUnavailableError",
    "ValidationError",
]
