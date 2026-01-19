"""
Integration tests for goals endpoints.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


class TestGoalCreate:
    """Tests for POST /api/v1/goals/"""

    async def test_create_family_goal(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_goal_data: dict,
    ):
        """Test creating a family goal."""
        response = await client.post(
            "/api/v1/goals/",
            json=sample_goal_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_goal_data["name"]
        assert data["goal_type"] == "FAMILY"
        assert float(data["target_amount"]) == sample_goal_data["target_amount"]
        assert float(data["current_saved"]) == 0

    async def test_create_personal_goal(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test creating a personal goal (BR-003)."""
        response = await client.post(
            "/api/v1/goals/",
            json={
                "name": "My Secret Fund",
                "target_amount": 5000.00,
                "goal_type": "PERSONAL",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["goal_type"] == "PERSONAL"


class TestGoalList:
    """Tests for GET /api/v1/goals/"""

    async def test_list_goals(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test listing goals."""
        # Create some goals
        await client.post(
            "/api/v1/goals/",
            json={"name": "Goal 1", "target_amount": 1000},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/goals/",
            json={"name": "Goal 2", "target_amount": 2000},
            headers=auth_headers,
        )

        response = await client.get(
            "/api/v1/goals/",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2


class TestGoalContributions:
    """Tests for goal contributions."""

    async def test_add_contribution(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test adding a contribution to a goal."""
        # Create goal
        create_response = await client.post(
            "/api/v1/goals/",
            json={"name": "Test Goal", "target_amount": 1000},
            headers=auth_headers,
        )
        goal_id = create_response.json()["id"]

        # Add contribution
        response = await client.post(
            f"/api/v1/goals/{goal_id}/contributions",
            json={"amount": 250.00, "is_withdrawal": False},
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert float(data["amount"]) == 250.00
        assert data["is_withdrawal"] is False

    async def test_withdrawal_contribution(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test withdrawing from a goal."""
        # Create goal and add funds
        create_response = await client.post(
            "/api/v1/goals/",
            json={"name": "Withdrawal Test", "target_amount": 1000},
            headers=auth_headers,
        )
        goal_id = create_response.json()["id"]

        await client.post(
            f"/api/v1/goals/{goal_id}/contributions",
            json={"amount": 500.00, "is_withdrawal": False},
            headers=auth_headers,
        )

        # Withdraw
        response = await client.post(
            f"/api/v1/goals/{goal_id}/contributions",
            json={"amount": 200.00, "is_withdrawal": True},
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["is_withdrawal"] is True

    async def test_withdrawal_exceeds_balance(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test withdrawal that exceeds balance fails."""
        # Create goal with no funds
        create_response = await client.post(
            "/api/v1/goals/",
            json={"name": "Empty Goal", "target_amount": 1000},
            headers=auth_headers,
        )
        goal_id = create_response.json()["id"]

        # Try to withdraw
        response = await client.post(
            f"/api/v1/goals/{goal_id}/contributions",
            json={"amount": 100.00, "is_withdrawal": True},
            headers=auth_headers,
        )

        assert response.status_code == 400


class TestGoalUpdate:
    """Tests for PATCH /api/v1/goals/{id}"""

    async def test_update_goal(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test updating a goal."""
        # Create goal
        create_response = await client.post(
            "/api/v1/goals/",
            json={"name": "Original Name", "target_amount": 1000},
            headers=auth_headers,
        )
        goal_id = create_response.json()["id"]

        # Update
        response = await client.patch(
            f"/api/v1/goals/{goal_id}",
            json={"name": "Updated Name", "target_amount": 2000},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert float(data["target_amount"]) == 2000


class TestGoalDelete:
    """Tests for DELETE /api/v1/goals/{id}"""

    async def test_delete_goal(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test soft-deleting a goal."""
        # Create goal
        create_response = await client.post(
            "/api/v1/goals/",
            json={"name": "To Delete", "target_amount": 1000},
            headers=auth_headers,
        )
        goal_id = create_response.json()["id"]

        # Delete
        response = await client.delete(
            f"/api/v1/goals/{goal_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204
