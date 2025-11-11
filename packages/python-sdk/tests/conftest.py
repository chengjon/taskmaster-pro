"""
Pytest configuration and shared fixtures for Task Master SDK tests
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime, timedelta
import json


@pytest.fixture
def sample_task_data():
    """Provide sample task data for testing"""
    return {
        "id": "1",
        "title": "Implement user authentication",
        "description": "Set up JWT-based auth system",
        "status": "pending",
        "priority": "high",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "subtasks": [],
        "project_id": "proj-1",
        "account_id": "acc-1",
        "metadata": {"tags": ["auth", "backend"]},
    }


@pytest.fixture
def sample_subtask_data():
    """Provide sample subtask data for testing"""
    return {
        "id": "1.1",
        "parent_id": "1",
        "title": "Create JWT token generator",
        "description": "Implement token generation logic",
        "status": "in-progress",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def mock_api_response_task(sample_task_data):
    """Provide mock API response for task endpoint"""
    return {
        "status": "success",
        "code": 200,
        "message": "Task retrieved successfully",
        "data": sample_task_data,
        "timestamp": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def mock_api_response_tasks(sample_task_data):
    """Provide mock API response for tasks list endpoint"""
    return {
        "status": "success",
        "code": 200,
        "message": "Tasks retrieved successfully",
        "data": [sample_task_data],
        "pagination": {"limit": 50, "offset": 0, "total": 1},
        "timestamp": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def mock_api_error_response():
    """Provide mock API error response"""
    return {
        "status": "error",
        "code": 404,
        "message": "Task not found",
        "error": {
            "type": "NotFoundError",
            "details": "Task with ID 'nonexistent' does not exist",
        },
        "timestamp": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def valid_jwt_token():
    """Provide a valid JWT token for testing"""
    import jwt
    payload = {
        "sub": "user-1",
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, "test-secret", algorithm="HS256")


@pytest.fixture
def expired_jwt_token():
    """Provide an expired JWT token for testing"""
    import jwt
    payload = {
        "sub": "user-1",
        "exp": datetime.utcnow() - timedelta(hours=1),
        "iat": datetime.utcnow() - timedelta(hours=2),
    }
    return jwt.encode(payload, "test-secret", algorithm="HS256")


@pytest.fixture
def mock_requests_session():
    """Provide a mocked requests session"""
    mock_session = MagicMock()
    mock_session.request = MagicMock()
    mock_session.get = MagicMock()
    mock_session.post = MagicMock()
    mock_session.patch = MagicMock()
    mock_session.delete = MagicMock()
    return mock_session


@pytest.fixture
def mock_response():
    """Provide a mock HTTP response"""
    response = Mock()
    response.status_code = 200
    response.json = Mock(return_value={"status": "success", "data": {}})
    response.ok = True
    response.reason = "OK"
    return response


@pytest.fixture
def mock_error_response_404():
    """Provide a mock 404 error response"""
    response = Mock()
    response.status_code = 404
    response.json = Mock(
        return_value={
            "status": "error",
            "message": "Task not found",
            "code": 404,
        }
    )
    response.ok = False
    response.reason = "Not Found"
    return response


@pytest.fixture
def mock_error_response_401():
    """Provide a mock 401 authentication error response"""
    response = Mock()
    response.status_code = 401
    response.json = Mock(
        return_value={
            "status": "error",
            "message": "Authentication failed",
            "code": 401,
        }
    )
    response.ok = False
    response.reason = "Unauthorized"
    return response


@pytest.fixture
def mock_error_response_400():
    """Provide a mock 400 bad request error response"""
    response = Mock()
    response.status_code = 400
    response.json = Mock(
        return_value={
            "status": "error",
            "message": "Invalid request data",
            "code": 400,
            "errors": [{"field": "title", "message": "Title is required"}],
        }
    )
    response.ok = False
    response.reason = "Bad Request"
    return response


@pytest.fixture
def mock_error_response_429():
    """Provide a mock 429 rate limit error response"""
    response = Mock()
    response.status_code = 429
    response.json = Mock(
        return_value={
            "status": "error",
            "message": "Rate limit exceeded",
            "code": 429,
            "retry_after": 60,
        }
    )
    response.ok = False
    response.reason = "Too Many Requests"
    return response


@pytest.fixture
def mock_error_response_500():
    """Provide a mock 500 server error response"""
    response = Mock()
    response.status_code = 500
    response.json = Mock(
        return_value={
            "status": "error",
            "message": "Internal server error",
            "code": 500,
        }
    )
    response.ok = False
    response.reason = "Internal Server Error"
    return response


@pytest.fixture
def api_client_config():
    """Provide API client configuration"""
    return {
        "api_url": "http://localhost:3000/api/v1",
        "token": "test-jwt-token",
        "timeout": 30,
        "max_retries": 3,
        "retry_backoff": 1.0,
    }


@pytest.fixture(autouse=True)
def reset_imports():
    """Reset imports between tests to avoid side effects"""
    yield
    # Cleanup after each test
    import sys
    # Remove any test modules from cache if needed
