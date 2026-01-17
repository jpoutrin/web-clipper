.PHONY: help dev build test clean migrate

# Default target - show help
.DEFAULT_GOAL := help

# SQLite requires CGO and build tags
GO_BUILD_FLAGS := -tags sqlite
CGO_ENV := CGO_ENABLED=1

# Development server (DEV_MODE bypasses auth)
dev:
	$(CGO_ENV) DEV_MODE=true go run $(GO_BUILD_FLAGS) ./cmd/app

# Run server in production mode (requires OAuth config)
run:
	$(CGO_ENV) go run $(GO_BUILD_FLAGS) ./cmd/app

# Build production binary
build:
	$(CGO_ENV) go build $(GO_BUILD_FLAGS) -o bin/clipper ./cmd/app

# Run tests
test:
	$(CGO_ENV) go test $(GO_BUILD_FLAGS) ./...

# Run database migrations
migrate:
	$(CGO_ENV) soda migrate -c database.yml -e development

# Create a new migration
migrate-new:
	@read -p "Migration name: " name; \
	$(CGO_ENV) soda generate fizz $$name -c database.yml

# Reset database (drop, create, migrate)
db-reset:
	$(CGO_ENV) soda drop -c database.yml -e development
	$(CGO_ENV) soda create -c database.yml -e development
	$(CGO_ENV) soda migrate -c database.yml -e development

# Clean build artifacts
clean:
	rm -rf bin/ tmp/ node_modules/

# Install dependencies
deps:
	go mod download
	npm install

# Help
help:
	@echo "Available targets:"
	@echo "  dev          - Start development server (DEV_MODE=true, no OAuth required)"
	@echo "  run          - Run server in production mode (requires OAuth env vars)"
	@echo "  build        - Build production binary to bin/clipper"
	@echo "  test         - Run tests"
	@echo "  migrate      - Run database migrations"
	@echo "  migrate-new  - Create a new migration"
	@echo "  db-reset     - Reset development database"
	@echo "  clean        - Remove build artifacts"
	@echo "  deps         - Install dependencies"
	@echo ""
	@echo "Note: All targets include -tags sqlite for SQLite support"
