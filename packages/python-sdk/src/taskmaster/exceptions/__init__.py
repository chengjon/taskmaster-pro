"""
Task Master Pro SDK Exception Hierarchy

Provides structured exception handling for API errors, authentication failures,
and validation errors.
"""

from .base import TaskMasterError
from .auth import (
    AuthenticationError,
    TokenExpiredError,
    InvalidTokenError,
    MissingCredentialsError,
)
from .api import (
    APIError,
    BadRequestError,
    NotFoundError,
    ConflictError,
    ServerError,
    RateLimitError,
    ServiceUnavailableError,
)
from .validation import ValidationError, ValidationErrorDetail

__all__ = [
    # Base
    "TaskMasterError",
    # Auth
    "AuthenticationError",
    "TokenExpiredError",
    "InvalidTokenError",
    "MissingCredentialsError",
    # API
    "APIError",
    "BadRequestError",
    "NotFoundError",
    "ConflictError",
    "ServerError",
    "RateLimitError",
    "ServiceUnavailableError",
    # Validation
    "ValidationError",
    "ValidationErrorDetail",
]
