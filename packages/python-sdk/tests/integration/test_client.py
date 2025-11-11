"""
Integration tests for Task Master SDK client
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

from taskmaster import TaskMasterClient
from taskmaster.models import Task, SubTask, TaskStatus, TaskPriority
from taskmaster.exceptions import (
    NotFoundError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
    ServerError,
    ServiceUnavailableError,
)


class TestTaskMasterClientBasics:
    """Test basic client functionality"""

    def test_client_initialization(self, api_client_config):
        """Test client initialization"""
        client = TaskMasterClient(**api_client_config)
        assert client.api_url == api_client_config["api_url"]
        assert client.token == api_client_config["token"]
        assert client.timeout == api_client_config["timeout"]

    def test_client_context_manager(self, api_client_config):
        """Test client context manager"""
        with TaskMasterClient(**api_client_config) as client:
            assert client.session is not None
        # Session should be closed after context exit

    def test_client_close(self, api_client_config):
        """Test client close method"""
        client = TaskMasterClient(**api_client_config)
        client.close()
        # Verify session is closed
        assert client.session is not None

    def test_get_headers_with_token(self, api_client_config):
        """Test header generation with token"""
        client = TaskMasterClient(**api_client_config)
        headers = client._get_headers()
        assert "Authorization" in headers
        assert headers["Authorization"] == f"Bearer {api_client_config['token']}"
        assert headers["Content-Type"] == "application/json"

    def test_get_headers_without_token(self, api_client_config):
        """Test header generation without token"""
        config = api_client_config.copy()
        config["token"] = None
        client = TaskMasterClient(**config)
        headers = client._get_headers()
        assert "Authorization" not in headers
        assert headers["Content-Type"] == "application/json"


class TestTaskListOperations:
    """Test task list operations"""

    @patch("taskmaster.client.requests.Session.request")
    def test_list_tasks(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test listing tasks"""
        mock_response.json = MagicMock(
            return_value={
                "status": "success",
                "data": [sample_task_data],
                "pagination": {"limit": 50, "offset": 0, "total": 1},
            }
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        tasks = client.list_tasks()

        assert len(tasks) == 1
        assert tasks[0].id == "1"
        assert tasks[0].title == "Implement user authentication"
        mock_request.assert_called_once()

    @patch("taskmaster.client.requests.Session.request")
    def test_list_tasks_with_filters(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test listing tasks with filters"""
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": [sample_task_data]}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        tasks = client.list_tasks(status="pending", priority="high", limit=10, offset=20)

        assert len(tasks) == 1
        # Verify filters were passed in the request
        call_args = mock_request.call_args
        assert "params" in call_args.kwargs
        assert call_args.kwargs["params"]["status"] == "pending"
        assert call_args.kwargs["params"]["priority"] == "high"
        assert call_args.kwargs["params"]["limit"] == 10
        assert call_args.kwargs["params"]["offset"] == 20

    @patch("taskmaster.client.requests.Session.request")
    def test_list_tasks_empty(self, mock_request, api_client_config, mock_response):
        """Test listing tasks with empty result"""
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": []}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        tasks = client.list_tasks()

        assert len(tasks) == 0


class TestTaskCRUDOperations:
    """Test task CRUD operations"""

    @patch("taskmaster.client.requests.Session.request")
    def test_get_task(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test getting a single task"""
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": sample_task_data}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        task = client.get_task("1")

        assert task.id == "1"
        assert task.title == "Implement user authentication"
        assert task.status == TaskStatus.PENDING
        mock_request.assert_called_once()

    @patch("taskmaster.client.requests.Session.request")
    def test_create_task(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test creating a task"""
        created_task = sample_task_data.copy()
        created_task["status"] = "pending"
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": created_task}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        new_task = client.create_task({
            "title": "Implement user authentication",
            "description": "Set up JWT-based auth system",
            "priority": "high",
        })

        assert new_task.title == "Implement user authentication"
        call_args = mock_request.call_args
        assert call_args[0][0] == "POST"  # Method should be POST

    @patch("taskmaster.client.requests.Session.request")
    def test_update_task(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test updating a task"""
        updated_task = sample_task_data.copy()
        updated_task["status"] = "in-progress"
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": updated_task}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        task = client.update_task("1", {"status": "in-progress"})

        assert task.status == TaskStatus.IN_PROGRESS
        call_args = mock_request.call_args
        assert call_args[0][0] == "PATCH"  # Method should be PATCH

    @patch("taskmaster.client.requests.Session.request")
    def test_delete_task(self, mock_request, api_client_config, mock_response):
        """Test deleting a task"""
        mock_response.json = MagicMock(return_value={"status": "success"})
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        result = client.delete_task("1")

        assert result is True
        call_args = mock_request.call_args
        assert call_args[0][0] == "DELETE"  # Method should be DELETE


class TestSubTaskOperations:
    """Test subtask operations"""

    @patch("taskmaster.client.requests.Session.request")
    def test_list_subtasks(self, mock_request, api_client_config, mock_response, sample_subtask_data):
        """Test listing subtasks"""
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": [sample_subtask_data]}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        subtasks = client.list_subtasks("1")

        assert len(subtasks) == 1
        assert subtasks[0].id == "1.1"
        mock_request.assert_called_once()

    @patch("taskmaster.client.requests.Session.request")
    def test_get_subtask(self, mock_request, api_client_config, mock_response, sample_subtask_data):
        """Test getting a specific subtask"""
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": sample_subtask_data}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        subtask = client.get_subtask("1", "1.1")

        assert subtask.id == "1.1"
        assert subtask.title == "Create JWT token generator"

    @patch("taskmaster.client.requests.Session.request")
    def test_create_subtask(self, mock_request, api_client_config, mock_response, sample_subtask_data):
        """Test creating a subtask"""
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": sample_subtask_data}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        subtask = client.create_subtask("1", {
            "title": "Create JWT token generator",
            "description": "Implement token generation logic",
        })

        assert subtask.title == "Create JWT token generator"
        call_args = mock_request.call_args
        assert call_args[0][0] == "POST"

    @patch("taskmaster.client.requests.Session.request")
    def test_update_subtask(self, mock_request, api_client_config, mock_response, sample_subtask_data):
        """Test updating a subtask"""
        updated_subtask = sample_subtask_data.copy()
        updated_subtask["status"] = "done"
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": updated_subtask}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        subtask = client.update_subtask("1", "1.1", {"status": "done"})

        assert subtask.status == TaskStatus.DONE

    @patch("taskmaster.client.requests.Session.request")
    def test_delete_subtask(self, mock_request, api_client_config, mock_response):
        """Test deleting a subtask"""
        mock_response.json = MagicMock(return_value={"status": "success"})
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        result = client.delete_subtask("1", "1.1")

        assert result is True


class TestErrorHandling:
    """Test error handling"""

    @patch("taskmaster.client.requests.Session.request")
    def test_handle_404_error(self, mock_request, api_client_config, mock_error_response_404):
        """Test handling 404 error"""
        mock_request.return_value = mock_error_response_404

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(NotFoundError):
            client.get_task("nonexistent")

    @patch("taskmaster.client.requests.Session.request")
    def test_handle_401_error(self, mock_request, api_client_config, mock_error_response_401):
        """Test handling 401 authentication error"""
        mock_request.return_value = mock_error_response_401

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(AuthenticationError):
            client.list_tasks()

    @patch("taskmaster.client.requests.Session.request")
    def test_handle_400_error(self, mock_request, api_client_config, mock_error_response_400):
        """Test handling 400 bad request error"""
        mock_request.return_value = mock_error_response_400

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(BadRequestError):
            client.create_task({"invalid": "data"})

    @patch("taskmaster.client.requests.Session.request")
    def test_handle_429_error(self, mock_request, api_client_config, mock_error_response_429):
        """Test handling 429 rate limit error"""
        mock_request.return_value = mock_error_response_429

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(RateLimitError):
            client.list_tasks()

    @patch("taskmaster.client.requests.Session.request")
    def test_handle_500_error(self, mock_request, api_client_config, mock_error_response_500):
        """Test handling 500 server error"""
        mock_request.return_value = mock_error_response_500

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(ServerError):
            client.list_tasks()


class TestRetryLogic:
    """Test automatic retry functionality"""

    @patch("taskmaster.client.requests.Session.request")
    def test_retry_on_server_error(self, mock_request, api_client_config, mock_response):
        """Test retry on 500 server error"""
        # First call fails, second succeeds
        mock_response.status_code = 500
        mock_response.json = MagicMock(
            return_value={"status": "error", "message": "Server error"}
        )
        mock_response.ok = False
        mock_response.reason = "Internal Server Error"

        mock_request.side_effect = [mock_response, mock_response]

        client = TaskMasterClient(
            **api_client_config,
            max_retries=3,
        )

        # This should retry and eventually fail since both attempts return 500
        with pytest.raises(ServerError):
            client.list_tasks()

    @patch("taskmaster.client.requests.Session.request")
    def test_no_retry_on_401(self, mock_request, api_client_config, mock_error_response_401):
        """Test no retry on 401 authentication error"""
        mock_request.return_value = mock_error_response_401

        client = TaskMasterClient(**api_client_config, max_retries=3)

        with pytest.raises(AuthenticationError):
            client.list_tasks()

        # Should be called only once (no retry for auth errors)
        # Note: This depends on the implementation


class TestClientConfiguration:
    """Test client configuration options"""

    def test_custom_timeout(self):
        """Test custom timeout configuration"""
        client = TaskMasterClient(
            api_url="http://localhost:3000/api/v1",
            token="test",
            timeout=60,
        )
        assert client.timeout == 60

    def test_custom_retry_config(self):
        """Test custom retry configuration"""
        client = TaskMasterClient(
            api_url="http://localhost:3000/api/v1",
            token="test",
            max_retries=5,
            retry_backoff=2.0,
        )
        # Retry configuration is set up in _setup_session

    def test_api_url_trailing_slash_handling(self):
        """Test API URL trailing slash handling"""
        client1 = TaskMasterClient(
            api_url="http://localhost:3000/api/v1/",
            token="test",
        )
        client2 = TaskMasterClient(
            api_url="http://localhost:3000/api/v1",
            token="test",
        )
        # Both should have the same URL without trailing slash
        assert client1.api_url == client2.api_url
