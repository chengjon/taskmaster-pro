"""
Main Task Master Pro SDK Client

This module provides the primary TaskMasterClient class for interacting with
the Task Master Pro API.
"""

import logging
from typing import Dict, List, Optional, Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .exceptions import (
    TaskMasterError,
    AuthenticationError,
    MissingCredentialsError,
    APIError,
    BadRequestError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ServerError,
    ServiceUnavailableError,
)
from .models import Task, SubTask, ApiResponse

logger = logging.getLogger(__name__)


class TaskMasterClient:
    """
    Official Python SDK client for Task Master Pro API.

    This client provides methods for managing tasks, including creating, reading,
    updating, and deleting tasks and subtasks. It handles authentication, error
    handling, and provides a simple interface to all API endpoints.

    Example:
        >>> from taskmaster import TaskMasterClient
        >>> client = TaskMasterClient(
        ...     api_url="http://localhost:3000/api/v1",
        ...     token="your-jwt-token"
        ... )
        >>> tasks = client.list_tasks()
        >>> task = client.get_task("1")
        >>> new_task = client.create_task({
        ...     "title": "My Task",
        ...     "description": "Task description"
        ... })
    """

    def __init__(
        self,
        api_url: str,
        token: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
        retry_backoff: float = 1.0,
    ):
        """
        Initialize TaskMasterClient.

        Args:
            api_url: Base URL of the Task Master API (e.g., http://localhost:3000/api/v1)
            token: JWT authentication token. Required for all protected endpoints.
            timeout: Request timeout in seconds (default: 30)
            max_retries: Maximum number of retries for failed requests (default: 3)
            retry_backoff: Backoff multiplier for retries (default: 1.0)

        Raises:
            ValueError: If api_url is not provided
        """
        if not api_url:
            raise ValueError("api_url is required")

        self.api_url = api_url.rstrip("/")
        self.token = token
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_backoff = retry_backoff

        # Create session with retry strategy
        self.session = requests.Session()
        self._setup_session()

    def _setup_session(self) -> None:
        """Configure session with retry strategy and default headers."""
        # Setup retry strategy
        retry_strategy = Retry(
            total=self.max_retries,
            backoff_factor=self.retry_backoff,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers
        self.session.headers.update({"Content-Type": "application/json"})

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authentication."""
        headers = self.session.headers.copy()

        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        return headers

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Make an HTTP request to the API.

        Args:
            method: HTTP method (GET, POST, PATCH, DELETE, etc.)
            endpoint: API endpoint path (e.g., /tasks, /tasks/1)
            data: Request body data (for POST, PATCH)
            params: Query parameters

        Returns:
            Parsed JSON response

        Raises:
            Various exceptions based on API error responses
        """
        url = f"{self.api_url}{endpoint}"
        headers = self._get_headers()

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers,
                timeout=self.timeout,
            )

            # Handle HTTP errors
            self._handle_response_status(response)

            # Parse JSON response
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise TaskMasterError(f"Request failed: {str(e)}")

    def _handle_response_status(self, response: requests.Response) -> None:
        """
        Check response status and raise appropriate exceptions.

        Args:
            response: Response object

        Raises:
            Appropriate exception based on status code
        """
        if response.status_code < 400:
            return  # Success

        try:
            error_data = response.json()
        except Exception:
            error_data = {}

        message = error_data.get("message", response.reason)
        code = error_data.get("code", "UNKNOWN")

        # Map status codes to exceptions
        if response.status_code == 400:
            raise BadRequestError(message, response_data=error_data)
        elif response.status_code == 401:
            raise AuthenticationError(message)
        elif response.status_code == 404:
            raise NotFoundError(message, response_data=error_data)
        elif response.status_code == 409:
            raise ConflictError(message, response_data=error_data)
        elif response.status_code == 429:
            raise RateLimitError(message, response_data=error_data)
        elif response.status_code >= 500:
            if response.status_code == 503:
                raise ServiceUnavailableError(message, response_data=error_data)
            raise ServerError(message, response_data=error_data)
        else:
            raise APIError(
                message,
                status_code=response.status_code,
                code=code,
                response_data=error_data,
            )

    # ============================================================================
    # Task Management Endpoints
    # ============================================================================

    def list_tasks(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Task]:
        """
        Retrieve a list of all tasks.

        Args:
            status: Filter by task status (pending, in-progress, done, etc.)
            priority: Filter by task priority (low, medium, high, critical)
            limit: Maximum number of tasks to return (default: 50)
            offset: Number of tasks to skip (default: 0)

        Returns:
            List of Task objects

        Raises:
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        params = {"limit": limit, "offset": offset}

        if status:
            params["status"] = status
        if priority:
            params["priority"] = priority

        response = self._make_request("GET", "/tasks", params=params)
        data = response.get("data", [])

        if isinstance(data, list):
            return [Task.from_api_response(task) for task in data]
        return []

    def get_task(self, task_id: str) -> Task:
        """
        Retrieve a specific task by ID.

        Args:
            task_id: The task ID

        Returns:
            Task object

        Raises:
            NotFoundError: If the task doesn't exist
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        response = self._make_request("GET", f"/tasks/{task_id}")
        data = response.get("data", {})
        return Task.from_api_response(data)

    def create_task(self, task_data: Dict[str, Any]) -> Task:
        """
        Create a new task.

        Args:
            task_data: Task data dictionary containing:
                - title (required): Task title
                - description (optional): Task description
                - priority (optional): Task priority
                - status (optional): Task status
                - metadata (optional): Custom metadata

        Returns:
            Created Task object

        Raises:
            BadRequestError: If task data is invalid
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        response = self._make_request("POST", "/tasks", data=task_data)
        data = response.get("data", {})
        return Task.from_api_response(data)

    def update_task(self, task_id: str, task_data: Dict[str, Any]) -> Task:
        """
        Update an existing task.

        Args:
            task_id: The task ID to update
            task_data: Partial task data to update

        Returns:
            Updated Task object

        Raises:
            NotFoundError: If the task doesn't exist
            BadRequestError: If task data is invalid
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        response = self._make_request("PATCH", f"/tasks/{task_id}", data=task_data)
        data = response.get("data", {})
        return Task.from_api_response(data)

    def delete_task(self, task_id: str) -> bool:
        """
        Delete a task.

        Args:
            task_id: The task ID to delete

        Returns:
            True if deletion was successful

        Raises:
            NotFoundError: If the task doesn't exist
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        self._make_request("DELETE", f"/tasks/{task_id}")
        return True

    # ============================================================================
    # SubTask Management Endpoints
    # ============================================================================

    def list_subtasks(self, task_id: str) -> List[SubTask]:
        """
        Retrieve all subtasks for a task.

        Args:
            task_id: The parent task ID

        Returns:
            List of SubTask objects

        Raises:
            NotFoundError: If the task doesn't exist
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        response = self._make_request("GET", f"/tasks/{task_id}/subtasks")
        data = response.get("data", [])

        if isinstance(data, list):
            return [SubTask.from_api_response(subtask) for subtask in data]
        return []

    def get_subtask(self, task_id: str, subtask_id: str) -> SubTask:
        """
        Retrieve a specific subtask.

        Args:
            task_id: The parent task ID
            subtask_id: The subtask ID

        Returns:
            SubTask object

        Raises:
            NotFoundError: If the subtask doesn't exist
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        response = self._make_request("GET", f"/tasks/{task_id}/subtasks/{subtask_id}")
        data = response.get("data", {})
        return SubTask.from_api_response(data)

    def create_subtask(self, task_id: str, subtask_data: Dict[str, Any]) -> SubTask:
        """
        Create a new subtask for a task.

        Args:
            task_id: The parent task ID
            subtask_data: Subtask data dictionary containing:
                - title (required): Subtask title
                - description (optional): Subtask description
                - status (optional): Subtask status
                - metadata (optional): Custom metadata

        Returns:
            Created SubTask object

        Raises:
            NotFoundError: If the task doesn't exist
            BadRequestError: If subtask data is invalid
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        response = self._make_request("POST", f"/tasks/{task_id}/subtasks", data=subtask_data)
        data = response.get("data", {})
        return SubTask.from_api_response(data)

    def update_subtask(
        self, task_id: str, subtask_id: str, subtask_data: Dict[str, Any]
    ) -> SubTask:
        """
        Update an existing subtask.

        Args:
            task_id: The parent task ID
            subtask_id: The subtask ID to update
            subtask_data: Partial subtask data to update

        Returns:
            Updated SubTask object

        Raises:
            NotFoundError: If the subtask doesn't exist
            BadRequestError: If subtask data is invalid
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        response = self._make_request(
            "PATCH", f"/tasks/{task_id}/subtasks/{subtask_id}", data=subtask_data
        )
        data = response.get("data", {})
        return SubTask.from_api_response(data)

    def delete_subtask(self, task_id: str, subtask_id: str) -> bool:
        """
        Delete a subtask.

        Args:
            task_id: The parent task ID
            subtask_id: The subtask ID to delete

        Returns:
            True if deletion was successful

        Raises:
            NotFoundError: If the subtask doesn't exist
            AuthenticationError: If not authenticated
            APIError: If the request fails
        """
        self._make_request("DELETE", f"/tasks/{task_id}/subtasks/{subtask_id}")
        return True

    # ============================================================================
    # Context Manager Support
    # ============================================================================

    def __enter__(self):
        """Enter context manager."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager and cleanup."""
        self.close()

    def close(self) -> None:
        """Close the client session."""
        if self.session:
            self.session.close()

    def __del__(self):
        """Cleanup on object deletion."""
        self.close()
