# Web Clipper Development Server

Start the web-clipper development server with proper environment configuration.

## Usage

Run `make dev` in the server directory to start the development server with hot reload (DEV_MODE, no OAuth required).

Run `make run` to start the server in production mode (requires OAuth configuration).

## Instructions

Execute the following command to start the development server:

```bash
cd /Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/server && make dev
```

This will:
- Enable CGO (required for SQLite support)
- Enable DEV_MODE (bypasses authentication for local development)
- Build with `-tags sqlite` for SQLite support
- Start Buffalo with hot reload (auto-restarts on file changes)

For production mode with OAuth:

```bash
cd /Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/server
OAUTH_PROVIDER=google \
OAUTH_CLIENT_ID=your-client-id \
OAUTH_CLIENT_SECRET=your-client-secret \
make run
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CGO_ENABLED` | `1` | Required for SQLite database driver (set by Makefile) |
| `DEV_MODE` | `false` | Set to `true` to bypass authentication (only for `make dev`) |
| `PORT` | `3000` | Server port |
| `SERVER_BASE_URL` | `http://localhost:3000` | External base URL (for proxy setups) |
| `OAUTH_PROVIDER` | `keycloak` | OAuth provider (`google` or `keycloak`) |
| `OAUTH_CLIENT_ID` | - | OAuth Client ID |
| `OAUTH_CLIENT_SECRET` | - | OAuth Client Secret |
| `OAUTH_REDIRECT_URL` | `http://localhost:3000/auth/callback` | OAuth callback URL (must match Cloud Console) |
| `KEYCLOAK_BASE_URL` | - | Keycloak server URL (if using Keycloak) |

## Available Makefile Targets

The server Makefile (`server/Makefile`) provides these targets:

| Target | Description |
|--------|-------------|
| `make dev` | Start development server with hot reload (DEV_MODE=true, no OAuth) |
| `make run` | Run server in production mode (requires OAuth env vars) |
| `make build` | Build production binary |
| `make test` | Run tests |
| `make migrate` | Run database migrations |
| `make migrate-new` | Create a new migration (interactive) |
| `make db-reset` | Reset development database (drop, create, migrate) |
| `make clean` | Remove build artifacts (bin/, tmp/, node_modules/) |
| `make deps` | Install Go and npm dependencies |
| `make help` | Show all available targets |

**Note:** All targets automatically include `-tags sqlite` for SQLite support.

## Prerequisites

Before starting the server, ensure:

1. **Dependencies installed**: Run `make deps` if this is a fresh clone
2. **Database migrated**: Run `make migrate` to apply database migrations
3. **Go and Buffalo installed**: The server uses the Buffalo framework

## Troubleshooting

- **SQLite not compiled**: All make targets now include `-tags sqlite` automatically
- **CGO errors**: Ensure you have a C compiler installed (Xcode Command Line Tools on macOS)
- **Database errors**: Try `make db-reset` to reset the development database
- **Port in use**: The server runs on port 3000 by default; kill any conflicting processes
- **OAuth not configured**: Set `OAUTH_PROVIDER`, `OAUTH_CLIENT_ID`, and `OAUTH_CLIENT_SECRET` env vars
