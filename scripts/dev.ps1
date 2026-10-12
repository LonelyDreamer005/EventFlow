[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet(
        "help",
        "install",
        "install-dev",
        "lint",
        "lint-fix",
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
        "docker-logs",
        "docker-status",
        "k8s-apply",
        "k8s-delete",
        "k8s-status",
        "hpa-status",
        "load-test",
        "obs-up",
        "obs-down",
        "obs-status",
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
    Write-Host "  lint               Run ruff linting and format checking on backend"
    Write-Host "  lint-fix           Run ruff auto-fixing and code formatting"
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
    Write-Host "  docker-build       Build Docker container images"
    Write-Host "  docker-up          Start all services via Docker Compose"
    Write-Host "  docker-down        Stop Docker services"
    Write-Host "  docker-reset       Stop services and remove database volumes"
    Write-Host "  docker-logs        Stream live Docker container logs"
    Write-Host "  docker-status      Show running Docker container statuses"
    Write-Host "  k8s-apply          Deploy all resources to Kubernetes cluster"
    Write-Host "  k8s-delete         Remove all resources from Kubernetes cluster"
    Write-Host "  k8s-status         Inspect running pods, services, and PVCs in eventflow namespace"
    Write-Host "  hpa-status         Show status of Horizontal Pod Autoscaler"
    Write-Host "  load-test          Execute k6 flash-sale load test (native or docker)"
    Write-Host "  obs-up             Start Prometheus (port 9090) and Grafana (port 3001)"
    Write-Host "  obs-down           Stop Prometheus and Grafana containers"
    Write-Host "  obs-status         Show status of monitoring stack containers"
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
        Write-Host "--> Running ruff linter & format check..." -ForegroundColor Cyan
        ruff check backend/app backend/tests
        ruff format --check backend/app backend/tests
    }

    "lint-fix" {
        Write-Host "--> Running ruff autofix and formatting..." -ForegroundColor Cyan
        ruff check --fix backend/app backend/tests
        ruff format backend/app backend/tests
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
        $env:FLASK_APP = (Join-Path $ProjectRoot "backend\wsgi.py")
        $env:PYTHONPATH = (Join-Path $ProjectRoot "backend")
        python (Join-Path $ProjectRoot "backend\wsgi.py")
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
        $env:FLASK_APP = (Join-Path $ProjectRoot "backend\wsgi.py")
        $env:PYTHONPATH = (Join-Path $ProjectRoot "backend")
        flask db upgrade
    }

    "create-admin" {
        Write-Host "--> Creating administrator account..." -ForegroundColor Cyan
        $env:FLASK_APP = (Join-Path $ProjectRoot "backend\wsgi.py")
        $env:PYTHONPATH = (Join-Path $ProjectRoot "backend")
        flask create-admin
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

    "docker-logs" {
        Write-Host "--> Streaming Docker container logs..." -ForegroundColor Cyan
        docker compose logs -f
    }

    "docker-status" {
        Write-Host "--> Docker container status..." -ForegroundColor Cyan
        docker compose ps
    }

    "k8s-apply" {
        Write-Host "--> Applying Kubernetes manifests to eventflow namespace..." -ForegroundColor Cyan
        kubectl apply -f k8s/namespace.yaml
        if (-not (kubectl get secret eventflow-secrets -n eventflow 2>$null)) {
            Write-Host "--> Creating eventflow-secrets from k8s/secrets.yaml.example..." -ForegroundColor Yellow
            kubectl apply -f k8s/secrets.yaml.example
        }
        kubectl apply -k k8s/
        Write-Host "--> Kubernetes deployment applied successfully!" -ForegroundColor Green
    }

    "k8s-delete" {
        Write-Host "--> Tearing down Kubernetes resources in eventflow namespace..." -ForegroundColor Yellow
        kubectl delete -k k8s/ --ignore-not-found
        kubectl delete namespace eventflow --ignore-not-found
        Write-Host "--> Kubernetes resources removed." -ForegroundColor Green
    }

    "k8s-status" {
        Write-Host "--> Inspecting Kubernetes resources (namespace: eventflow)..." -ForegroundColor Cyan
        kubectl get all,pvc,configmap,hpa -n eventflow
    }

    "hpa-status" {
        Write-Host "--> Inspecting Horizontal Pod Autoscaler (HPA)..." -ForegroundColor Cyan
        kubectl get hpa backend-hpa -n eventflow
        kubectl describe hpa backend-hpa -n eventflow
    }

    "load-test" {
        Write-Host "--> Running k6 flash-sale load test..." -ForegroundColor Cyan
        if (Get-Command k6 -ErrorAction SilentlyContinue) {
            k6 run scripts/k6-load-test.js
        } else {
            Write-Host "--> k6 not found locally; executing via official Docker container..." -ForegroundColor Yellow
            docker run --rm -i --network="host" -v "${ProjectRoot}/scripts:/scripts" grafana/k6 run /scripts/k6-load-test.js
        }
    }

    "obs-up" {
        Write-Host "--> Starting Prometheus (http://localhost:9090) & Grafana (http://localhost:3001)..." -ForegroundColor Cyan
        docker compose up -d prometheus grafana
        Write-Host "--> Observability stack is running!" -ForegroundColor Green
    }

    "obs-down" {
        Write-Host "--> Stopping Prometheus and Grafana..." -ForegroundColor Yellow
        docker compose stop prometheus grafana
    }

    "obs-status" {
        Write-Host "--> Observability stack status..." -ForegroundColor Cyan
        docker compose ps prometheus grafana
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
