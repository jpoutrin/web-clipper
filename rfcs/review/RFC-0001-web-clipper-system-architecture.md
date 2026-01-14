# RFC-0001: Web Clipper System Architecture

## Metadata

| Field | Value |
|-------|-------|
| RFC ID | RFC-0001 |
| Title | Web Clipper System Architecture |
| Status | REVIEW |
| Author | [Your Name] |
| Created | 2026-01-14 |
| Last Updated | 2026-01-14 |
| Framework | Buffalo (Go) |
| Related PRDs | - |
| Related Tech Specs | TS-0001 (Phase 1) |

## Overview

This RFC proposes the architecture for a web clipping system consisting of a Chrome extension (TypeScript) and a backend server (Go). The system allows authenticated users to capture web pages as Markdown files with associated media, storing them in a structured local directory.

## Problem Statement

Users need a way to capture web content for offline reading, archival, or knowledge management. Existing solutions often:
- Require cloud storage dependencies
- Don't preserve content in portable formats
- Lack proper authentication for multi-user scenarios
- Store content in proprietary formats

This system addresses these issues by providing a self-hosted solution that stores content as plain Markdown files with images in a user-defined local directory structure.

## Goals and Non-Goals

### Goals
- Capture web page content as clean Markdown
- Preserve main content images
- Support OAuth authentication (Keycloak, Google Workspace)
- Store clips in a structured, user-defined directory
- Minimize server resource usage with Go backend
- Provide seamless browser integration via Chrome extension

### Non-Goals
- Cloud storage integration (S3, GCS, etc.)
- Full page archival (JavaScript, CSS, etc.)
- Browser history synchronization
- Collaborative editing of clips
- Mobile application support (initial version)

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Performance | High | Server must handle concurrent requests with minimal resources |
| Security | High | OAuth integration must be secure; file access must be restricted |
| Usability | High | Extension should be intuitive with minimal friction |
| Maintainability | Medium | Clean separation between extension and server |
| Extensibility | Medium | Easy to add new OAuth providers or export formats |
| Portability | Medium | Markdown format ensures content portability |

## Options Analysis

### Option A: Direct File Write from Extension

**Description**: Extension communicates directly with local filesystem via native messaging host.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Performance | Good | No network latency |
| Security | Poor | Native host runs with user privileges, no auth |
| Usability | Good | Simple setup for single user |
| Maintainability | Poor | Complex native messaging setup |
| Extensibility | Poor | No server means no centralized config |
| Portability | Good | Still uses Markdown |

**Pros**:
- No server required
- Works offline
- Simple for single-user scenarios

**Cons**:
- No authentication (unsuitable for multi-user)
- Complex native messaging setup per platform
- No central configuration management
- Cannot support remote access

### Option B: Go Backend with REST API (Recommended)

**Description**: Chrome extension sends captured content to a Go backend server which handles authentication, file organization, and storage.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Performance | Excellent | Go is highly performant with low memory footprint |
| Security | Excellent | OAuth at server level; proper access control |
| Usability | Good | One-time auth setup; seamless thereafter |
| Maintainability | Excellent | Clear client/server separation |
| Extensibility | Excellent | Easy to add providers, formats, integrations |
| Portability | Good | Markdown format preserved |

**Pros**:
- Proper OAuth authentication flow
- Low resource usage (Go's efficiency)
- Centralized configuration
- Can support multiple users
- Clear API boundaries
- Easy to add features (tags, search, sync)

**Cons**:
- Requires server deployment
- Additional infrastructure to maintain
- Slight network latency

### Option C: Node.js Backend

**Description**: Use Node.js/Express for the backend server.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Performance | Fair | Higher memory usage than Go |
| Security | Good | Mature OAuth libraries available |
| Usability | Good | Same as Option B |
| Maintainability | Good | JavaScript across stack |
| Extensibility | Good | Rich npm ecosystem |
| Portability | Good | Markdown format preserved |

**Pros**:
- Same language as extension (TypeScript/JavaScript)
- Rich ecosystem for web scraping and Markdown

**Cons**:
- Higher memory footprint
- Slower cold start
- Less suitable for resource-constrained deployments

## Recommendation

**Option B: Go Backend with REST API**

This option best meets the stated requirements:
1. **Minimal resource usage**: Go compiles to native code with small binary size and low memory usage
2. **OAuth support**: Well-established OAuth2 libraries for Go (golang.org/x/oauth2)
3. **Structured storage**: Server can enforce directory structure consistently
4. **Multi-user ready**: Proper authentication enables shared deployment

## Technical Design

### Architecture Overview

```
┌─────────────────────┐     HTTPS/JSON      ┌─────────────────────┐
│  Chrome Extension   │ ◄─────────────────► │    Go Backend       │
│    (TypeScript)     │                     │                     │
│                     │                     │  ┌───────────────┐  │
│  - Page capture     │                     │  │ OAuth Handler │  │
│  - MD conversion    │                     │  └───────────────┘  │
│  - Image extraction │                     │  ┌───────────────┐  │
│  - Auth token mgmt  │                     │  │ File Manager  │  │
│                     │                     │  └───────────────┘  │
└─────────────────────┘                     │  ┌───────────────┐  │
                                            │  │ Config Store  │  │
         OAuth Providers                    │  └───────────────┘  │
    ┌─────────────────────┐                 └─────────────────────┘
    │  Keycloak / Google  │                          │
    │    Workspace        │                          ▼
    └─────────────────────┘                 ┌─────────────────────┐
                                            │   Local Filesystem  │
                                            │                     │
                                            │ USER_DEFINED_FOLDER/│
                                            │   web-clips/        │
                                            │     YYYYMMDD_HHMMSS │
                                            │       _site_slug/   │
                                            │         page.md     │
                                            │         media/      │
                                            │           img1.png  │
                                            │           img2.jpg  │
                                            └─────────────────────┘
```

### Component Details

#### Chrome Extension (TypeScript)

**Responsibilities**:
- Capture current page DOM within user context
- Convert HTML to Markdown (using Turndown or similar)
- Extract and base64-encode main content images
- Manage OAuth tokens (storage, refresh)
- Send clip payload to backend

**Key Libraries**:
- `turndown`: HTML to Markdown conversion
- `readability`: Extract main content (Mozilla Readability)
- Chrome Extension APIs: `tabs`, `scripting`, `storage`, `identity`

**Extension Structure**:
```
extension/
├── src/
│   ├── background.ts      # Service worker
│   ├── content.ts         # Content script for page capture
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.ts       # UI for clipping action
│   ├── lib/
│   │   ├── auth.ts        # OAuth token management
│   │   ├── capture.ts     # Page capture logic
│   │   ├── markdown.ts    # HTML to MD conversion
│   │   └── api.ts         # Backend API client
│   └── types/
│       └── index.ts
├── manifest.json
├── package.json
└── tsconfig.json
```

#### Go Backend (Buffalo Framework)

**Responsibilities**:
- Handle OAuth authentication flow
- Validate and refresh tokens
- Receive clip payloads
- Decode and save images to filesystem
- Write Markdown files with proper structure
- Manage user configuration (clip directory)

**Framework Choice**: [Buffalo](https://gobuffalo.io/documentation/) - a Go web development eco-system designed to make the life of a Go web developer easier.

**Why Buffalo**:
- Batteries-included: routing, middleware, templating, asset pipeline
- Built-in database integration (Pop ORM) for URL index and user config
- Generator tools for rapid scaffolding
- Hot reloading in development
- Structured project layout conventions
- Active community and documentation

**Key Libraries**:
- `github.com/gobuffalo/buffalo`: Web framework
- `github.com/gobuffalo/pop`: Database ORM (for URL index, user settings)
- `github.com/markbates/goth`: OAuth providers (supports Keycloak, Google, 60+ providers)
- `golang.org/x/image`: Image processing and resizing
- Standard library: `encoding/json`, `os`, `path/filepath`

**Backend Structure** (Buffalo conventions):
```
server/
├── actions/
│   ├── app.go             # Application setup and middleware
│   ├── auth.go            # OAuth handlers (login, callback, logout)
│   ├── clips.go           # Clip CRUD handlers
│   └── config.go          # User config handlers
├── models/
│   ├── models.go          # Database connection
│   ├── user.go            # User model
│   └── clip_index.go      # URL index for duplicate detection
├── services/
│   ├── storage.go         # Filesystem operations
│   └── images.go          # Image processing (resize, convert)
├── migrations/
│   └── *.fizz             # Database migrations
├── config/
│   └── buffalo-app.toml   # Buffalo configuration
├── main.go
├── go.mod
└── go.sum
```

**Database**: SQLite for single-user deployments, PostgreSQL for multi-user. Buffalo's Pop ORM abstracts the difference.

### API Specification

#### Authentication

**GET /auth/login**
- Initiates OAuth flow
- Redirects to OAuth provider

**GET /auth/callback**
- OAuth callback handler
- Returns JWT or session token

**POST /auth/refresh**
- Refresh expired tokens

#### Clip Operations

**POST /api/v1/clips**
- Submit a new clip
- Request body:
```json
{
  "title": "Page Title",
  "url": "https://example.com/article",
  "markdown": "# Heading\n\nContent...",
  "tags": ["tech", "tutorial"],
  "notes": "User notes about this article",
  "images": [
    {
      "filename": "img1.png",
      "data": "base64-encoded-data",
      "originalUrl": "https://example.com/img1.png"
    }
  ]
}
```
- Response (success):
```json
{
  "success": true,
  "path": "web-clips/20260114_153042_example-com/page-title.md"
}
```
- Response (duplicate - Phase 2):
```json
{
  "success": false,
  "error": "duplicate",
  "existing": {
    "path": "web-clips/20260110_120000_example-com/page-title.md",
    "clipped_at": "2026-01-10T12:00:00Z"
  }
}
```
- Validation errors (limits configurable via server settings):
  - `413 Payload Too Large`: Image exceeds `images.max_size_bytes` or total exceeds `images.max_total_bytes`
  - `400 Bad Request`: Image dimensions exceed `images.max_dimension_px` (if not resized client-side)

**GET /api/v1/config**
- Get user's clip configuration and server constraints
- Extension calls this on startup to configure client-side validation
- Response:
```json
{
  "clipDirectory": "/home/user/Documents/web-clips",
  "defaultFormat": "markdown",
  "images": {
    "maxSizeBytes": 5242880,
    "maxDimensionPx": 2048,
    "maxTotalBytes": 26214400,
    "convertToWebp": true
  }
}
```

### Directory Structure

```
USER_DEFINED_FOLDER/
└── web-clips/
    ├── 20260114_153042_example-com/
    │   ├── article-title.md
    │   └── media/
    │       ├── hero-image.png
    │       └── diagram.jpg
    ├── 20260114_160815_news-site/
    │   ├── breaking-story.md
    │   └── media/
    │       └── photo.webp
    └── ...
```

**Naming Convention**:
- Folder: `YYYYMMDD_HHMMSS_<site-slug>/`
- File: `<page-slug>.md`
- Media: Original filename or sanitized version

### Security Considerations

1. **OAuth Token Storage**: Extension stores tokens in `chrome.storage.local` (encrypted by Chrome)
2. **Token Validation**: Server validates JWT signature on every request
3. **Path Traversal Prevention**: Server sanitizes all filenames to prevent directory traversal
4. **CORS Configuration**: Backend only accepts requests from extension origin
5. **HTTPS Required**: All communication over TLS
6. **User Isolation**: Each user's clips stored in separate directories (multi-user mode)

### Configuration

**Server Configuration (config.yaml)**:
```yaml
server:
  port: 8080
  host: "0.0.0.0"

oauth:
  provider: "keycloak"  # or "google"
  client_id: "${OAUTH_CLIENT_ID}"
  client_secret: "${OAUTH_CLIENT_SECRET}"
  redirect_url: "http://localhost:8080/auth/callback"

  # Keycloak-specific
  keycloak:
    realm: "web-clipper"
    base_url: "https://auth.example.com"

  # Google-specific
  google:
    scopes:
      - "openid"
      - "email"
      - "profile"

storage:
  base_path: "${USER_CLIP_DIRECTORY}"
  create_missing: true

images:
  max_size_bytes: 5242880        # 5 MB per image
  max_dimension_px: 2048         # Longest edge
  max_total_bytes: 26214400      # 25 MB per clip
  preserve_original: false       # Set true to skip resizing
  convert_to_webp: true          # Phase 2: WebP conversion
```

## Migration/Rollout Plan

### Phase 1: Core Implementation
- [ ] Chrome extension with basic capture
- [ ] Go backend with Keycloak OAuth
- [ ] File storage with directory structure
- [ ] Image size limits and client-side resizing
- [ ] YAML frontmatter metadata in Markdown files

### Phase 2: Enhancement
- [ ] Add Google Workspace OAuth
- [ ] Improve Markdown conversion quality
- [ ] Add image optimization (WebP conversion)
- [ ] Offline queue with background sync
- [ ] Duplicate detection with user prompt

### Phase 3: Polish
- [ ] Extension UI improvements (tags, notes input)
- [ ] Error handling and retry logic
- [ ] User preferences (clip format, naming)

## Decisions

### 1. Image Size Limits

**Decision**: Enforce limits at both client and server. **All limits are server-configurable.**

| Constraint | Default | Config Key | Rationale |
|------------|---------|------------|-----------|
| Max file size | 5 MB | `images.max_size_bytes` | Prevents capture of massive uncompressed images |
| Max dimensions | 2048px | `images.max_dimension_px` | Sufficient for readability, reduces storage |
| Total per clip | 25 MB | `images.max_total_bytes` | Prevents runaway clips from image-heavy pages |

**Implementation**:
- Extension fetches limits from `GET /api/v1/config` on startup and caches them
- Extension performs client-side resize before base64 encoding (reduces upload payload)
- Server enforces limits as final validation (in case extension is outdated or bypassed)
- WebP conversion on server reduces size by 25-50% (Phase 2)
- Configuration option `images.preserve_original: true` for power users who need full resolution

### 2. Offline Queue

**Decision**: Implement in Phase 2.

**Design**:
- Store pending clips in `chrome.storage.local` with status: `pending | syncing | failed`
- Background service worker retries on network restore using `navigator.onLine` events
- Extension popup displays queue status (e.g., "3 clips pending sync")
- Max queue size: 10 clips (prevent unbounded storage)
- Failed clips retained for 7 days before auto-purge

**Rationale**: Adds complexity to extension state management. Core flow should work reliably first before adding offline support.

### 3. Duplicate Detection

**Decision**: URL-based detection with user choice (Phase 2).

**Design**:
1. Server maintains URL index (SQLite or JSON file per user)
2. On clip submission, server checks if URL exists in index
3. If duplicate found, server returns `409 Conflict` with existing clip metadata
4. Extension presents dialog with options:
   - **Replace**: Overwrite existing clip (DELETE + POST)
   - **Keep both**: Server adds `-2`, `-3` suffix to folder name
   - **Cancel**: Abort the clip

**MVP Simplification**: For Phase 1, allow duplicates naturally (timestamp folders ensure uniqueness). Add detection in Phase 2.

### 4. Metadata Storage

**Decision**: YAML frontmatter in Markdown files.

**Format**:
```markdown
---
title: "Article Title"
url: https://example.com/article
clipped_at: 2026-01-14T15:30:42Z
source: example.com
tags: []
notes: ""
---

# Article Title

Content here...
```

**Rationale**:
- Single file contains content and metadata (no separate `.json` files)
- Human-readable and editable
- Compatible with knowledge management tools (Obsidian, Logseq, Hugo)
- Tags and notes can be added/edited via any text editor

**Extension UI**: Popup includes optional "Tags" (comma-separated) and "Notes" (textarea) fields before clipping.

### 5. Search Integration

**Decision**: Out of scope. Use external tools.

**Rationale**:
- Markdown files are inherently searchable via filesystem tools
- Knowledge management tools provide superior search with graph views
- Adding search to server requires full-text indexing (Bleve, SQLite FTS), significantly increasing complexity
- Not aligned with "minimal server resources" goal

**Recommended Tools for Searching Clips**:
- CLI: `rg "search term" ~/web-clips/` (ripgrep)
- GUI: Open `web-clips/` as Obsidian vault
- IDE: VS Code workspace search

If search becomes essential, it warrants a separate RFC.

## References

- [Mozilla Readability](https://github.com/mozilla/readability)
- [Turndown](https://github.com/mixmark-io/turndown)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Buffalo Framework Documentation](https://gobuffalo.io/documentation/)
- [Goth - Multi-Provider OAuth](https://github.com/markbates/goth)
- [Pop ORM](https://gobuffalo.io/documentation/database/pop/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)

## Appendix

### A. Alternative Markdown Libraries

| Library | Language | Pros | Cons |
|---------|----------|------|------|
| Turndown | JS | Well-maintained, plugins | JS only |
| html2text | Go | Native Go | Less configurable |
| goquery | Go | DOM parsing | Not MD converter |

### B. OAuth Provider Comparison

| Feature | Keycloak | Google Workspace |
|---------|----------|------------------|
| Self-hosted | Yes | No |
| Setup complexity | High | Low |
| User management | Full control | Google-managed |
| Cost | Free | Per-user pricing |
