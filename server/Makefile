.PHONY: dev build test clean migrate

# Development server with hot reload
dev:
	CGO_ENABLED=1 DEV_MODE=true buffalo dev

# Development server without buffalo (direct go run)
run:
	CGO_ENABLED=1 DEV_MODE=true go run ./cmd/app

# Build production binary
build:
	CGO_ENABLED=1 buffalo build -o bin/clipper

# Run tests
test:
	CGO_ENABLED=1 buffalo test

# Run database migrations
migrate:
	CGO_ENABLED=1 buffalo pop migrate

# Create a new migration
migrate-new:
	@read -p "Migration name: " name; \
	CGO_ENABLED=1 buffalo pop generate fizz $$name

# Reset database (drop, create, migrate)
db-reset:
	CGO_ENABLED=1 buffalo pop drop -e development
	CGO_ENABLED=1 buffalo pop create -e development
	CGO_ENABLED=1 buffalo pop migrate -e development

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
	@echo "  dev          - Start development server with hot reload (DEV_MODE=true)"
	@echo "  run          - Run server directly without buffalo dev"
	@echo "  build        - Build production binary"
	@echo "  test         - Run tests"
	@echo "  migrate      - Run database migrations"
	@echo "  migrate-new  - Create a new migration"
	@echo "  db-reset     - Reset development database"
	@echo "  clean        - Remove build artifacts"
	@echo "  deps         - Install dependencies"
