"""
API response wrapper models
"""

from typing import Any, Generic, Optional, TypeVar

from pydantic import Field

from .base import BaseModel

T = TypeVar("T")


class ApiError(BaseModel):
    """
    Represents an API error response.

    Attributes:
        code: Error code for categorization
        message: Human-readable error message
        details: Additional error details
    """

    code: str = Field(description="Error code")
    message: str = Field(description="Error message")
    details: Optional[dict] = Field(default=None, description="Additional details")

    def __str__(self) -> str:
        """Return string representation."""
        if self.details:
            return f"[{self.code}] {self.message}: {self.details}"
        return f"[{self.code}] {self.message}"


class ApiResponse(BaseModel, Generic[T]):
    """
    Represents a standard API response wrapper.

    All API responses follow this structure, with the data field containing
    the actual response data (task, list of tasks, etc.) and metadata containing
    pagination and other response information.

    Attributes:
        status: Response status (ok, error)
        data: The actual response data
        error: Error information (if status is error)
        metadata: Response metadata including pagination, timestamps, etc.
        message: Optional message from the server
    """

    status: str = Field(description="Response status: 'ok' or 'error'")
    data: Optional[Any] = Field(default=None, description="Response data payload")
    error: Optional[ApiError] = Field(default=None, description="Error details if present")
    metadata: Optional[dict] = Field(default=None, description="Response metadata")
    message: Optional[str] = Field(default=None, description="Optional server message")

    def is_success(self) -> bool:
        """
        Check if the response indicates success.

        Returns:
            True if status is 'ok', False otherwise
        """
        return self.status == "ok"

    def is_error(self) -> bool:
        """
        Check if the response indicates an error.

        Returns:
            True if status is 'error', False otherwise
        """
        return self.status == "error"

    def __str__(self) -> str:
        """Return string representation."""
        if self.is_success():
            return f"ApiResponse(status=ok, data_type={type(self.data).__name__})"
        else:
            return f"ApiResponse(status=error, {self.error})"
