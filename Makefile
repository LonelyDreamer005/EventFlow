# =============================================================================
# EventFlow — Makefile
# Provides convenient developer commands.
# Requires make (install via Chocolatey: choco install make)
# On Windows without make, use the equivalent PowerShell scripts in scripts/
# =============================================================================

.PHONY: help install install-dev lint test test-unit test-integration \
        coverage run-backend run-frontend docker-build docker-up docker-down \
        migrate create-admin clean

# Default target
help:
	@echo "EventFlow — Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make install          Install backend + frontend dependencies"
	@echo "    make install-dev      Install backend dev dependencies"
	@echo "    make lint             Run ruff linter on backend"
	@echo "    make test             Run all backend tests"
	@echo "    make test-unit        Run backend unit tests only"
	@echo "    make test-integration Run backend integration tests (needs PostgreSQL)"
	@echo "    make coverage         Run tests with HTML coverage report"
	@echo "    make run-backend      Start Flask dev server"
	@echo "    make run-frontend     Start Vite dev server"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate          Run Flask-Migrate upgrade"
	@echo "    make create-admin     Prompt to create admin user via CLI"
	@echo ""
	@echo "  Docker:"
	@echo "    make docker-build     Build all Docker images"
	@echo "    make docker-up        Start all services via Docker Compose"
	@echo "    make docker-down      Stop services (preserve data)"
	@echo "    make docker-reset     Stop services AND remove volumes (destructive)"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean            Remove Python caches and build artifacts"

# ─── Install ─────────────────────────────────────────────────────────────────
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm ci

install-dev:
	cd backend && pip install -r requirements-dev.txt
	cd frontend && npm ci

# ─── Lint ────────────────────────────────────────────────────────────────────
lint:
	cd backend && ruff check app/ tests/
	cd frontend && npm run lint

# ─── Tests ───────────────────────────────────────────────────────────────────
test:
	cd backend && python -m pytest -v

test-unit:
	cd backend && python -m pytest -v -m unit

test-integration:
	cd backend && python -m pytest -v -m integration

test-concurrency:
	cd backend && python -m pytest -v -m concurrency

coverage:
	cd backend && python -m pytest --cov=app --cov-report=html --cov-report=term-missing
	@echo "Coverage report: backend/htmlcov/index.html"

frontend-test:
	cd frontend && npm run test

frontend-build:
	cd frontend && npm run build

# ─── Run locally ─────────────────────────────────────────────────────────────
run-backend:
	cd backend && flask run --host=0.0.0.0 --port=5000

run-frontend:
	cd frontend && npm run dev

# ─── Database ────────────────────────────────────────────────────────────────
migrate:
	cd backend && flask db upgrade

create-admin:
	cd backend && flask create-admin

# ─── Docker ──────────────────────────────────────────────────────────────────
docker-build:
	docker compose build --no-cache

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-reset:
	@echo "WARNING: This removes ALL EventFlow volumes including database data!"
	docker compose down -v

docker-logs:
	docker compose logs -f

docker-status:
	docker compose ps

# ─── Cleanup ─────────────────────────────────────────────────────────────────
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -name ".coverage" -delete 2>/dev/null || true
	cd frontend && rm -rf dist/ 2>/dev/null || true
	@echo "Cleaned build artifacts."
