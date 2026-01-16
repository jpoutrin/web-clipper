# Web Clipper Project

## Project Structure

- `server/` - Go/Buffalo backend with SQLite
- `extension/` - Chrome Extension (Manifest V3)
- `tech-specs/` - Technical specifications
- `tasks/` - Task tracking

## Server Development

### Prerequisites
- Go 1.21+
- Buffalo CLI (`go install github.com/gobuffalo/cli/cmd/buffalo@latest`)
- CGO enabled (required for SQLite)

### Running the Server

Use the Makefile in `server/`:

```bash
cd server

# Development with hot reload (recommended)
make dev

# Or run directly
make run

# Build production binary
make build

# Run tests
make test

# Database migrations
make migrate
make db-reset
```

**Important:** Always use `CGO_ENABLED=1` when building/running (Makefile handles this).

### Dev Mode

Set `DEV_MODE=true` to bypass OAuth authentication:

```bash
DEV_MODE=true make dev
```

This enables:
- `/auth/dev-token` endpoint for getting tokens without OAuth
- Authentication bypass with a pre-configured dev user

## Extension Development

```bash
cd extension
npm install
npm run build    # Build for production
npm run watch    # Build with watch mode
```

Load unpacked extension from `extension/dist/` in Chrome.

## API Endpoints

- `GET /auth/dev-token` - Get dev tokens (dev mode only)
- `GET /api/v1/config` - Server configuration
- `POST /api/v1/clips` - Create a clip
