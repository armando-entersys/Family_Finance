"""
Integration tests for debts endpoints.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


class TestDebtCreate:
    """Tests for POST /api/v1/debts/"""

    async def test_create_bank_debt(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_debt_data: dict,
    ):
        """Test creating a bank debt."""
        response = await client.post(
            "/api/v1/debts/",
            json=sample_debt_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["creditor"] == sample_debt_data["creditor"]
        assert data["debt_type"] == "BANK"
        assert float(data["total_amount"]) == sample_debt_data["total_amount"]
        assert float(data["current_balance"]) == sample_debt_data["total_amount"]

    async def test_create_personal_debt(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test creating a personal debt."""
        response = await client.post(
            "/api/v1/debts/",
            json={
                "creditor": "Uncle John",
                "total_amount": 2000.00,
                "debt_type": "PERSONAL",
                "description": "Loan for car repair",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["debt_type"] == "PERSONAL"

    async def test_create_multi_currency_debt(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test creating debt in foreign currency."""
        response = await client.post(
            "/api/v1/debts/",
            json={
                "creditor": "US Bank",
                "total_amount": 1000.00,
                "debt_type": "BANK",
                "currency_code": "USD",
                "exchange_rate_fixed": 17.50,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["currency_code"] == "USD"
        assert float(data["amount_in_base_currency"]) == 17500.00


class TestDebtPayments:
    """Tests for debt payment endpoints (BR-004: Immutable)."""

    async def test_add_payment(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test adding a payment to a debt."""
        # Create debt
        create_response = await client.post(
            "/api/v1/debts/",
            json={
                "creditor": "Test Creditor",
                "total_amount": 1000.00,
                "debt_type": "PERSONAL",
            },
            headers=auth_headers,
        )
        debt_id = create_response.json()["id"]

        # Add payment
        response = await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"amount": 200.00, "notes": "First payment"},
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert float(data["amount"]) == 200.00
        assert data["is_adjustment"] is False

    async def test_payment_updates_balance(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that payment updates debt balance."""
        # Create debt
        create_response = await client.post(
            "/api/v1/debts/",
            json={
                "creditor": "Balance Test",
                "total_amount": 1000.00,
                "debt_type": "PERSONAL",
            },
            headers=auth_headers,
        )
        debt_id = create_response.json()["id"]

        # Add payment
        await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"amount": 300.00},
            headers=auth_headers,
        )

        # Check updated balance
        response = await client.get(
            f"/api/v1/debts/{debt_id}",
            headers=auth_headers,
        )

        data = response.json()
        assert float(data["current_balance"]) == 700.00  # 1000 - 300

    async def test_create_adjustment(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test creating an adjustment entry (BR-004)."""
        # Create debt
        create_response = await client.post(
            "/api/v1/debts/",
            json={
                "creditor": "Adjustment Test",
                "total_amount": 1000.00,
                "debt_type": "PERSONAL",
            },
            headers=auth_headers,
        )
        debt_id = create_response.json()["id"]

        # Add payment
        payment_response = await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"amount": 200.00},
            headers=auth_headers,
        )
        payment_id = payment_response.json()["id"]

        # Create adjustment
        response = await client.post(
            f"/api/v1/debts/{debt_id}/adjustments",
            json={
                "original_payment_id": payment_id,
                "adjustment_amount": -50.00,
                "notes": "Correction: payment was only 150",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["is_adjustment"] is True


class TestDebtSummary:
    """Tests for GET /api/v1/debts/summary"""

    async def test_get_summary(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test getting debt summary."""
        # Create some debts
        await client.post(
            "/api/v1/debts/",
            json={"creditor": "Bank A", "total_amount": 5000, "debt_type": "BANK"},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/debts/",
            json={"creditor": "Friend", "total_amount": 2000, "debt_type": "PERSONAL"},
            headers=auth_headers,
        )

        response = await client.get(
            "/api/v1/debts/summary",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "total_debts" in data
        assert "total_balance_mxn" in data
        assert "by_type" in data
        assert data["total_debts"] >= 2


class TestDebtList:
    """Tests for GET /api/v1/debts/"""

    async def test_list_debts(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test listing debts."""
        response = await client.get(
            "/api/v1/debts/",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_list_excludes_archived(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that archived debts are excluded by default."""
        # Create and pay off a debt (should auto-archive)
        create_response = await client.post(
            "/api/v1/debts/",
            json={"creditor": "To Archive", "total_amount": 100, "debt_type": "PERSONAL"},
            headers=auth_headers,
        )
        debt_id = create_response.json()["id"]

        # Pay it off completely
        await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"amount": 100.00},
            headers=auth_headers,
        )

        # List without archived
        response = await client.get(
            "/api/v1/debts/",
            headers=auth_headers,
        )

        data = response.json()
        debt_ids = [d["id"] for d in data]
        assert debt_id not in debt_ids

    async def test_list_includes_archived(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test including archived debts."""
        response = await client.get(
            "/api/v1/debts/",
            params={"include_archived": True},
            headers=auth_headers,
        )

        assert response.status_code == 200
