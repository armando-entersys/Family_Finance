"""
Integration tests for transaction endpoints.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


class TestTransactionCreate:
    """Tests for POST /api/v1/transactions/"""

    async def test_create_expense(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_transaction_data: dict,
    ):
        """Test creating an expense transaction."""
        response = await client.post(
            "/api/v1/transactions/",
            json=sample_transaction_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "EXPENSE"
        assert float(data["amount_original"]) == sample_transaction_data["amount_original"]
        assert data["currency_code"] == "MXN"
        assert "id" in data
        assert "sync_id" in data

    async def test_create_income(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test creating an income transaction."""
        response = await client.post(
            "/api/v1/transactions/",
            json={
                "amount_original": 5000.00,
                "type": "INCOME",
                "currency_code": "MXN",
                "description": "Salary",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "INCOME"
        assert float(data["amount_base"]) == 5000.00

    async def test_create_multi_currency(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test creating transaction in foreign currency."""
        response = await client.post(
            "/api/v1/transactions/",
            json={
                "amount_original": 100.00,
                "type": "INCOME",
                "currency_code": "USD",
                "exchange_rate": 17.50,
                "description": "Remittance",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["currency_code"] == "USD"
        assert float(data["amount_base"]) == 1750.00  # 100 * 17.50

    async def test_create_unauthorized(
        self,
        client: AsyncClient,
        sample_transaction_data: dict,
    ):
        """Test creating transaction without auth."""
        response = await client.post(
            "/api/v1/transactions/",
            json=sample_transaction_data,
        )

        assert response.status_code == 401


class TestTransactionList:
    """Tests for GET /api/v1/transactions/"""

    async def test_list_transactions(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test listing transactions."""
        # Create some transactions first
        for i in range(3):
            await client.post(
                "/api/v1/transactions/",
                json={
                    "amount_original": 100.00 * (i + 1),
                    "type": "EXPENSE",
                    "currency_code": "MXN",
                },
                headers=auth_headers,
            )

        response = await client.get(
            "/api/v1/transactions/",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 3

    async def test_list_with_pagination(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test transaction list pagination."""
        response = await client.get(
            "/api/v1/transactions/",
            params={"page": 1, "size": 10},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 10

    async def test_list_filter_by_type(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test filtering transactions by type."""
        # Create income and expense
        await client.post(
            "/api/v1/transactions/",
            json={"amount_original": 100, "type": "INCOME", "currency_code": "MXN"},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/transactions/",
            json={"amount_original": 50, "type": "EXPENSE", "currency_code": "MXN"},
            headers=auth_headers,
        )

        # Filter by INCOME
        response = await client.get(
            "/api/v1/transactions/",
            params={"type": "INCOME"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["type"] == "INCOME"


class TestTransactionDetail:
    """Tests for GET /api/v1/transactions/{id}"""

    async def test_get_transaction(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_transaction_data: dict,
    ):
        """Test getting transaction by ID."""
        # Create transaction
        create_response = await client.post(
            "/api/v1/transactions/",
            json=sample_transaction_data,
            headers=auth_headers,
        )
        tx_id = create_response.json()["id"]

        # Get transaction
        response = await client.get(
            f"/api/v1/transactions/{tx_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == tx_id

    async def test_get_nonexistent_transaction(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test getting non-existent transaction."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/api/v1/transactions/{fake_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestTransactionUpdate:
    """Tests for PATCH /api/v1/transactions/{id}"""

    async def test_update_transaction(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_transaction_data: dict,
    ):
        """Test updating a transaction."""
        # Create transaction
        create_response = await client.post(
            "/api/v1/transactions/",
            json=sample_transaction_data,
            headers=auth_headers,
        )
        tx_id = create_response.json()["id"]

        # Update transaction
        response = await client.patch(
            f"/api/v1/transactions/{tx_id}",
            json={"description": "Updated description", "amount_original": 200.00},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated description"
        assert float(data["amount_original"]) == 200.00


class TestTransactionDelete:
    """Tests for DELETE /api/v1/transactions/{id}"""

    async def test_delete_transaction(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_transaction_data: dict,
    ):
        """Test deleting a transaction."""
        # Create transaction
        create_response = await client.post(
            "/api/v1/transactions/",
            json=sample_transaction_data,
            headers=auth_headers,
        )
        tx_id = create_response.json()["id"]

        # Delete transaction
        response = await client.delete(
            f"/api/v1/transactions/{tx_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204

        # Verify deleted
        get_response = await client.get(
            f"/api/v1/transactions/{tx_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404
