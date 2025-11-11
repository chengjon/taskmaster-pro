"""
Authentication and authorization exceptions
"""

from .base import TaskMasterError


class AuthenticationError(TaskMasterError):
    """
    Raised when authentication fails.

    This includes missing credentials, invalid tokens, or failed login attempts.
    """

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, code="AUTH_ERROR", status_code=401)


class TokenExpiredError(AuthenticationError):
    """
    Raised when a JWT token has expired.

    The client should refresh the token and retry the request.
    """

    def __init__(self, message: str = "Token has expired"):
        super().__init__(message)
        self.code = "TOKEN_EXPIRED"


class InvalidTokenError(AuthenticationError):
    """
    Raised when a JWT token is invalid or malformed.

    The token may be corrupted, have an invalid signature, or be from an unknown issuer.
    """

    def __init__(self, message: str = "Invalid token"):
        super().__init__(message)
        self.code = "INVALID_TOKEN"


class MissingCredentialsError(AuthenticationError):
    """
    Raised when required credentials are missing.

    The client must provide a valid API key or authentication token.
    """

    def __init__(self, message: str = "Missing credentials"):
        super().__init__(message)
        self.code = "MISSING_CREDENTIALS"
