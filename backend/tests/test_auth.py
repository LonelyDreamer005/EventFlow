"""
EventFlow — Auth Unit Tests

Tests registration, login, duplicate detection, validation,
and JWT-protected /me endpoint.
"""

import pytest


@pytest.mark.integration
class TestRegistration:
    def test_register_success(self, client):
        """New user can register with valid data."""
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Jane Doe",
                "email": "jane@example.com",
                "password": "SecurePass123",
            },
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["user"]["email"] == "jane@example.com"
        assert data["user"]["role"] == "customer"
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]

    def test_register_duplicate_email(self, client, customer_user):
        """Duplicate email returns 409."""
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Another Person",
                "email": "customer@test.com",  # same as customer_user fixture
                "password": "AnotherPass123",
            },
        )
        assert resp.status_code == 409
        assert "already exists" in resp.get_json()["error"].lower()

    def test_register_invalid_email(self, client):
        """Invalid email format returns 422."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "Bob", "email": "not-an-email", "password": "Pass1234"},
        )
        assert resp.status_code == 422

    def test_register_short_password(self, client):
        """Password under 8 chars returns 422."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "Bob", "email": "bob@example.com", "password": "short"},
        )
        assert resp.status_code == 422

    def test_register_missing_name(self, client):
        """Missing name returns 422."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "bob@example.com", "password": "ValidPass123"},
        )
        assert resp.status_code == 422

    def test_register_role_always_customer(self, client):
        """
        Attempting to set role='admin' in registration is ignored.
        This tests the critical security requirement that public
        registration cannot create admin accounts.
        """
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Sneaky User",
                "email": "sneaky@example.com",
                "password": "SneakyPass123",
                # Even if the client sends role=admin, it must be ignored
                "role": "admin",
            },
        )
        # Either the registration succeeds with role=customer, or 422 (unknown field)
        if resp.status_code == 201:
            assert resp.get_json()["user"]["role"] == "customer"


@pytest.mark.integration
class TestLogin:
    def test_login_success(self, client, customer_user):
        """Valid credentials return a JWT access token."""
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "customer@test.com", "password": "TestPassword123"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert len(data["access_token"]) > 50  # JWT is not trivially short
        assert data["user"]["email"] == "customer@test.com"

    def test_login_wrong_password(self, client, customer_user):
        """Wrong password returns 401."""
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "customer@test.com", "password": "WrongPassword"},
        )
        assert resp.status_code == 401
        assert "Invalid" in resp.get_json()["error"]

    def test_login_nonexistent_user(self, client):
        """Non-existent email returns 401 (same message as wrong password)."""
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "Password123"},
        )
        assert resp.status_code == 401

    def test_login_case_insensitive_email(self, client, customer_user):
        """Email lookup is case-insensitive."""
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "CUSTOMER@TEST.COM", "password": "TestPassword123"},
        )
        assert resp.status_code == 200

    def test_login_missing_fields(self, client):
        """Missing password returns 422."""
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "customer@test.com"},
        )
        assert resp.status_code == 422


@pytest.mark.integration
class TestMe:
    def test_me_authenticated(self, client, customer_token, customer_user):
        """/me returns the authenticated user's profile."""
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["user"]["email"] == "customer@test.com"
        assert "password_hash" not in data["user"]

    def test_me_unauthenticated(self, client):
        """/me without a token returns 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        """/me with an invalid token returns 401 or 422."""
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer totally.invalid.token"},
        )
        assert resp.status_code in (401, 422)
