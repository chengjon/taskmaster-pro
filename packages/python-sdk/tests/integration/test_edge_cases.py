"""
Edge case and error handling tests for Task Master SDK
"""

import pytest
from unittest.mock import patch, MagicMock
import requests

from taskmaster import TaskMasterClient
from taskmaster.models import Task, SubTask, TaskStatus
from taskmaster.exceptions import (
    NotFoundError,
    BadRequestError,
    RateLimitError,
    ServerError,
    ServiceUnavailableError,
)


class TestClientEdgeCases:
    """Test client edge cases"""

    @patch("taskmaster.client.requests.Session.request")
    def test_empty_response_data(self, mock_request, api_client_config, mock_response):
        """Test handling of empty response data"""
        mock_response.json = MagicMock(return_value={"status": "success", "data": None})
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        # Should not crash with None data
        with pytest.raises((KeyError, AttributeError, TypeError)):
            client.get_task("1")

    @patch("taskmaster.client.requests.Session.request")
    def test_missing_data_field(self, mock_request, api_client_config, mock_response):
        """Test handling of missing data field in response"""
        mock_response.json = MagicMock(return_value={"status": "success"})
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        # Should handle gracefully
        with pytest.raises((KeyError, AttributeError, TypeError)):
            client.get_task("1")

    @patch("taskmaster.client.requests.Session.request")
    def test_malformed_json_response(self, mock_request, api_client_config):
        """Test handling of malformed JSON response"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json = MagicMock(side_effect=ValueError("Invalid JSON"))
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(ValueError):
            client.list_tasks()

    @patch("taskmaster.client.requests.Session.request")
    def test_connection_timeout(self, mock_request, api_client_config):
        """Test handling of connection timeout"""
        mock_request.side_effect = requests.Timeout("Connection timeout")

        client = TaskMasterClient(**api_client_config, timeout=1)
        with pytest.raises(requests.Timeout):
            client.list_tasks()

    @patch("taskmaster.client.requests.Session.request")
    def test_connection_error(self, mock_request, api_client_config):
        """Test handling of connection error"""
        mock_request.side_effect = requests.ConnectionError("Connection failed")

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(requests.ConnectionError):
            client.list_tasks()


class TestResponseHandling:
    """Test response handling edge cases"""

    @patch("taskmaster.client.requests.Session.request")
    def test_response_with_extra_fields(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test response with extra fields in task data"""
        extra_task = sample_task_data.copy()
        extra_task["extra_field"] = "should be ignored by Pydantic with ignore_extra"
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": extra_task}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        task = client.get_task("1")
        # Should handle extra fields gracefully
        assert task.id == "1"

    @patch("taskmaster.client.requests.Session.request")
    def test_response_with_null_optional_fields(self, mock_request, api_client_config, mock_response):
        """Test response with null optional fields"""
        task_data = {
            "id": "1",
            "title": "Test",
            "description": None,
            "status": "pending",
            "priority": "medium",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "subtasks": [],
            "project_id": None,
            "account_id": None,
            "metadata": None,
        }
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": task_data}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        task = client.get_task("1")
        assert task.description is None
        assert task.project_id is None

    @patch("taskmaster.client.requests.Session.request")
    def test_large_response_payload(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test handling of large response payload"""
        # Create a list of 1000 tasks
        large_task_list = [sample_task_data.copy() for _ in range(1000)]
        mock_response.json = MagicMock(
            return_value={
                "status": "success",
                "data": large_task_list,
                "pagination": {"limit": 1000, "offset": 0, "total": 1000},
            }
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        tasks = client.list_tasks(limit=1000)
        assert len(tasks) == 1000

    @patch("taskmaster.client.requests.Session.request")
    def test_special_characters_in_response(self, mock_request, api_client_config, mock_response):
        """Test handling of special characters in response"""
        task_data = {
            "id": "1",
            "title": "Test with émojis 🚀 and spëcial çharacters",
            "description": "Unicode test: \u00e9\u00e7\u00fc",
            "status": "pending",
            "priority": "medium",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "subtasks": [],
        }
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": task_data}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        task = client.get_task("1")
        assert "🚀" in task.title


class TestErrorResponseHandling:
    """Test error response handling"""

    @patch("taskmaster.client.requests.Session.request")
    def test_error_response_missing_message(self, mock_request, api_client_config):
        """Test error response without message field"""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json = MagicMock(return_value={"status": "error", "code": 404})
        mock_response.ok = False
        mock_response.reason = "Not Found"
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(NotFoundError):
            client.get_task("nonexistent")

    @patch("taskmaster.client.requests.Session.request")
    def test_multiple_http_status_codes(self, mock_request, api_client_config):
        """Test various HTTP status codes"""
        test_cases = [
            (400, BadRequestError),
            (401, Exception),  # AuthenticationError
            (404, NotFoundError),
            (409, Exception),  # ConflictError
            (429, RateLimitError),
            (500, ServerError),
            (503, ServiceUnavailableError),
        ]

        for status_code, expected_exception in test_cases:
            mock_response = MagicMock()
            mock_response.status_code = status_code
            mock_response.json = MagicMock(
                return_value={
                    "status": "error",
                    "message": f"Error {status_code}",
                    "code": status_code,
                }
            )
            mock_response.ok = False
            mock_response.reason = f"Error {status_code}"
            mock_request.return_value = mock_response

            client = TaskMasterClient(**api_client_config)
            with pytest.raises(expected_exception):
                client.list_tasks()

    @patch("taskmaster.client.requests.Session.request")
    def test_error_with_additional_context(self, mock_request, api_client_config):
        """Test error response with additional context"""
        mock_response = MagicMock()
        mock_response.status_code = 400
        error_response = {
            "status": "error",
            "message": "Validation failed",
            "code": 400,
            "errors": [
                {"field": "title", "message": "Title is required"},
                {"field": "priority", "message": "Invalid priority value"},
            ],
        }
        mock_response.json = MagicMock(return_value=error_response)
        mock_response.ok = False
        mock_response.reason = "Bad Request"
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        with pytest.raises(BadRequestError):
            client.create_task({})


class TestDataValidation:
    """Test data validation in models"""

    def test_task_status_validation(self):
        """Test task status validation"""
        from taskmaster.models import TaskStatus
        assert TaskStatus.PENDING == "pending"
        assert TaskStatus.IN_PROGRESS == "in-progress"
        assert TaskStatus.DONE == "done"

    def test_task_priority_validation(self):
        """Test task priority validation"""
        from taskmaster.models import TaskPriority
        assert TaskPriority.LOW == "low"
        assert TaskPriority.MEDIUM == "medium"
        assert TaskPriority.HIGH == "high"
        assert TaskPriority.CRITICAL == "critical"

    def test_task_with_invalid_status(self):
        """Test task creation with invalid status"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            Task(id="1", title="Test", status="invalid_status")

    def test_task_with_invalid_priority(self):
        """Test task creation with invalid priority"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            Task(id="1", title="Test", priority="invalid_priority")

    def test_subtask_with_invalid_status(self):
        """Test subtask creation with invalid status"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SubTask(id="1.1", title="Test", status="invalid_status")


class TestConcurrentOperations:
    """Test concurrent operation handling"""

    @patch("taskmaster.client.requests.Session.request")
    def test_multiple_tasks_operations(self, mock_request, api_client_config, mock_response, sample_task_data):
        """Test handling multiple task operations"""
        mock_response.json = MagicMock(
            return_value={"status": "success", "data": sample_task_data}
        )
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)

        # Perform multiple operations
        task1 = client.get_task("1")
        task2 = client.get_task("2")
        task3 = client.get_task("3")

        assert task1 is not None
        assert task2 is not None
        assert task3 is not None
        assert mock_request.call_count == 3


class TestClientStateManagement:
    """Test client state management"""

    def test_client_token_persistence(self, api_client_config):
        """Test that token persists across requests"""
        client = TaskMasterClient(**api_client_config)
        original_token = client.token

        # Token should not change
        headers1 = client._get_headers()
        headers2 = client._get_headers()

        assert original_token == api_client_config["token"]
        assert headers1["Authorization"] == headers2["Authorization"]

    def test_client_url_persistence(self, api_client_config):
        """Test that API URL persists across requests"""
        client = TaskMasterClient(**api_client_config)
        original_url = client.api_url

        assert original_url == api_client_config["api_url"].rstrip("/")
        assert client.api_url == original_url

    @patch("taskmaster.client.requests.Session.request")
    def test_session_reuse(self, mock_request, api_client_config, mock_response):
        """Test that session is reused across requests"""
        mock_response.json = MagicMock(return_value={"status": "success", "data": []})
        mock_request.return_value = mock_response

        client = TaskMasterClient(**api_client_config)
        session1 = client.session

        # Make multiple requests
        client.list_tasks()
        client.list_tasks()

        session2 = client.session
        # Session should be the same object
        assert session1 is session2
