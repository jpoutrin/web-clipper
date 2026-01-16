# Web Clipper Development Server

Start the web-clipper development server with proper environment configuration.

## Usage

Run `make dev` in the server directory to start the development server with hot reload.

## Instructions

Execute the following command to start the development server:

```bash
cd /Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/server && make dev
```

This will:
- Enable CGO (required for SQLite support)
- Enable DEV_MODE (bypasses authentication for local development)
- Start Buffalo with hot reload (auto-restarts on file changes)

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `CGO_ENABLED` | `1` | Required for SQLite database driver |
| `DEV_MODE` | `true` | Bypasses authentication for local development |

## Available Makefile Targets

The server Makefile (`server/Makefile`) provides these targets:

| Target | Description |
|--------|-------------|
| `make dev` | Start development server with hot reload (DEV_MODE=true) |
| `make run` | Run server directly without buffalo dev |
| `make build` | Build production binary |
| `make test` | Run tests |
| `make migrate` | Run database migrations |
| `make migrate-new` | Create a new migration (interactive) |
| `make db-reset` | Reset development database (drop, create, migrate) |
| `make clean` | Remove build artifacts (bin/, tmp/, node_modules/) |
| `make deps` | Install Go and npm dependencies |
| `make help` | Show all available targets |

## Prerequisites

Before starting the server, ensure:

1. **Dependencies installed**: Run `make deps` if this is a fresh clone
2. **Database migrated**: Run `make migrate` to apply database migrations
3. **Go and Buffalo installed**: The server uses the Buffalo framework

## Troubleshooting

- **CGO errors**: Ensure you have a C compiler installed (Xcode Command Line Tools on macOS)
- **Database errors**: Try `make db-reset` to reset the development database
- **Port in use**: The server runs on port 3000 by default; kill any conflicting processes
