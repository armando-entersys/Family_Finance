"""
Pytest configuration and fixtures.
"""

import asyncio
from typing import AsyncGenerator, Generator
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from src.main import app
from src.domain.models import Base, User, Family
from src.core.security import hash_password
from src.infra.database import get_db_session


# Test database URL (SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_family(db_session: AsyncSession) -> Family:
    """Create a test family."""
    family = Family(
        id=uuid.uuid4(),
        name="Test Family",
        settings={},
    )
    db_session.add(family)
    await db_session.commit()
    await db_session.refresh(family)
    return family


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_family: Family) -> User:
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash=hash_password("testpassword123"),
        family_id=test_family.id,
        role="ADMIN",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict:
    """Get authentication headers for test user."""
    from src.core.security import create_access_token

    token = create_access_token(subject=test_user.id, role=test_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_transaction_data() -> dict:
    """Sample transaction data for testing."""
    return {
        "amount_original": 150.50,
        "currency_code": "MXN",
        "exchange_rate": 1.0,
        "type": "EXPENSE",
        "description": "Test transaction",
    }


@pytest.fixture
def sample_goal_data() -> dict:
    """Sample goal data for testing."""
    return {
        "name": "Vacation Fund",
        "target_amount": 10000.00,
        "currency_code": "MXN",
        "goal_type": "FAMILY",
        "icon": "beach_access",
    }


@pytest.fixture
def sample_debt_data() -> dict:
    """Sample debt data for testing."""
    return {
        "creditor": "Bank ABC",
        "total_amount": 5000.00,
        "debt_type": "BANK",
        "currency_code": "MXN",
        "interest_rate": 12.5,
    }
