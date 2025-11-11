"""
Task model and related enums
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import Field

from .base import BaseModel
from .subtask import SubTask


class TaskStatus(str, Enum):
    """
    Task status enumeration.

    Represents the current state of a task in the workflow.
    """

    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    DONE = "done"
    DEFERRED = "deferred"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"

    def __str__(self) -> str:
        """Return string representation."""
        return self.value


class TaskPriority(str, Enum):
    """
    Task priority enumeration.

    Represents the priority level of a task.
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    def __str__(self) -> str:
        """Return string representation."""
        return self.value


class Task(BaseModel):
    """
    Represents a task in the Task Master system.

    Attributes:
        id: Unique identifier for the task
        title: Task title (required)
        description: Detailed task description
        status: Current task status (default: pending)
        priority: Task priority level (default: medium)
        created_at: Timestamp when task was created
        updated_at: Timestamp when task was last updated
        subtasks: List of subtasks associated with this task
        project_id: Optional project ID for multi-project support
        account_id: Optional account ID for multi-tenant support
        metadata: Optional metadata dictionary for custom fields
    """

    id: str = Field(description="Unique task identifier")
    title: str = Field(..., description="Task title", min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, description="Task description")
    status: TaskStatus = Field(default=TaskStatus.PENDING, description="Current task status")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task priority")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")
    subtasks: List[SubTask] = Field(default_factory=list, description="Associated subtasks")
    project_id: Optional[str] = Field(default=None, description="Project identifier")
    account_id: Optional[str] = Field(default=None, description="Account identifier")
    metadata: Optional[dict] = Field(default=None, description="Custom metadata")

    def is_completed(self) -> bool:
        """
        Check if the task is completed.

        Returns:
            True if status is DONE, False otherwise
        """
        return self.status == TaskStatus.DONE

    def is_active(self) -> bool:
        """
        Check if the task is currently active.

        Active tasks are those that are pending or in progress.

        Returns:
            True if status is PENDING or IN_PROGRESS, False otherwise
        """
        return self.status in (TaskStatus.PENDING, TaskStatus.IN_PROGRESS)

    def is_blocked(self) -> bool:
        """
        Check if the task is blocked.

        Returns:
            True if status is BLOCKED, False otherwise
        """
        return self.status == TaskStatus.BLOCKED

    def get_subtask_count(self) -> int:
        """
        Get the number of subtasks.

        Returns:
            Total number of subtasks
        """
        return len(self.subtasks)

    def get_completed_subtask_count(self) -> int:
        """
        Get the number of completed subtasks.

        Returns:
            Number of subtasks with DONE status
        """
        return sum(1 for st in self.subtasks if st.is_completed())

    def get_completion_percentage(self) -> float:
        """
        Get the completion percentage of subtasks.

        Returns:
            Percentage (0-100) of completed subtasks. Returns 100 if no subtasks.
        """
        if not self.subtasks:
            return 100.0 if self.is_completed() else 0.0

        completed = self.get_completed_subtask_count()
        return (completed / len(self.subtasks)) * 100

    def __str__(self) -> str:
        """Return string representation."""
        return f"Task({self.id}: {self.title})"

    def __repr__(self) -> str:
        """Return detailed representation."""
        return (
            f"Task(id={self.id!r}, title={self.title!r}, status={self.status}, "
            f"priority={self.priority})"
        )
