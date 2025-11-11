"""
API request and response exceptions
"""

from typing import Optional, Dict, Any

from .base import TaskMasterError


class APIError(TaskMasterError):
    """
    Base exception for API errors.

    Represents errors returned by the Task Master API server.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        code: str = "API_ERROR",
        response_data: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize APIError.

        Args:
            message: Error message
            status_code: HTTP status code
            code: Error code from API
            response_data: Full response data from API
        """
        super().__init__(message, code=code, status_code=status_code)
        self.response_data = response_data or {}


class BadRequestError(APIError):
    """
    Raised when the request is invalid (HTTP 400).

    This includes malformed requests, invalid parameters, or validation errors.
    """

    def __init__(self, message: str = "Bad request", response_data: Optional[Dict] = None):
        super().__init__(message, status_code=400, code="BAD_REQUEST", response_data=response_data)


class NotFoundError(APIError):
    """
    Raised when a requested resource is not found (HTTP 404).

    The resource may have been deleted or the ID may be incorrect.
    """

    def __init__(self, message: str = "Resource not found", response_data: Optional[Dict] = None):
        super().__init__(message, status_code=404, code="NOT_FOUND", response_data=response_data)


class ConflictError(APIError):
    """
    Raised when there is a conflict with the request (HTTP 409).

    This may include duplicate entries or state conflicts.
    """

    def __init__(self, message: str = "Conflict", response_data: Optional[Dict] = None):
        super().__init__(message, status_code=409, code="CONFLICT", response_data=response_data)


class ServerError(APIError):
    """
    Raised when the server encounters an error (HTTP 5xx).

    This indicates a server-side problem that is temporary or permanent.
    """

    def __init__(self, message: str = "Server error", response_data: Optional[Dict] = None):
        super().__init__(
            message, status_code=500, code="SERVER_ERROR", response_data=response_data
        )


class RateLimitError(APIError):
    """
    Raised when the rate limit is exceeded (HTTP 429).

    The client should back off and retry the request after some delay.
    """

    def __init__(self, message: str = "Rate limit exceeded", response_data: Optional[Dict] = None):
        super().__init__(
            message, status_code=429, code="RATE_LIMITED", response_data=response_data
        )


class ServiceUnavailableError(APIError):
    """
    Raised when the service is temporarily unavailable (HTTP 503).

    The client should retry the request after some delay.
    """

    def __init__(
        self, message: str = "Service unavailable", response_data: Optional[Dict] = None
    ):
        super().__init__(
            message, status_code=503, code="SERVICE_UNAVAILABLE", response_data=response_data
        )
