"""
Unit tests for Task Master SDK models
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from taskmaster.models import (
    Task,
    SubTask,
    TaskStatus,
    TaskPriority,
    ApiResponse,
    ApiError,
)


class TestTaskStatus:
    """Test TaskStatus enum"""

    def test_task_status_values(self):
        """Test all TaskStatus enum values"""
        assert TaskStatus.PENDING == "pending"
        assert TaskStatus.IN_PROGRESS == "in-progress"
        assert TaskStatus.DONE == "done"
        assert TaskStatus.DEFERRED == "deferred"
        assert TaskStatus.CANCELLED == "cancelled"
        assert TaskStatus.BLOCKED == "blocked"

    def test_task_status_string_conversion(self):
        """Test TaskStatus can be compared with strings"""
        status = TaskStatus.PENDING
        assert status == "pending"
        assert str(status) == "pending"


class TestTaskPriority:
    """Test TaskPriority enum"""

    def test_task_priority_values(self):
        """Test all TaskPriority enum values"""
        assert TaskPriority.LOW == "low"
        assert TaskPriority.MEDIUM == "medium"
        assert TaskPriority.HIGH == "high"
        assert TaskPriority.CRITICAL == "critical"

    def test_task_priority_string_conversion(self):
        """Test TaskPriority can be compared with strings"""
        priority = TaskPriority.MEDIUM
        assert priority == "medium"
        assert str(priority) == "medium"


class TestSubTask:
    """Test SubTask model"""

    def test_subtask_creation(self, sample_subtask_data):
        """Test SubTask creation with valid data"""
        subtask = SubTask(**sample_subtask_data)
        assert subtask.id == "1.1"
        assert subtask.title == "Create JWT token generator"
        assert subtask.status == "in-progress"

    def test_subtask_is_completed(self, sample_subtask_data):
        """Test is_completed method"""
        data = sample_subtask_data.copy()
        data["status"] = "done"
        subtask = SubTask(**data)
        assert subtask.is_completed()

        subtask.status = "pending"
        assert not subtask.is_completed()

    def test_subtask_is_active(self, sample_subtask_data):
        """Test is_active method"""
        data = sample_subtask_data.copy()
        data["status"] = "in-progress"
        subtask = SubTask(**data)
        assert subtask.is_active()

        data["status"] = "done"
        subtask = SubTask(**data)
        assert not subtask.is_active()

        data["status"] = "blocked"
        subtask = SubTask(**data)
        assert not subtask.is_active()


class TestTask:
    """Test Task model"""

    def test_task_creation(self, sample_task_data):
        """Test Task creation with valid data"""
        task = Task(**sample_task_data)
        assert task.id == "1"
        assert task.title == "Implement user authentication"
        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.HIGH
        assert task.project_id == "proj-1"

    def test_task_default_values(self, sample_task_data):
        """Test Task default values"""
        base_data = {k: v for k, v in sample_task_data.items() if k in ['id', 'title', 'created_at', 'updated_at']}
        task = Task(**base_data)
        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.MEDIUM
        assert task.subtasks == []
        assert task.description is None
        assert task.metadata is None

    def test_task_is_completed(self, sample_task_data):
        """Test is_completed method"""
        task_data = sample_task_data.copy()
        task_data["status"] = TaskStatus.DONE
        task = Task(**task_data)
        assert task.is_completed()

        task.status = TaskStatus.PENDING
        assert not task.is_completed()

    def test_task_is_active(self, sample_task_data):
        """Test is_active method"""
        task_data = sample_task_data.copy()
        task_data["status"] = TaskStatus.IN_PROGRESS
        task = Task(**task_data)
        assert task.is_active()

        task_data["status"] = TaskStatus.PENDING
        task = Task(**task_data)
        assert task.is_active()

        task_data["status"] = TaskStatus.DONE
        task = Task(**task_data)
        assert not task.is_active()

    def test_task_is_blocked(self, sample_task_data):
        """Test is_blocked method"""
        task_data = sample_task_data.copy()
        task_data["status"] = TaskStatus.BLOCKED
        task = Task(**task_data)
        assert task.is_blocked()

        task_data["status"] = TaskStatus.PENDING
        task = Task(**task_data)
        assert not task.is_blocked()

    def test_task_get_subtask_count(self, sample_task_data, sample_subtask_data):
        """Test get_subtask_count method"""
        task = Task(**sample_task_data)
        assert task.get_subtask_count() == 0

        subtask = SubTask(**sample_subtask_data)
        task.subtasks = [subtask]
        assert task.get_subtask_count() == 1

    def test_task_get_completed_subtask_count(self, sample_task_data, sample_subtask_data):
        """Test get_completed_subtask_count method"""
        task = Task(**sample_task_data)

        # Create subtasks with different statuses
        sub1_data = sample_subtask_data.copy()
        sub1_data["status"] = TaskStatus.DONE
        sub2_data = sample_subtask_data.copy()
        sub2_data["id"] = "1.2"
        sub2_data["status"] = TaskStatus.PENDING
        sub3_data = sample_subtask_data.copy()
        sub3_data["id"] = "1.3"
        sub3_data["status"] = TaskStatus.DONE

        task.subtasks = [SubTask(**sub1_data), SubTask(**sub2_data), SubTask(**sub3_data)]
        assert task.get_completed_subtask_count() == 2

    def test_task_get_completion_percentage_no_subtasks(self, sample_task_data):
        """Test get_completion_percentage with no subtasks"""
        task_data = sample_task_data.copy()
        task_data["status"] = TaskStatus.DONE
        task = Task(**task_data)
        assert task.get_completion_percentage() == 100.0

        task_data["status"] = TaskStatus.PENDING
        task = Task(**task_data)
        assert task.get_completion_percentage() == 0.0

    def test_task_get_completion_percentage_with_subtasks(self, sample_task_data, sample_subtask_data):
        """Test get_completion_percentage with subtasks"""
        task = Task(**sample_task_data)

        sub1_data = sample_subtask_data.copy()
        sub1_data["status"] = TaskStatus.DONE
        sub2_data = sample_subtask_data.copy()
        sub2_data["id"] = "1.2"
        sub2_data["status"] = TaskStatus.PENDING

        task.subtasks = [SubTask(**sub1_data), SubTask(**sub2_data)]
        assert task.get_completion_percentage() == 50.0

    def test_task_validation_missing_title(self):
        """Test Task validation fails without title"""
        with pytest.raises(ValidationError) as exc_info:
            Task(id="1")
        assert "title" in str(exc_info.value)

    def test_task_validation_title_too_long(self):
        """Test Task validation fails with title too long"""
        with pytest.raises(ValidationError):
            Task(id="1", title="x" * 256)  # max_length=255

    def test_task_from_api_response(self, sample_task_data):
        """Test Task.from_api_response classmethod"""
        task = Task.from_api_response(sample_task_data)
        assert task.id == sample_task_data["id"]
        assert task.title == sample_task_data["title"]

    def test_task_to_dict(self, sample_task_data):
        """Test Task.to_dict method"""
        task = Task(**sample_task_data)
        task_dict = task.to_dict()
        assert task_dict["id"] == task.id
        assert task_dict["title"] == task.title
        assert task_dict["status"] == task.status.value

    def test_task_to_api_request(self, sample_task_data):
        """Test Task.to_api_request method"""
        task_data = sample_task_data.copy()
        task_data["description"] = "Test description"
        task = Task(**task_data)
        api_request = task.to_api_request()
        assert api_request["title"] == "Implement user authentication"
        assert api_request["description"] == "Test description"
        assert isinstance(api_request, dict)


class TestApiResponse:
    """Test ApiResponse model"""

    def test_api_response_success(self, sample_task_data):
        """Test ApiResponse with success status"""
        response = ApiResponse(
            status="ok",
            message="Task retrieved",
            data=sample_task_data,
        )
        assert response.status == "ok"
        assert response.is_success() is True
        assert response.data == sample_task_data

    def test_api_response_error(self):
        """Test ApiResponse with error status"""
        error = ApiError(code="NOT_FOUND", message="Task not found")
        response = ApiResponse(
            status="error",
            message="Not found",
            error=error,
        )
        assert response.status == "error"
        assert response.is_error() is True
        assert response.error is not None

    def test_api_response_with_metadata(self):
        """Test ApiResponse with metadata"""
        response = ApiResponse(
            status="ok",
            message="Tasks retrieved",
            data=[],
            metadata={"limit": 50, "offset": 0, "total": 100},
        )
        assert response.metadata is not None
        assert response.metadata["total"] == 100


class TestApiError:
    """Test ApiError model"""

    def test_api_error_creation(self):
        """Test ApiError creation"""
        error = ApiError(code="BAD_REQUEST", message="Invalid data")
        assert error.code == "BAD_REQUEST"
        assert error.message == "Invalid data"

    def test_api_error_with_details(self):
        """Test ApiError with details"""
        details = {"field": "title", "message": "Required"}
        error = ApiError(
            code="VALIDATION_ERROR", message="Validation failed", details=details
        )
        assert error.details == details


class TestTaskIntegration:
    """Integration tests for Task model"""

    def test_task_with_multiple_subtasks(self, sample_task_data, sample_subtask_data):
        """Test Task with multiple subtasks"""
        task_data = sample_task_data.copy()
        task_data["description"] = "Large feature implementation"
        task_data["status"] = TaskStatus.IN_PROGRESS
        task = Task(**task_data)

        subtasks = []
        for i in range(1, 6):
            sub_data = sample_subtask_data.copy()
            sub_data["id"] = f"1.{i}"
            sub_data["title"] = f"Subtask {i}"
            sub_data["status"] = TaskStatus.DONE if i <= 2 else TaskStatus.PENDING
            subtasks.append(SubTask(**sub_data))

        task.subtasks = subtasks
        assert task.get_subtask_count() == 5
        assert task.get_completed_subtask_count() == 2
        assert task.get_completion_percentage() == 40.0
        assert not task.is_completed()
        assert task.is_active()
