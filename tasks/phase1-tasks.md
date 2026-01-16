# Phase 1 Tasks - Web Clipper Implementation

**Source**: [TS-0001](../tech-specs/approved/TS-0001-web-clipper-phase1.md)
**RFC**: RFC-0001
**Generated**: 2026-01-14
**Last Updated**: 2026-01-14

## Progress Summary

| Status | Count |
|--------|-------|
| Completed | 0 |
| In Progress | 0 |
| Pending | 33 |
| **Total** | **33** |

## Task Overview

| Category | Tasks | Estimated Complexity |
|----------|-------|---------------------|
| Backend Setup | 8 | Medium |
| Backend Features | 6 | Medium-High |
| Extension Setup | 5 | Low-Medium |
| Extension Features | 7 | Medium-High |
| Testing | 4 | Medium |
| Deployment | 3 | Low |
| **Total** | **33** | |

---

## 1. Backend Setup (Buffalo)

### 1.1 Install Buffalo CLI
**Priority**: P0 (Blocker)
**Dependencies**: Go 1.21+

```bash
# macOS
brew install gobuffalo/tap/buffalo

# Or from source with SQLite support
go install -tags sqlite github.com/gobuffalo/cli/cmd/buffalo@latest
```

**Acceptance**: `buffalo version` returns valid version

---

### 1.2 Scaffold Buffalo Project
**Priority**: P0 (Blocker)
**Dependencies**: 1.1

```bash
cd /Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper
buffalo new server --api --db-type sqlite3
cd server
```

**Flags explained**:
- `--api`: No frontend assets, webpack, or templates
- `--db-type sqlite3`: Use SQLite (simpler for Phase 1)

**Acceptance**: Project structure created with `actions/`, `models/`, `migrations/`

---

### 1.3 Configure Database Connection
**Priority**: P0 (Blocker)
**Dependencies**: 1.2

Edit `database.yml`:
```yaml
development:
  dialect: sqlite3
  database: ./clipper_development.sqlite3

test:
  dialect: sqlite3
  database: ./clipper_test.sqlite3

production:
  dialect: sqlite3
  database: ${CLIP_DATABASE:-./clipper_production.sqlite3}
```

**Acceptance**: `buffalo pop create -a` creates databases

---

### 1.4 Create User Migration
**Priority**: P0 (Blocker)
**Dependencies**: 1.3

```bash
buffalo pop generate fizz create_users
```

Edit the generated `.up.fizz`:
```fizz
create_table("users") {
  t.Column("id", "uuid", {primary: true})
  t.Column("email", "string", {})
  t.Column("name", "string", {})
  t.Column("oauth_id", "string", {})
  t.Column("clip_directory", "string", {null: true})
  t.Timestamps()
}

add_index("users", "oauth_id", {unique: true})
add_index("users", "email", {})
```

Run migration:
```bash
buffalo pop migrate
```

**Acceptance**: `users` table exists with correct schema

---

### 1.5 Create User Model
**Priority**: P0 (Blocker)
**Dependencies**: 1.4

Create `models/user.go` with:
- User struct with Pop tags
- `Validate()` method
- `FindOrCreateByOAuthID()` method

**Acceptance**: Model compiles, can create/find users

---

### 1.6 Create Application Configuration
**Priority**: P1
**Dependencies**: 1.2

Create `internal/config/config.go`:
- Config struct with YAML tags
- `Load()` function with env var expansion
- Default values for images settings

Create `config/clipper.yaml`:
- OAuth settings (Keycloak)
- Storage settings
- Image limits
- JWT settings

**Acceptance**: Config loads with environment variable substitution

---

### 1.7 Install Go Dependencies
**Priority**: P0 (Blocker)
**Dependencies**: 1.2

```bash
cd server
go get github.com/markbates/goth
go get github.com/markbates/goth/providers/openidConnect
go get github.com/golang-jwt/jwt/v5
go get gopkg.in/yaml.v3
```

**Acceptance**: `go mod tidy` succeeds

---

### 1.8 Setup App Entry Point
**Priority**: P1
**Dependencies**: 1.5, 1.6, 1.7

Modify `actions/app.go`:
- Load configuration
- Setup Goth OAuth provider
- Register routes
- Add CORS middleware

**Acceptance**: `buffalo dev` starts server on port 3000

---

## 2. Backend Features

### 2.1 Implement Auth Login Handler
**Priority**: P0 (Blocker)
**Dependencies**: 1.8

Create/modify `actions/auth.go`:
- `authLogin()` - Initiates OAuth flow via Goth
- Store `redirect` param for extension callback

```bash
buffalo generate action auth login callback refresh logout --skip-template
```

**Acceptance**: `/auth/login` redirects to Keycloak

---

### 2.2 Implement Auth Callback Handler
**Priority**: P0 (Blocker)
**Dependencies**: 2.1

In `actions/auth.go`:
- `authCallback()` - Completes OAuth, creates/finds user
- Generate JWT tokens (access + refresh)
- Redirect to extension with tokens in URL params

**Acceptance**: Callback creates user, returns JWT

---

### 2.3 Implement JWT Middleware
**Priority**: P0 (Blocker)
**Dependencies**: 2.2

In `actions/auth.go`:
- `authMiddleware()` - Validates Bearer token
- Extract user_id, user_email from claims
- Set in context for downstream handlers

**Acceptance**: Protected routes return 401 without valid token

---

### 2.4 Implement Config Endpoint
**Priority**: P1
**Dependencies**: 2.3

Create `actions/config.go`:
- `getConfig()` - Returns user's clip directory and image limits
- Apply middleware to `/api/v1/config`

**Acceptance**: Returns JSON with `clipDirectory`, `images` settings

---

### 2.5 Implement Clips Endpoint
**Priority**: P0 (Blocker)
**Dependencies**: 2.3, 2.4

Create `actions/clips.go`:
- `createClip()` - Main clip creation logic
- Validate image sizes against config
- Create directory structure: `YYYYMMDD_HHMMSS_site-slug/`
- Save images to `media/` subfolder
- Generate YAML frontmatter
- Save Markdown file

Helper functions:
- `generateFrontmatter()`
- `extractDomain()`
- `slugify()`
- `sanitizeFilename()`

**Acceptance**: POST creates files in correct structure

---

### 2.6 Implement Token Refresh
**Priority**: P2
**Dependencies**: 2.3

In `actions/auth.go`:
- `authRefresh()` - Validates refresh token, issues new tokens

**Acceptance**: Refresh endpoint returns new token pair

---

## 3. Extension Setup

### 3.1 Initialize Extension Project
**Priority**: P0 (Blocker)
**Dependencies**: None

```bash
mkdir -p extension && cd extension
npm init -y
npm install -D typescript webpack webpack-cli ts-loader copy-webpack-plugin
npm install -D @types/chrome
```

**Acceptance**: `package.json` and `node_modules/` exist

---

### 3.2 Configure TypeScript
**Priority**: P0 (Blocker)
**Dependencies**: 3.1

Create `tsconfig.json`:
- Target ES2020
- Module ESNext
- Strict mode enabled

**Acceptance**: `tsc --noEmit` passes

---

### 3.3 Configure Webpack
**Priority**: P0 (Blocker)
**Dependencies**: 3.2

Create `webpack.config.js`:
- Entry points: background.ts, content.ts, popup/popup.ts
- Output to `dist/`
- Copy manifest.json and static assets

**Acceptance**: `npm run build` produces `dist/` with all files

---

### 3.4 Create Manifest V3
**Priority**: P0 (Blocker)
**Dependencies**: 3.1

Create `manifest.json`:
- Manifest version 3
- Permissions: activeTab, scripting, storage
- Host permissions: `<all_urls>`
- Background service worker
- Content script for all URLs
- Popup action

**Acceptance**: Extension loads in Chrome (developer mode)

---

### 3.5 Install Content Libraries
**Priority**: P0 (Blocker)
**Dependencies**: 3.1

```bash
npm install turndown @mozilla/readability
npm install -D @types/turndown
```

**Acceptance**: Libraries importable in TypeScript

---

## 4. Extension Features

### 4.1 Create Type Definitions
**Priority**: P0 (Blocker)
**Dependencies**: 3.2

Create `src/types/index.ts`:
- `ServerConfig` interface
- `ClipPayload` interface
- `ClipResponse` interface
- `AuthState` interface

**Acceptance**: Types compile without errors

---

### 4.2 Implement Background Service Worker
**Priority**: P0 (Blocker)
**Dependencies**: 4.1

Create `src/background.ts`:
- State management (authState, serverConfig)
- Message handler with switch for message types
- `initiateLogin()` - Generate login URL
- `logout()` - Clear auth state
- `fetchServerConfig()` - GET /api/v1/config
- `submitClip()` - POST /api/v1/clips
- OAuth callback listener

**Acceptance**: Service worker handles all message types

---

### 4.3 Implement Content Script
**Priority**: P0 (Blocker)
**Dependencies**: 4.1, 3.5

Create `src/content.ts`:
- Listen for CAPTURE_PAGE message
- `capturePage()` - Main capture logic
  - Clone DOM for Readability
  - Extract article content
  - Convert to Markdown with Turndown
  - Custom image rule for local paths
- `extractImages()` - Fetch and process images
- `fetchAndResizeImage()` - Resize to config limits

**Acceptance**: Content script extracts article and images

---

### 4.4 Implement Image Resizing
**Priority**: P1
**Dependencies**: 4.3

In `src/content.ts`:
- Use OffscreenCanvas for resizing
- Calculate dimensions preserving aspect ratio
- Quality reduction loop for oversized images
- Convert to base64

**Acceptance**: Images resized below max dimension and size

---

### 4.5 Create Popup HTML
**Priority**: P1
**Dependencies**: 3.4

Create `src/popup/popup.html`:
- Login section (server URL input, connect button)
- Clip section (title, tags, notes, clip button)
- Status indicator (connected/disconnected)
- Message display area

**Acceptance**: Popup renders both sections

---

### 4.6 Implement Popup Logic
**Priority**: P0 (Blocker)
**Dependencies**: 4.2, 4.5

Create `src/popup/popup.ts`:
- DOM element references
- Initialize state from background
- Login button handler
- Logout button handler
- Clip button handler
  - Send CAPTURE_PAGE to content script
  - Build ClipPayload
  - Send SUBMIT_CLIP to background
- Success/error message display

**Acceptance**: Full clip flow works from popup

---

### 4.7 Create OAuth Callback Page
**Priority**: P1
**Dependencies**: 4.2

Create `src/callback.html` and `src/callback.ts`:
- Parse URL parameters (access_token, refresh_token, expires_at)
- Send to background service worker
- Display success message
- Auto-close tab

**Acceptance**: Callback stores tokens and closes

---

## 5. Testing

### 5.1 Setup Extension Tests
**Priority**: P2
**Dependencies**: 4.3

```bash
cd extension
npm install -D jest @types/jest ts-jest jest-environment-jsdom
```

Create `jest.config.js`
Create `tests/setup.ts` with Chrome API mocks

**Acceptance**: `npm test` runs without errors

---

### 5.2 Write Content Script Tests
**Priority**: P2
**Dependencies**: 5.1

Create `tests/capture.test.ts`:
- Test title extraction
- Test Markdown conversion
- Test image URL mapping

**Acceptance**: Tests pass for basic capture scenarios

---

### 5.3 Setup Backend Tests
**Priority**: P2
**Dependencies**: 2.5

Buffalo generates test scaffolding. Create:
- `actions/auth_test.go`
- `actions/clips_test.go`
- `actions/config_test.go`

**Acceptance**: `buffalo test` passes

---

### 5.4 Write Backend Integration Tests
**Priority**: P2
**Dependencies**: 5.3

In `actions/clips_test.go`:
- Test successful clip creation
- Test image size validation (413 response)
- Test unauthorized access (401 response)

**Acceptance**: All test cases pass

---

## 6. Deployment

### 6.1 Create Dockerfile
**Priority**: P2
**Dependencies**: 2.5

Create `server/Dockerfile`:
- Multi-stage build (builder + runtime)
- Alpine base for small image
- Copy binary and config

**Acceptance**: `docker build` succeeds

---

### 6.2 Create Docker Compose
**Priority**: P2
**Dependencies**: 6.1

Create `docker-compose.yml`:
- Clipper service
- Environment variables
- Volume mounts for clips and config

**Acceptance**: `docker-compose up` starts server

---

### 6.3 Create Extension Package Script
**Priority**: P2
**Dependencies**: 4.6

In `extension/package.json`:
```json
{
  "scripts": {
    "build": "webpack --mode production",
    "package": "npm run build && cd dist && zip -r ../web-clipper.zip ."
  }
}
```

**Acceptance**: `npm run package` creates installable zip

---

## Task Execution Order

### Critical Path (Must complete in order)

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.7 → 1.6 → 1.8
                                            ↓
                              2.1 → 2.2 → 2.3 → 2.4 → 2.5
```

```
3.1 → 3.2 → 3.3 → 3.5 → 3.4
       ↓
      4.1 → 4.2 → 4.3 → 4.4
             ↓
            4.5 → 4.6 → 4.7
```

### Parallelizable

- Backend (1.x, 2.x) and Extension (3.x, 4.x) can be developed in parallel
- Testing (5.x) can start once features are complete
- Deployment (6.x) can be done last

---

## Acceptance Criteria Mapping

| AC ID | Task(s) | Verification |
|-------|---------|--------------|
| AC1 | 2.1, 2.2, 4.6 | Login flow completes |
| AC2 | 4.3 | Content extracted correctly |
| AC3 | 4.4 | Images under limits |
| AC4 | 2.5 | Directory structure correct |
| AC5 | 2.5 | Frontmatter present |
| AC6 | 2.5 | Media folder exists |
| AC7 | 2.5 | 413 for oversized |
| AC8 | 2.4 | Config returns limits |

---

## Work Log

### 2026-01-14 - SESSION START
- Loaded into focus session
- Current progress: 0% (0/33 tasks)
- Next task: 1.1 Install Buffalo CLI
- Parallel track available: 3.1 Initialize Extension Project
