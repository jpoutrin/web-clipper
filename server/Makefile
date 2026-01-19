.PHONY: help dev build test clean migrate users-list users-show users-set-storage users-disable users-enable package-snapshot package-release package-arm64 package-local package-test

# Default target - show help
.DEFAULT_GOAL := help

# SQLite requires CGO and build tags
GO_BUILD_FLAGS := -tags sqlite
CGO_ENV := CGO_ENABLED=1

# CLI tools (run via go run to avoid PATH issues)
SODA := go run -tags sqlite github.com/gobuffalo/pop/v6/soda@latest
GRIFT := go run -tags sqlite github.com/gobuffalo/grift@latest

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
	$(CGO_ENV) $(SODA) migrate -c database.yml -e development

# Create a new migration
migrate-new:
	@read -p "Migration name: " name; \
	$(CGO_ENV) $(SODA) generate fizz $$name -c database.yml

# Reset database (drop, create, migrate)
db-reset:
	$(CGO_ENV) $(SODA) drop -c database.yml -e development
	$(CGO_ENV) $(SODA) create -c database.yml -e development
	$(CGO_ENV) $(SODA) migrate -c database.yml -e development

# Clean build artifacts
clean:
	rm -rf bin/ tmp/ node_modules/

# Install dependencies
deps:
	go mod download
	@command -v goreleaser >/dev/null 2>&1 || { echo "Installing goreleaser..."; go install github.com/goreleaser/goreleaser@latest; }

# User management CLI commands
users-list:
	$(CGO_ENV) $(GRIFT) users:list

users-show:
ifndef EMAIL
	$(error EMAIL is required. Usage: make users-show EMAIL=user@example.com)
endif
	$(CGO_ENV) $(GRIFT) users:show --email=$(EMAIL)

users-set-storage:
ifndef EMAIL
	$(error EMAIL is required. Usage: make users-set-storage EMAIL=user@example.com PATH=/path/to/storage)
endif
	$(CGO_ENV) $(GRIFT) users:set-storage --email=$(EMAIL) --path=$(PATH)

users-disable:
ifndef EMAIL
	$(error EMAIL is required. Usage: make users-disable EMAIL=user@example.com)
endif
	$(CGO_ENV) $(GRIFT) users:disable --email=$(EMAIL)

users-enable:
ifndef EMAIL
	$(error EMAIL is required. Usage: make users-enable EMAIL=user@example.com)
endif
	$(CGO_ENV) $(GRIFT) users:enable --email=$(EMAIL)

# Packaging targets (requires goreleaser)
# Build for current platform only (no cross-compilation, for local testing)
package-local:
	goreleaser build --snapshot --clean --single-target

# Build all platforms (requires cross-compilation tools on Linux, or use Docker)
package-snapshot:
	goreleaser release --snapshot --clean

package-release:
	goreleaser release --clean

# Build ARM64 package using Docker (for cross-compilation from non-ARM hosts)
package-arm64:
	docker build -f packaging/Dockerfile.build -t web-clipper-builder .
	docker run --rm -v $(PWD)/dist:/build/dist web-clipper-builder

# Test full build in GitHub Actions-like environment
package-test:
	docker build -f packaging/Dockerfile.github-runner -t web-clipper-gh-runner .
	docker run --rm -v $(PWD):/workspace -w /workspace web-clipper-gh-runner

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
	@echo "User management:"
	@echo "  users-list        - List all users"
	@echo "  users-show        - Show user details (EMAIL=x)"
	@echo "  users-set-storage - Set user storage path (EMAIL=x PATH=y)"
	@echo "  users-disable     - Disable a user (EMAIL=x)"
	@echo "  users-enable      - Enable a user (EMAIL=x)"
	@echo ""
	@echo "Packaging:"
	@echo "  package-local     - Build for current platform only (no cross-compile)"
	@echo "  package-test      - Test full build in GitHub Actions-like Docker env"
	@echo "  package-snapshot  - Build all platforms (requires cross-compile tools)"
	@echo "  package-release   - Build release package"
	@echo "  package-arm64     - Build ARM64 package via Docker"
	@echo ""
	@echo "Note: All targets include -tags sqlite for SQLite support"
