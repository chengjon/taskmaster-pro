"""
Validation exceptions for data models
"""

from typing import Any, Dict, List, Optional

from .base import TaskMasterError


class ValidationErrorDetail:
    """
    Represents a single validation error detail.

    Attributes:
        field: The field that failed validation
        message: The error message
        code: The validation error code
        value: The invalid value that was provided
    """

    def __init__(
        self, field: str, message: str, code: str = None, value: Any = None
    ) -> None:
        """
        Initialize ValidationErrorDetail.

        Args:
            field: Field name that failed validation
            message: Human-readable error message
            code: Error code for the validation failure
            value: The value that failed validation
        """
        self.field = field
        self.message = message
        self.code = code
        self.value = value

    def __repr__(self) -> str:
        """Return detailed representation."""
        return (
            f"ValidationErrorDetail(field={self.field!r}, message={self.message!r}, "
            f"code={self.code!r})"
        )

    def __str__(self) -> str:
        """Return string representation."""
        if self.code:
            return f"{self.field}: [{self.code}] {self.message}"
        return f"{self.field}: {self.message}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "field": self.field,
            "message": self.message,
            "code": self.code,
            "value": self.value,
        }


class ValidationError(TaskMasterError):
    """
    Raised when data validation fails.

    This includes invalid data types, missing required fields, or constraint violations.
    """

    def __init__(
        self,
        message: str = "Validation failed",
        errors: Optional[List[ValidationErrorDetail]] = None,
    ):
        """
        Initialize ValidationError.

        Args:
            message: General error message
            errors: List of specific validation error details
        """
        super().__init__(message, code="VALIDATION_ERROR")
        self.errors = errors or []

    def __str__(self) -> str:
        """Return string representation including all errors."""
        lines = [super().__str__()]
        for error in self.errors:
            lines.append(f"  - {error}")
        return "\n".join(lines)

    def add_error(self, error: ValidationErrorDetail) -> None:
        """
        Add a validation error.

        Args:
            error: ValidationErrorDetail to add
        """
        self.errors.append(error)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "message": self.message,
            "code": self.code,
            "errors": [error.to_dict() for error in self.errors],
        }
