#!/bin/bash
# Development helper scripts

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Functions
show_help() {
    echo "FamilyFinance Development Scripts"
    echo ""
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup       Install dependencies and setup environment"
    echo "  run         Run development server"
    echo "  test        Run all tests"
    echo "  test:unit   Run unit tests only"
    echo "  test:int    Run integration tests only"
    echo "  lint        Run linters"
    echo "  format      Format code"
    echo "  migrate     Run database migrations"
    echo "  migrate:new Create new migration"
    echo "  docker      Build and run with Docker"
    echo "  clean       Clean up cache and temp files"
    echo ""
}

setup() {
    echo -e "${GREEN}Setting up development environment...${NC}"

    # Create virtual environment
    python -m venv .venv
    source .venv/bin/activate

    # Install dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install pytest pytest-asyncio pytest-cov httpx aiosqlite ruff mypy

    # Copy .env if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env from .env.example - please configure it${NC}"
    fi

    echo -e "${GREEN}Setup complete!${NC}"
}

run_dev() {
    echo -e "${GREEN}Starting development server...${NC}"
    uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
}

run_tests() {
    echo -e "${GREEN}Running all tests...${NC}"
    pytest tests/ -v --cov=src --cov-report=term-missing
}

run_unit_tests() {
    echo -e "${GREEN}Running unit tests...${NC}"
    pytest tests/unit -v
}

run_integration_tests() {
    echo -e "${GREEN}Running integration tests...${NC}"
    pytest tests/integration -v
}

run_lint() {
    echo -e "${GREEN}Running linters...${NC}"
    ruff check src/
    mypy src/ --ignore-missing-imports
}

format_code() {
    echo -e "${GREEN}Formatting code...${NC}"
    ruff format src/
    ruff check src/ --fix
}

run_migrate() {
    echo -e "${GREEN}Running migrations...${NC}"
    alembic upgrade head
}

create_migration() {
    if [ -z "$1" ]; then
        echo -e "${RED}Please provide migration message${NC}"
        echo "Usage: ./scripts/dev.sh migrate:new 'migration message'"
        exit 1
    fi
    echo -e "${GREEN}Creating new migration: $1${NC}"
    alembic revision --autogenerate -m "$1"
}

run_docker() {
    echo -e "${GREEN}Building and running with Docker...${NC}"
    docker compose build
    docker compose up -d
    echo -e "${GREEN}Application running at http://localhost:8000${NC}"
}

clean() {
    echo -e "${GREEN}Cleaning up...${NC}"
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
    find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
    find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    echo -e "${GREEN}Clean complete!${NC}"
}

# Main
case "$1" in
    setup)
        setup
        ;;
    run)
        run_dev
        ;;
    test)
        run_tests
        ;;
    test:unit)
        run_unit_tests
        ;;
    test:int)
        run_integration_tests
        ;;
    lint)
        run_lint
        ;;
    format)
        format_code
        ;;
    migrate)
        run_migrate
        ;;
    migrate:new)
        create_migration "$2"
        ;;
    docker)
        run_docker
        ;;
    clean)
        clean
        ;;
    *)
        show_help
        ;;
esac
