# Development helper scripts for Windows PowerShell

param(
    [Parameter(Position=0)]
    [string]$Command,
    [Parameter(Position=1)]
    [string]$Arg1
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Show-Help {
    Write-Host "FamilyFinance Development Scripts" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\scripts\dev.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  setup       Install dependencies and setup environment"
    Write-Host "  run         Run development server"
    Write-Host "  test        Run all tests"
    Write-Host "  test:unit   Run unit tests only"
    Write-Host "  test:int    Run integration tests only"
    Write-Host "  lint        Run linters"
    Write-Host "  format      Format code"
    Write-Host "  migrate     Run database migrations"
    Write-Host "  migrate:new Create new migration"
    Write-Host "  docker      Build and run with Docker"
    Write-Host "  clean       Clean up cache and temp files"
    Write-Host ""
}

function Setup {
    Write-Host "Setting up development environment..." -ForegroundColor Green

    # Create virtual environment
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1

    # Install dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install pytest pytest-asyncio pytest-cov httpx aiosqlite ruff mypy

    # Copy .env if not exists
    if (-not (Test-Path .env)) {
        Copy-Item .env.example .env
        Write-Host "Created .env from .env.example - please configure it" -ForegroundColor Yellow
    }

    Write-Host "Setup complete!" -ForegroundColor Green
}

function Run-Dev {
    Write-Host "Starting development server..." -ForegroundColor Green
    uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
}

function Run-Tests {
    Write-Host "Running all tests..." -ForegroundColor Green
    pytest tests/ -v --cov=src --cov-report=term-missing
}

function Run-UnitTests {
    Write-Host "Running unit tests..." -ForegroundColor Green
    pytest tests/unit -v
}

function Run-IntegrationTests {
    Write-Host "Running integration tests..." -ForegroundColor Green
    pytest tests/integration -v
}

function Run-Lint {
    Write-Host "Running linters..." -ForegroundColor Green
    ruff check src/
    mypy src/ --ignore-missing-imports
}

function Format-Code {
    Write-Host "Formatting code..." -ForegroundColor Green
    ruff format src/
    ruff check src/ --fix
}

function Run-Migrate {
    Write-Host "Running migrations..." -ForegroundColor Green
    alembic upgrade head
}

function Create-Migration {
    param([string]$Message)

    if ([string]::IsNullOrEmpty($Message)) {
        Write-Host "Please provide migration message" -ForegroundColor Red
        Write-Host "Usage: .\scripts\dev.ps1 migrate:new 'migration message'"
        return
    }

    Write-Host "Creating new migration: $Message" -ForegroundColor Green
    alembic revision --autogenerate -m $Message
}

function Run-Docker {
    Write-Host "Building and running with Docker..." -ForegroundColor Green
    docker compose build
    docker compose up -d
    Write-Host "Application running at http://localhost:8000" -ForegroundColor Green
}

function Clean {
    Write-Host "Cleaning up..." -ForegroundColor Green
    Get-ChildItem -Recurse -Directory -Name "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Recurse -Directory -Name ".pytest_cache" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Recurse -Directory -Name ".mypy_cache" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Recurse -Directory -Name ".ruff_cache" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Clean complete!" -ForegroundColor Green
}

# Main switch
switch ($Command) {
    "setup" { Setup }
    "run" { Run-Dev }
    "test" { Run-Tests }
    "test:unit" { Run-UnitTests }
    "test:int" { Run-IntegrationTests }
    "lint" { Run-Lint }
    "format" { Format-Code }
    "migrate" { Run-Migrate }
    "migrate:new" { Create-Migration -Message $Arg1 }
    "docker" { Run-Docker }
    "clean" { Clean }
    default { Show-Help }
}
