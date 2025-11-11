"""
Unit tests for Task Master SDK exceptions
"""

import pytest

from taskmaster.exceptions import (
    TaskMasterError,
    AuthenticationError,
    TokenExpiredError,
    InvalidTokenError,
    MissingCredentialsError,
    APIError,
    BadRequestError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ServerError,
    ServiceUnavailableError,
    ValidationError,
)


class TestTaskMasterError:
    """Test base TaskMasterError"""

    def test_error_creation(self):
        """Test error creation with message"""
        error = TaskMasterError("Test error")
        assert error.message == "Test error"
        assert error.code is None
        assert error.status_code is None

    def test_error_with_code_and_status(self):
        """Test error with code and status_code"""
        error = TaskMasterError(
            message="Test error", code="TEST_ERROR", status_code=400
        )
        assert error.message == "Test error"
        assert error.code == "TEST_ERROR"
        assert error.status_code == 400

    def test_error_repr(self):
        """Test error __repr__"""
        error = TaskMasterError("Test", code="TEST", status_code=400)
        repr_str = repr(error)
        assert "TaskMasterError" in repr_str
        assert "Test" in repr_str

    def test_error_str_with_code(self):
        """Test error __str__ with code"""
        error = TaskMasterError("Test error", code="TEST_CODE")
        assert str(error) == "[TEST_CODE] Test error"

    def test_error_str_without_code(self):
        """Test error __str__ without code"""
        error = TaskMasterError("Test error")
        assert str(error) == "Test error"

    def test_error_is_exception(self):
        """Test TaskMasterError is an Exception"""
        error = TaskMasterError("Test")
        assert isinstance(error, Exception)


class TestAuthenticationError:
    """Test authentication-related exceptions"""

    def test_authentication_error(self):
        """Test AuthenticationError"""
        error = AuthenticationError("Auth failed")
        assert error.message == "Auth failed"
        assert error.code == "AUTH_ERROR"
        assert error.status_code == 401

    def test_authentication_error_default_message(self):
        """Test AuthenticationError with default message"""
        error = AuthenticationError()
        assert error.message == "Authentication failed"

    def test_token_expired_error(self):
        """Test TokenExpiredError"""
        error = TokenExpiredError("Token expired")
        assert error.message == "Token expired"
        assert isinstance(error, AuthenticationError)

    def test_token_expired_error_default_message(self):
        """Test TokenExpiredError with default message"""
        error = TokenExpiredError()
        assert "expired" in error.message.lower()

    def test_invalid_token_error(self):
        """Test InvalidTokenError"""
        error = InvalidTokenError("Invalid token format")
        assert error.message == "Invalid token format"
        assert isinstance(error, AuthenticationError)

    def test_missing_credentials_error(self):
        """Test MissingCredentialsError"""
        error = MissingCredentialsError("Token is missing")
        assert error.message == "Token is missing"
        assert isinstance(error, AuthenticationError)


class TestAPIError:
    """Test API-related exceptions"""

    def test_api_error(self):
        """Test APIError"""
        error = APIError("Server error", status_code=500, code="SERVER_ERROR")
        assert error.message == "Server error"
        assert error.status_code == 500
        assert error.code == "SERVER_ERROR"

    def test_api_error_with_response_data(self):
        """Test APIError with response data"""
        response_data = {"error": "Internal error", "trace": "trace_id"}
        error = APIError(
            "Server error",
            status_code=500,
            response_data=response_data,
        )
        assert error.response_data == response_data

    def test_bad_request_error(self):
        """Test BadRequestError (400)"""
        error = BadRequestError("Invalid input")
        assert error.status_code == 400
        assert error.code == "BAD_REQUEST"

    def test_not_found_error(self):
        """Test NotFoundError (404)"""
        error = NotFoundError("Resource not found")
        assert error.status_code == 404
        assert error.code == "NOT_FOUND"

    def test_conflict_error(self):
        """Test ConflictError (409)"""
        error = ConflictError("Resource conflict")
        assert error.status_code == 409
        assert error.code == "CONFLICT"

    def test_rate_limit_error(self):
        """Test RateLimitError (429)"""
        error = RateLimitError("Rate limit exceeded")
        assert error.status_code == 429
        assert "RATE" in error.code or "LIMIT" in error.code

    def test_server_error(self):
        """Test ServerError (500)"""
        error = ServerError("Internal server error")
        assert error.status_code == 500
        assert error.code == "SERVER_ERROR"

    def test_service_unavailable_error(self):
        """Test ServiceUnavailableError (503)"""
        error = ServiceUnavailableError("Service unavailable")
        assert error.status_code == 503
        assert error.code == "SERVICE_UNAVAILABLE"


class TestValidationError:
    """Test validation errors"""

    def test_validation_error(self):
        """Test ValidationError"""
        error = ValidationError("Invalid data")
        assert error.message == "Invalid data"
        assert "VALIDATION" in error.code or error.code is not None


class TestExceptionHierarchy:
    """Test exception hierarchy and type checking"""

    def test_auth_errors_inherit_from_authentication(self):
        """Test auth errors inherit from AuthenticationError"""
        token_error = TokenExpiredError()
        invalid_error = InvalidTokenError()
        missing_error = MissingCredentialsError()

        assert isinstance(token_error, AuthenticationError)
        assert isinstance(invalid_error, AuthenticationError)
        assert isinstance(missing_error, AuthenticationError)

    def test_api_errors_inherit_from_api_error(self):
        """Test specific API errors inherit from APIError"""
        assert isinstance(BadRequestError(), APIError)
        assert isinstance(NotFoundError(), APIError)
        assert isinstance(ConflictError(), APIError)
        assert isinstance(RateLimitError(), APIError)
        assert isinstance(ServerError(), APIError)
        assert isinstance(ServiceUnavailableError(), APIError)

    def test_all_errors_inherit_from_task_master_error(self):
        """Test all errors inherit from TaskMasterError"""
        errors = [
            AuthenticationError(),
            TokenExpiredError(),
            InvalidTokenError(),
            MissingCredentialsError(),
            BadRequestError(),
            NotFoundError(),
            ConflictError(),
            RateLimitError(),
            ServerError(),
            ServiceUnavailableError(),
            ValidationError(),
        ]

        for error in errors:
            assert isinstance(error, TaskMasterError)

    def test_all_errors_are_exceptions(self):
        """Test all errors are Exceptions"""
        errors = [
            AuthenticationError(),
            TokenExpiredError(),
            InvalidTokenError(),
            MissingCredentialsError(),
            BadRequestError(),
            NotFoundError(),
            ConflictError(),
            RateLimitError(),
            ServerError(),
            ServiceUnavailableError(),
            ValidationError(),
        ]

        for error in errors:
            assert isinstance(error, Exception)


class TestExceptionRaising:
    """Test raising and catching exceptions"""

    def test_raise_and_catch_task_master_error(self):
        """Test raising and catching TaskMasterError"""
        with pytest.raises(TaskMasterError):
            raise TaskMasterError("Test error")

    def test_raise_and_catch_authentication_error(self):
        """Test raising and catching AuthenticationError"""
        with pytest.raises(AuthenticationError):
            raise AuthenticationError("Auth failed")

    def test_raise_and_catch_token_expired(self):
        """Test raising and catching TokenExpiredError"""
        with pytest.raises(TokenExpiredError):
            raise TokenExpiredError()

    def test_raise_and_catch_not_found(self):
        """Test raising and catching NotFoundError"""
        with pytest.raises(NotFoundError):
            raise NotFoundError("Task not found")

    def test_catch_specific_then_general(self):
        """Test catching specific exception before general"""
        with pytest.raises(AuthenticationError):
            try:
                raise TokenExpiredError()
            except NotFoundError:
                pass  # Should not catch here
            except AuthenticationError:
                raise  # Should catch here

    def test_error_message_propagation(self):
        """Test error message propagates correctly"""
        message = "Custom error message"
        with pytest.raises(NotFoundError) as exc_info:
            raise NotFoundError(message)
        assert message in str(exc_info.value)

    def test_error_attributes_accessible(self):
        """Test error attributes are accessible after raising"""
        with pytest.raises(ServerError) as exc_info:
            raise ServerError("Server failed", response_data={"error": "test"})

        error = exc_info.value
        assert error.message == "Server failed"
        assert error.status_code == 500
        assert error.response_data == {"error": "test"}
