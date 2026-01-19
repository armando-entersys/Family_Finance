"""
Unit tests for security module.
"""

import uuid
import pytest
from datetime import timedelta

from src.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_access_token,
    verify_refresh_token,
    decode_token,
)


class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_hash_password_creates_hash(self):
        """Test that hash_password creates a hash."""
        password = "testpassword123"
        hashed = hash_password(password)

        assert hashed is not None
        assert hashed != password
        assert len(hashed) > 0

    def test_hash_password_different_each_time(self):
        """Test that same password produces different hashes (salting)."""
        password = "testpassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "testpassword123"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = hash_password(password)

        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_empty(self):
        """Test password verification with empty password."""
        password = "testpassword123"
        hashed = hash_password(password)

        assert verify_password("", hashed) is False


class TestJWTTokens:
    """Tests for JWT token functions."""

    def test_create_access_token(self):
        """Test access token creation."""
        user_id = uuid.uuid4()
        role = "ADMIN"

        token = create_access_token(subject=user_id, role=role)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self):
        """Test refresh token creation."""
        user_id = uuid.uuid4()

        token = create_refresh_token(subject=user_id)

        assert token is not None
        assert isinstance(token, str)

    def test_verify_access_token_valid(self):
        """Test verification of valid access token."""
        user_id = uuid.uuid4()
        role = "MEMBER"

        token = create_access_token(subject=user_id, role=role)
        payload = verify_access_token(token)

        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["role"] == role
        assert payload["type"] == "access"

    def test_verify_refresh_token_valid(self):
        """Test verification of valid refresh token."""
        user_id = uuid.uuid4()

        token = create_refresh_token(subject=user_id)
        payload = verify_refresh_token(token)

        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "refresh"

    def test_verify_access_token_with_refresh_token(self):
        """Test that refresh token fails access token verification."""
        user_id = uuid.uuid4()

        token = create_refresh_token(subject=user_id)
        payload = verify_access_token(token)

        assert payload is None

    def test_verify_refresh_token_with_access_token(self):
        """Test that access token fails refresh token verification."""
        user_id = uuid.uuid4()

        token = create_access_token(subject=user_id, role="ADMIN")
        payload = verify_refresh_token(token)

        assert payload is None

    def test_decode_invalid_token(self):
        """Test decoding invalid token."""
        invalid_token = "invalid.token.here"
        payload = decode_token(invalid_token)

        assert payload is None

    def test_token_with_custom_expiry(self):
        """Test token creation with custom expiry."""
        user_id = uuid.uuid4()
        custom_expiry = timedelta(hours=1)

        token = create_access_token(
            subject=user_id,
            role="ADMIN",
            expires_delta=custom_expiry,
        )

        payload = verify_access_token(token)
        assert payload is not None
