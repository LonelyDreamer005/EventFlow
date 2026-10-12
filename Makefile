# =============================================================================
# EventFlow — Makefile
# Cross-platform developer commands.
# Compatible with Linux, macOS, and Windows (without relying on Unix shell '&&').
# On Windows, you can also use PowerShell natively: .\scripts\dev.ps1 <command>
# =============================================================================

.PHONY: help install install-dev lint test test-unit test-integration \
        test-concurrency coverage run-backend run-frontend frontend-build \
        docker-build docker-up docker-down docker-reset migrate create-admin clean

# Default target
help:
	@echo EventFlow - Available commands:
	@echo.
	@echo   Development:
	@echo     make install          Install backend + frontend dependencies
	@echo     make install-dev      Install backend dev dependencies
	@echo     make lint             Run ruff linter on backend
	@echo     make test             Run all backend tests
	@echo     make test-unit        Run backend unit tests only
	@echo     make test-integration Run backend integration tests (needs PostgreSQL)
	@echo     make test-concurrency Run concurrency stress tests
	@echo     make coverage         Run tests with coverage report
	@echo     make run-backend      Start Flask dev server
	@echo     make run-frontend     Start Vite dev server
	@echo.
	@echo   Database:
	@echo     make migrate          Run Flask-Migrate upgrade
	@echo     make create-admin     Prompt to create admin user via CLI
	@echo.
	@echo   Docker:
	@echo     make docker-build     Build all Docker images
	@echo     make docker-up        Start all services via Docker Compose
	@echo     make docker-down      Stop services (preserve data)
	@echo     make docker-reset     Stop services AND remove volumes (destructive)
	@echo.
	@echo   Cleanup:
	@echo     make clean            Remove Python caches and build artifacts

# ─── Install ─────────────────────────────────────────────────────────────────
install:
	pip install -r backend/requirements.txt
	npm --prefix frontend install

install-dev:
	pip install -r backend/requirements-dev.txt
	npm --prefix frontend install

# ─── Lint ────────────────────────────────────────────────────────────────────
lint:
	ruff check backend/app backend/tests
	npm --prefix frontend run lint

# ─── Tests ───────────────────────────────────────────────────────────────────
test:
	python -m pytest backend/tests -v

test-unit:
	python -m pytest backend/tests -v -m unit

test-integration:
	python -m pytest backend/tests -v -m integration

test-concurrency:
	python -m pytest backend/tests -v -m concurrency

coverage:
	python -m pytest --cov=backend/app --cov-report=html --cov-report=term-missing backend/tests
	@echo Coverage report generated at backend/htmlcov/index.html

frontend-build:
	npm --prefix frontend run build

# ─── Run locally ─────────────────────────────────────────────────────────────
run-backend:
	flask --app backend/wsgi.py run --host=0.0.0.0 --port=5000

run-frontend:
	npm --prefix frontend run dev

# ─── Database ────────────────────────────────────────────────────────────────
migrate:
	flask --app backend/wsgi.py db upgrade

create-admin:
	flask --app backend/wsgi.py create-admin

# ─── Docker ──────────────────────────────────────────────────────────────────
docker-build:
	docker compose build --no-cache

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-reset:
	@echo WARNING: This removes ALL EventFlow volumes including database data!
	docker compose down -v

docker-logs:
	docker compose logs -f

docker-status:
	docker compose ps

# ─── Cleanup (Pure Python: 100% cross-platform, no Unix find/rm needed) ───────
clean:
	python -c "import pathlib, shutil; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__')]; [p.unlink(missing_ok=True) for p in pathlib.Path('.').rglob('*.py[co]')]; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('.pytest_cache')]; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('htmlcov')]; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('dist')]; [p.unlink(missing_ok=True) for p in pathlib.Path('.').rglob('.coverage')]"
	@echo Cleaned build artifacts and cache.
