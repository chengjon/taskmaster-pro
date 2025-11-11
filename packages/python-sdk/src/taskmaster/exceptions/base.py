"""
Base exception class for Task Master Pro SDK
"""


class TaskMasterError(Exception):
    """
    Base exception for all Task Master Pro SDK errors.

    This is the parent class for all custom exceptions in the SDK.
    Catching this exception will catch any error that the SDK raises.
    """

    def __init__(self, message: str, code: str = None, status_code: int = None):
        """
        Initialize TaskMasterError.

        Args:
            message: Human-readable error message
            code: Optional error code for categorization
            status_code: Optional HTTP status code
        """
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)

    def __repr__(self) -> str:
        """Return detailed representation of the error."""
        return (
            f"{self.__class__.__name__}(message={self.message!r}, "
            f"code={self.code!r}, status_code={self.status_code})"
        )

    def __str__(self) -> str:
        """Return string representation of the error."""
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message
