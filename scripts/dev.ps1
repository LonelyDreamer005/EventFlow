[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet(
        "help",
        "install",
        "install-dev",
        "lint",
        "test",
        "test-unit",
        "test-integration",
        "test-concurrency",
        "coverage",
        "run-backend",
        "run-frontend",
        "frontend-build",
        "migrate",
        "create-admin",
        "docker-build",
        "docker-up",
        "docker-down",
        "docker-reset",
        "clean"
    )]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Show-Help {
    Write-Host "`nEventFlow - PowerShell Developer CLI" -ForegroundColor Cyan
    Write-Host 'Usage: .\scripts\dev.ps1 [command]' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor White
    Write-Host "  install            Install backend + frontend dependencies"
    Write-Host "  install-dev        Install backend dev dependencies"
    Write-Host "  lint               Run ruff linting on backend"
    Write-Host "  test               Run all backend tests"
    Write-Host "  test-unit          Run unit tests only"
    Write-Host "  test-integration   Run integration tests (requires PostgreSQL)"
    Write-Host "  test-concurrency   Run concurrency stress tests"
    Write-Host "  coverage           Generate test coverage HTML report"
    Write-Host "  run-backend        Start Flask dev server on http://localhost:5000"
    Write-Host "  run-frontend       Start Vite dev server on http://localhost:3000"
    Write-Host "  frontend-build     Build production React/Vite bundle"
    Write-Host "  migrate            Apply database schema migrations"
    Write-Host "  create-admin       Create admin user via Flask CLI"
    Write-Host "  docker-up          Start all services via Docker Compose"
    Write-Host "  docker-down        Stop services"
    Write-Host "  docker-reset       Stop services and remove database volumes"
    Write-Host "  clean              Remove Python caches and build artifacts"
    Write-Host ""
}

Set-Location $ProjectRoot

switch ($Command) {
    "help" {
        Show-Help
    }

    "install" {
        Write-Host "--> Installing backend dependencies..." -ForegroundColor Cyan
        pip install -r backend/requirements.txt
        Write-Host "--> Installing frontend dependencies..." -ForegroundColor Cyan
        npm --prefix frontend install
    }

    "install-dev" {
        Write-Host "--> Installing backend dev dependencies..." -ForegroundColor Cyan
        pip install -r backend/requirements-dev.txt
        Write-Host "--> Installing frontend dependencies..." -ForegroundColor Cyan
        npm --prefix frontend install
    }

    "lint" {
        Write-Host "--> Running ruff linter..." -ForegroundColor Cyan
        ruff check backend/app backend/tests
    }

    "test" {
        Write-Host "--> Running all tests..." -ForegroundColor Cyan
        python -m pytest backend/tests -v
    }

    "test-unit" {
        Write-Host "--> Running unit tests..." -ForegroundColor Cyan
        python -m pytest backend/tests -v -m unit
    }

    "test-integration" {
        Write-Host "--> Running integration tests..." -ForegroundColor Cyan
        python -m pytest backend/tests -v -m integration
    }

    "test-concurrency" {
        Write-Host "--> Running concurrency tests..." -ForegroundColor Cyan
        python -m pytest backend/tests -v -m concurrency
    }

    "coverage" {
        Write-Host "--> Generating coverage report..." -ForegroundColor Cyan
        python -m pytest --cov=backend/app --cov-report=html --cov-report=term-missing backend/tests
        Write-Host "--> Report generated: backend/htmlcov/index.html" -ForegroundColor Green
    }

    "run-backend" {
        Write-Host "--> Starting Flask server on http://localhost:5000..." -ForegroundColor Cyan
        flask --app backend/wsgi.py run --host=0.0.0.0 --port=5000
    }

    "run-frontend" {
        Write-Host "--> Starting Vite server on http://localhost:3000..." -ForegroundColor Cyan
        npm --prefix frontend run dev
    }

    "frontend-build" {
        Write-Host "--> Building frontend bundle..." -ForegroundColor Cyan
        npm --prefix frontend run build
    }

    "migrate" {
        Write-Host "--> Running database migrations..." -ForegroundColor Cyan
        flask --app backend/wsgi.py db upgrade
    }

    "create-admin" {
        Write-Host "--> Creating administrator account..." -ForegroundColor Cyan
        flask --app backend/wsgi.py create-admin
    }

    "docker-build" {
        Write-Host "--> Building Docker containers..." -ForegroundColor Cyan
        docker compose build --no-cache
    }

    "docker-up" {
        Write-Host "--> Starting Docker containers..." -ForegroundColor Cyan
        docker compose up -d
    }

    "docker-down" {
        Write-Host "--> Stopping Docker containers..." -ForegroundColor Cyan
        docker compose down
    }

    "docker-reset" {
        Write-Warning "This removes all EventFlow Docker volumes and database data!"
        docker compose down -v
    }

    "clean" {
        Write-Host "--> Cleaning build artifacts and cache..." -ForegroundColor Cyan
        Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter ".pytest_cache" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter "htmlcov" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter "dist" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $ProjectRoot -Recurse -File -Filter "*.pyc" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $ProjectRoot -Recurse -File -Filter ".coverage" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "--> Clean complete!" -ForegroundColor Green
    }
}
