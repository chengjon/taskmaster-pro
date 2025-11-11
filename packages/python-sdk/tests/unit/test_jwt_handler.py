"""
Unit tests for JWT token handler
"""

import pytest
from datetime import datetime, timedelta
import jwt

from taskmaster.auth import JWTHandler
from taskmaster.exceptions import TokenExpiredError, InvalidTokenError


class TestJWTHandler:
    """Test JWT handler functionality"""

    @pytest.fixture
    def jwt_handler(self):
        """Create a JWT handler for testing"""
        return JWTHandler(secret="test-secret")

    @pytest.fixture
    def valid_payload(self):
        """Create a valid JWT payload"""
        return {
            "sub": "user-123",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "iat": datetime.utcnow(),
            "email": "user@example.com",
        }

    def test_jwt_handler_init(self):
        """Test JWTHandler initialization"""
        handler = JWTHandler(secret="my-secret")
        assert handler.secret == "my-secret"
        assert handler.algorithms == ["HS256"]
        assert handler.verify is True

    def test_jwt_handler_custom_algorithms(self):
        """Test JWTHandler with custom algorithms"""
        handler = JWTHandler(secret="secret", algorithms=["HS256", "RS256"])
        assert handler.algorithms == ["HS256", "RS256"]

    def test_jwt_handler_no_verification(self):
        """Test JWTHandler without verification"""
        handler = JWTHandler(secret="secret", verify=False)
        assert handler.verify is False

    def test_encode_token(self, jwt_handler, valid_payload):
        """Test encoding a JWT token"""
        token = jwt_handler.encode(valid_payload)
        assert isinstance(token, str)
        assert len(token.split(".")) == 3  # JWT has 3 parts

    def test_encode_token_with_expiration(self, jwt_handler):
        """Test encoding a token with expiration time"""
        payload = {"sub": "user-123"}
        token = jwt_handler.encode(payload, expires_in=3600)  # 1 hour

        decoded = jwt_handler.decode(token)
        assert "exp" in decoded
        assert decoded["exp"] > datetime.utcnow().timestamp()

    def test_decode_token(self, jwt_handler, valid_payload):
        """Test decoding a valid token"""
        token = jwt_handler.encode(valid_payload)
        decoded = jwt_handler.decode(token)

        assert decoded["sub"] == "user-123"
        assert decoded["email"] == "user@example.com"

    def test_decode_expired_token(self, jwt_handler):
        """Test decoding an expired token"""
        expired_payload = {
            "sub": "user-123",
            "exp": datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
        }
        token = jwt_handler.encode(expired_payload)

        with pytest.raises(TokenExpiredError):
            jwt_handler.decode(token)

    def test_decode_invalid_token(self, jwt_handler):
        """Test decoding an invalid token"""
        with pytest.raises(InvalidTokenError):
            jwt_handler.decode("invalid.token.here")

    def test_decode_malformed_token(self, jwt_handler):
        """Test decoding a malformed token"""
        with pytest.raises(InvalidTokenError):
            jwt_handler.decode("not-a-token")

    def test_is_expired_valid_token(self, jwt_handler, valid_payload):
        """Test is_expired with valid token"""
        token = jwt_handler.encode(valid_payload)
        assert jwt_handler.is_expired(token) is False

    def test_is_expired_expired_token(self, jwt_handler):
        """Test is_expired with expired token"""
        expired_payload = {
            "sub": "user-123",
            "exp": datetime.utcnow() - timedelta(hours=1),
        }
        token = jwt_handler.encode(expired_payload)
        assert jwt_handler.is_expired(token) is True

    def test_is_expired_invalid_token(self, jwt_handler):
        """Test is_expired with invalid token"""
        assert jwt_handler.is_expired("invalid.token") is True

    def test_get_payload_without_verification(self, jwt_handler, valid_payload):
        """Test getting payload without verification"""
        token = jwt_handler.encode(valid_payload)
        payload = jwt_handler.get_payload_without_verification(token)

        assert payload["sub"] == "user-123"
        assert payload["email"] == "user@example.com"

    def test_get_payload_without_verification_invalid_token(self, jwt_handler):
        """Test getting payload from invalid token"""
        with pytest.raises(InvalidTokenError):
            jwt_handler.get_payload_without_verification("invalid.token")

    def test_get_expiration_time_valid_token(self, jwt_handler, valid_payload):
        """Test getting expiration time from valid token"""
        token = jwt_handler.encode(valid_payload)
        exp_time = jwt_handler.get_expiration_time(token)

        assert exp_time is not None
        assert isinstance(exp_time, datetime)
        assert exp_time > datetime.utcnow()

    def test_get_expiration_time_token_without_exp(self, jwt_handler):
        """Test getting expiration time from token without exp"""
        payload = {"sub": "user-123"}
        token = jwt_handler.encode(payload)
        exp_time = jwt_handler.get_expiration_time(token)

        assert exp_time is None

    def test_get_expiration_time_invalid_token(self, jwt_handler):
        """Test getting expiration time from invalid token"""
        with pytest.raises(InvalidTokenError):
            jwt_handler.get_expiration_time("invalid.token")

    def test_get_time_to_expiration(self, jwt_handler):
        """Test getting time remaining until expiration"""
        expires_in = 3600  # 1 hour
        payload = {"sub": "user-123"}
        token = jwt_handler.encode(payload, expires_in=expires_in)
        time_to_exp = jwt_handler.get_time_to_expiration(token)

        assert time_to_exp is not None
        assert time_to_exp.total_seconds() > 3500  # Allow some time drift
        assert time_to_exp.total_seconds() < 3610

    def test_get_time_to_expiration_no_exp(self, jwt_handler):
        """Test getting time to expiration when no exp is set"""
        payload = {"sub": "user-123"}
        token = jwt_handler.encode(payload)
        time_to_exp = jwt_handler.get_time_to_expiration(token)

        assert time_to_exp is None

    def test_get_time_to_expiration_expired_token(self, jwt_handler):
        """Test getting time to expiration for expired token"""
        expired_payload = {
            "sub": "user-123",
            "exp": datetime.utcnow() - timedelta(hours=1),
        }
        token = jwt_handler.encode(expired_payload)
        time_to_exp = jwt_handler.get_time_to_expiration(token)

        assert time_to_exp is not None
        assert time_to_exp.total_seconds() < 0


class TestJWTHandlerWithRS256:
    """Test JWT handler with RS256 algorithm"""

    @pytest.fixture
    def rsa_keys(self):
        """Generate RSA key pair for testing"""
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.backends import default_backend

        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend(),
        )
        public_key = private_key.public_key()

        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )

        return private_pem.decode(), public_pem.decode()

    def test_rs256_token_creation_and_validation(self, rsa_keys):
        """Test RS256 token creation and validation"""
        private_key, public_key = rsa_keys

        # Create token with private key
        encoder = JWTHandler(secret=private_key, algorithms=["RS256"])
        payload = {"sub": "user-123"}
        token = encoder.encode(payload, algorithm="RS256")

        # Validate token with public key
        decoder = JWTHandler(secret=public_key, algorithms=["RS256"])
        decoded = decoder.decode(token)

        assert decoded["sub"] == "user-123"


class TestJWTHandlerErrorHandling:
    """Test error handling in JWT handler"""

    def test_invalid_secret_key(self):
        """Test with invalid secret key"""
        handler = JWTHandler(secret="secret1")
        payload = {"sub": "user-123"}
        token = handler.encode(payload)

        # Try to decode with different secret
        handler_with_wrong_secret = JWTHandler(secret="secret2")
        with pytest.raises(InvalidTokenError):
            handler_with_wrong_secret.decode(token)

    def test_token_with_wrong_algorithm(self):
        """Test token created with different algorithm"""
        payload = {"sub": "user-123"}
        # Create token with HS256
        handler_hs256 = JWTHandler(secret="secret", algorithms=["HS256"])
        token = handler_hs256.encode(payload)

        # Try to decode with RS256 only (should fail)
        handler_rs256 = JWTHandler(secret="secret", algorithms=["RS256"])
        with pytest.raises(InvalidTokenError):
            handler_rs256.decode(token)

    def test_encode_with_invalid_algorithm(self):
        """Test encoding with invalid algorithm"""
        handler = JWTHandler(secret="secret")
        payload = {"sub": "user-123"}

        # This should work (we don't validate algorithm at encode time in PyJWT)
        # But let's test with an actual invalid algorithm format
        with pytest.raises(InvalidTokenError):
            handler.encode(payload, algorithm="INVALID_ALGO")

    def test_decode_with_verification_disabled(self):
        """Test decoding with verification disabled"""
        handler_with_verify = JWTHandler(secret="secret1", verify=True)
        payload = {"sub": "user-123"}
        token = handler_with_verify.encode(payload)

        # Decode with different secret but verification disabled
        handler_no_verify = JWTHandler(secret="secret2", verify=False)
        decoded = handler_no_verify.decode(token)
        assert decoded["sub"] == "user-123"
