"""
SubTask model
"""

from datetime import datetime
from typing import Optional

from pydantic import Field

from .base import BaseModel


class SubTask(BaseModel):
    """
    Represents a subtask associated with a main task.

    Attributes:
        id: Unique identifier for the subtask
        parent_id: ID of the parent task
        title: Subtask title (required)
        description: Detailed subtask description
        status: Current subtask status
        created_at: Timestamp when subtask was created
        updated_at: Timestamp when subtask was last updated
        metadata: Optional metadata dictionary for custom fields
    """

    id: str = Field(description="Unique subtask identifier")
    parent_id: str = Field(description="Parent task ID")
    title: str = Field(..., description="Subtask title", min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, description="Subtask description")
    status: str = Field(default="pending", description="Current subtask status")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")
    metadata: Optional[dict] = Field(default=None, description="Custom metadata")

    def is_completed(self) -> bool:
        """
        Check if the subtask is completed.

        Returns:
            True if status is 'done', False otherwise
        """
        return self.status == "done"

    def is_active(self) -> bool:
        """
        Check if the subtask is currently active.

        Active subtasks are those that are pending or in progress.

        Returns:
            True if status is 'pending' or 'in-progress', False otherwise
        """
        return self.status in ("pending", "in-progress")

    def __str__(self) -> str:
        """Return string representation."""
        return f"SubTask({self.id}: {self.title})"

    def __repr__(self) -> str:
        """Return detailed representation."""
        return (
            f"SubTask(id={self.id!r}, parent_id={self.parent_id!r}, "
            f"title={self.title!r}, status={self.status})"
        )
