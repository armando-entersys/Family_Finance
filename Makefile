# FamilyFinance Makefile
# Cross-platform development commands

.PHONY: help setup run test lint format migrate docker clean

# Default target
help:
	@echo "FamilyFinance Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  setup       Install dependencies and setup environment"
	@echo "  run         Run development server"
	@echo "  test        Run all tests"
	@echo "  test-unit   Run unit tests only"
	@echo "  test-int    Run integration tests only"
	@echo "  lint        Run linters"
	@echo "  format      Format code"
	@echo "  migrate     Run database migrations"
	@echo "  docker      Build and run with Docker"
	@echo "  docker-build Build Docker image"
	@echo "  clean       Clean up cache and temp files"

# Setup development environment
setup:
	python -m pip install --upgrade pip
	pip install -r requirements.txt
	pip install pytest pytest-asyncio pytest-cov httpx aiosqlite ruff mypy
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env - please configure it"; fi

# Run development server
run:
	uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
test:
	pytest tests/ -v --cov=src --cov-report=term-missing

# Run unit tests
test-unit:
	pytest tests/unit -v

# Run integration tests
test-int:
	pytest tests/integration -v

# Run linters
lint:
	ruff check src/
	mypy src/ --ignore-missing-imports

# Format code
format:
	ruff format src/
	ruff check src/ --fix

# Run migrations
migrate:
	alembic upgrade head

# Create new migration
migrate-new:
	@read -p "Migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

# Build and run with Docker
docker:
	docker compose up -d --build

# Build Docker image only
docker-build:
	docker build -t family-finance:latest .

# Stop Docker containers
docker-stop:
	docker compose down

# View Docker logs
docker-logs:
	docker compose logs -f

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "Cleanup complete!"

# Production deployment
deploy:
	@echo "Deploying to production..."
	docker compose -f docker-compose.yml pull
	docker compose -f docker-compose.yml up -d --force-recreate
	@echo "Deployment complete!"
