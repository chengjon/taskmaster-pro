"""
Base model for all Task Master models using Pydantic
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel as PydanticBaseModel, ConfigDict


class BaseModel(PydanticBaseModel):
    """
    Base Pydantic model for all Task Master models.

    Provides common configuration and utilities for all models.
    """

    model_config = ConfigDict(
        # Allow population by field name
        populate_by_name=True,
        # Allow arbitrary types (for custom classes)
        arbitrary_types_allowed=True,
        # Use serialization alias for JSON output
        by_alias=True,
    )

    @classmethod
    def from_api_response(cls, data: dict):
        """
        Create a model instance from API response data.

        Handles field name mapping and type conversion.

        Args:
            data: Raw dictionary from API response

        Returns:
            Model instance with parsed data
        """
        return cls(**data)

    def to_api_request(self) -> dict:
        """
        Convert model to API request format.

        Returns:
            Dictionary suitable for sending to API
        """
        return self.model_dump(by_alias=True, exclude_none=True)

    def to_dict(self) -> dict:
        """
        Convert model to plain dictionary.

        Returns:
            Dictionary representation of the model
        """
        return self.model_dump()
