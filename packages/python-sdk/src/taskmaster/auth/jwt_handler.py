"""
JWT token handling and validation
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import jwt

from ..exceptions import TokenExpiredError, InvalidTokenError


class JWTHandler:
    """
    Handles JWT token validation and decoding.

    Supports HS256 and RS256 algorithms. Validates token expiration
    and optional claims.
    """

    def __init__(self, secret: str, algorithms: list = None, verify: bool = True):
        """
        Initialize JWT handler.

        Args:
            secret: Secret key for HS256 or public key for RS256
            algorithms: List of allowed algorithms (default: ['HS256'])
            verify: Whether to verify the signature (default: True)
        """
        self.secret = secret
        self.algorithms = algorithms or ["HS256"]
        self.verify = verify

    def decode(self, token: str) -> Dict[str, Any]:
        """
        Decode and validate a JWT token.

        Args:
            token: JWT token string

        Returns:
            Decoded payload dictionary

        Raises:
            TokenExpiredError: If the token has expired
            InvalidTokenError: If the token is invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=self.algorithms,
                options={"verify_signature": self.verify},
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise InvalidTokenError(f"Invalid token: {str(e)}")

    def encode(
        self,
        payload: Dict[str, Any],
        algorithm: str = "HS256",
        expires_in: Optional[int] = None,
    ) -> str:
        """
        Encode a JWT token.

        Args:
            payload: Dictionary to encode as token
            algorithm: Algorithm to use (default: HS256)
            expires_in: Expiration time in seconds (optional)

        Returns:
            Encoded JWT token string

        Raises:
            InvalidTokenError: If encoding fails
        """
        try:
            if expires_in:
                payload = payload.copy()
                payload["exp"] = datetime.utcnow() + timedelta(seconds=expires_in)

            return jwt.encode(payload, self.secret, algorithm=algorithm)
        except Exception as e:
            raise InvalidTokenError(f"Failed to encode token: {str(e)}")

    def is_expired(self, token: str) -> bool:
        """
        Check if a token has expired without raising exceptions.

        Args:
            token: JWT token string

        Returns:
            True if token is expired, False otherwise
        """
        try:
            # First try to decode with verification
            jwt.decode(token, self.secret, algorithms=self.algorithms)
            return False
        except jwt.ExpiredSignatureError:
            return True
        except jwt.InvalidTokenError:
            # If token is invalid for other reasons, consider it "expired"
            return True

    def get_payload_without_verification(self, token: str) -> Dict[str, Any]:
        """
        Decode a token without verifying the signature.

        Use with caution - only for debugging or when you don't need signature validation.

        Args:
            token: JWT token string

        Returns:
            Decoded payload dictionary

        Raises:
            InvalidTokenError: If the token is malformed
        """
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            raise InvalidTokenError(f"Failed to decode token: {str(e)}")

    def get_expiration_time(self, token: str) -> Optional[datetime]:
        """
        Get the expiration time of a token.

        Args:
            token: JWT token string

        Returns:
            datetime object of expiration time, or None if not set

        Raises:
            InvalidTokenError: If the token is malformed
        """
        payload = self.get_payload_without_verification(token)
        exp_timestamp = payload.get("exp")

        if exp_timestamp:
            return datetime.utcfromtimestamp(exp_timestamp)
        return None

    def get_time_to_expiration(self, token: str) -> Optional[timedelta]:
        """
        Get the time remaining until token expiration.

        Args:
            token: JWT token string

        Returns:
            timedelta until expiration, or None if not set

        Raises:
            InvalidTokenError: If the token is malformed
        """
        expiration = self.get_expiration_time(token)

        if expiration:
            return expiration - datetime.utcnow()
        return None
