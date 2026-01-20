---
tech_spec_id: TS-0012
title: Clips Query API (List, Get, Delete)
status: DRAFT
decision_ref:
author:
created: 2026-01-20
last_updated: 2026-01-20
related_prd:
---

# TS-0012: Clips Query API (List, Get, Delete)

## Executive Summary

This specification defines REST API endpoints for querying, retrieving, and deleting clips. Currently, clips are stored as files on disk but not tracked in the database. This spec introduces a `clips` database table to track clip metadata and provide query capabilities. All endpoints require OAuth authentication and operate only on the authenticated user's clips.

---

## Table of Contents

- [Design Overview](#design-overview)
- [Detailed Specifications](#detailed-specifications)
- [Data Model](#data-model)
- [API Specification](#api-specification)
- [Security Implementation](#security-implementation)
- [Testing Strategy](#testing-strategy)
- [Implementation Checklist](#implementation-checklist)

---

## Design Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Clips Query Flow                                 │
│                                                                          │
│  Client ──▶ GET /api/v1/clips ──▶ authMiddleware ──▶ listClips          │
│         ──▶ GET /api/v1/clips/{id} ──▶ authMiddleware ──▶ getClip       │
│         ──▶ DELETE /api/v1/clips/{id} ──▶ authMiddleware ──▶ deleteClip │
│                                              │                           │
│                                              ▼                           │
│                                    ┌─────────────────┐                   │
│                                    │   clips table   │                   │
│                                    │   (metadata)    │                   │
│                                    └────────┬────────┘                   │
│                                             │                            │
│                                             ▼                            │
│                                    ┌─────────────────┐                   │
│                                    │  File System    │                   │
│                                    │  (clip files)   │                   │
│                                    └─────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

1. **Clips Table**: Stores clip metadata (title, URL, path, tags, mode, timestamps)
2. **List Endpoint**: Returns paginated list of user's clips with optional filtering
3. **Get Endpoint**: Returns single clip metadata and content
4. **Delete Endpoint**: Removes clip from database and optionally from filesystem

### Data Flow

**List Clips:**
1. Client sends `GET /api/v1/clips` with Bearer token
2. authMiddleware validates token, extracts user_id
3. Handler queries `clips` table filtered by user_id
4. Returns paginated clip metadata

**Get Clip:**
1. Client sends `GET /api/v1/clips/{id}` with Bearer token
2. authMiddleware validates token, extracts user_id
3. Handler fetches clip by ID, verifies ownership
4. Reads clip content from filesystem
5. Returns clip metadata + content

**Delete Clip:**
1. Client sends `DELETE /api/v1/clips/{id}` with Bearer token
2. authMiddleware validates token, extracts user_id
3. Handler fetches clip by ID, verifies ownership
4. Deletes database record
5. Optionally deletes files from filesystem
6. Returns 204 No Content

---

## Detailed Specifications

### Component 1: Clip Model

**Responsibility**: Define clip database entity

**File**: `server/models/clip.go`

**Types**:
```go
package models

import (
    "time"

    "github.com/gobuffalo/nulls"
    "github.com/gobuffalo/pop/v6"
    "github.com/gobuffalo/validate/v3"
    "github.com/gobuffalo/validate/v3/validators"
    "github.com/gofrs/uuid"
)

// Clip represents a saved web clip
type Clip struct {
    ID        uuid.UUID    `json:"id" db:"id"`
    UserID    uuid.UUID    `json:"user_id" db:"user_id"`
    Title     string       `json:"title" db:"title"`
    URL       string       `json:"url" db:"url"`
    Path      string       `json:"path" db:"path"`           // Relative path to clip folder
    Mode      string       `json:"mode" db:"mode"`           // article, bookmark, screenshot, etc.
    Tags      nulls.String `json:"tags" db:"tags"`           // JSON array stored as string
    Notes     nulls.String `json:"notes" db:"notes"`
    CreatedAt time.Time    `json:"created_at" db:"created_at"`
    UpdatedAt time.Time    `json:"updated_at" db:"updated_at"`

    // Associations
    User User `json:"-" belongs_to:"user"`
}

// Clips is a slice of Clip for collection operations
type Clips []Clip

// Validate validates the Clip fields
func (c *Clip) Validate(tx *pop.Connection) (*validate.Errors, error) {
    return validate.Validate(
        &validators.UUIDIsPresent{Field: c.UserID, Name: "UserID"},
        &validators.StringIsPresent{Field: c.Title, Name: "Title"},
        &validators.StringIsPresent{Field: c.URL, Name: "URL"},
        &validators.StringIsPresent{Field: c.Path, Name: "Path"},
        &validators.StringIsPresent{Field: c.Mode, Name: "Mode"},
    ), nil
}

// FindClipsByUserID returns all clips for a user with pagination
func FindClipsByUserID(tx *pop.Connection, userID uuid.UUID, page, perPage int) (Clips, int, error) {
    clips := Clips{}
    q := tx.Where("user_id = ?", userID).Order("created_at DESC")

    // Get total count
    count, err := q.Count(&Clip{})
    if err != nil {
        return clips, 0, err
    }

    // Paginate
    err = q.Paginate(page, perPage).All(&clips)
    return clips, count, err
}

// FindClipByIDAndUser finds a clip ensuring ownership
func FindClipByIDAndUser(tx *pop.Connection, clipID, userID uuid.UUID) (*Clip, error) {
    clip := &Clip{}
    err := tx.Where("id = ? AND user_id = ?", clipID, userID).First(clip)
    return clip, err
}
```

**Implementation Notes**:
- Tags stored as JSON string for SQLite compatibility
- Path is relative to user's clip directory
- User association for eager loading if needed

---

### Component 2: Database Migration

**Responsibility**: Create clips table schema

**File**: `server/migrations/{timestamp}_create_clips.up.fizz`

**Migration**:
```fizz
create_table("clips") {
    t.Column("id", "uuid", {primary: true})
    t.Column("user_id", "uuid", {})
    t.Column("title", "string", {})
    t.Column("url", "text", {})
    t.Column("path", "string", {})
    t.Column("mode", "string", {default: "article"})
    t.Column("tags", "text", {null: true})
    t.Column("notes", "text", {null: true})
    t.Timestamps()
}

add_index("clips", "user_id", {})
add_index("clips", ["user_id", "created_at"], {})
add_foreign_key("clips", "user_id", {"users": ["id"]}, {"on_delete": "cascade"})
```

**Down Migration** (`{timestamp}_create_clips.down.fizz`):
```fizz
drop_table("clips")
```

**Implementation Notes**:
- Foreign key with CASCADE delete ensures clips are removed when user is deleted
- Index on user_id + created_at for efficient pagination queries

---

### Component 3: Update CreateClip Handler

**Responsibility**: Save clip metadata to database when creating clips

**File**: `server/actions/clips.go`

**Modified Function**: `createClip`

**Changes**:
```go
func createClip(c buffalo.Context) error {
    // ... existing file saving logic ...

    // After successfully saving files, create database record
    tx := c.Value("tx").(*pop.Connection)
    userIDStr := c.Value("user_id").(string)
    userID, err := uuid.FromString(userIDStr)
    if err != nil {
        return c.Error(http.StatusInternalServerError, err)
    }

    // Serialize tags to JSON
    var tagsJSON nulls.String
    if len(payload.Tags) > 0 {
        tagsBytes, _ := json.Marshal(payload.Tags)
        tagsJSON = nulls.NewString(string(tagsBytes))
    }

    clip := &models.Clip{
        ID:     uuid.Must(uuid.NewV4()),
        UserID: userID,
        Title:  payload.Title,
        URL:    payload.URL,
        Path:   relativePath,  // Path relative to clip directory
        Mode:   payload.Mode,
        Tags:   tagsJSON,
        Notes:  nulls.NewString(payload.Notes),
    }

    if err := tx.Create(clip); err != nil {
        // Log error but don't fail - file was already saved
        c.Logger().Errorf("Failed to save clip metadata: %v", err)
    }

    return c.Render(http.StatusCreated, r.JSON(ClipResponse{
        Success: true,
        Path:    relativePath,
        ID:      clip.ID.String(),  // NEW: Return clip ID
    }))
}
```

**Updated Response Type**:
```go
type ClipResponse struct {
    Success bool   `json:"success"`
    Path    string `json:"path,omitempty"`
    ID      string `json:"id,omitempty"`      // NEW
    Error   string `json:"error,omitempty"`
}
```

---

### Component 4: List Clips Handler

**Responsibility**: Return paginated list of user's clips

**File**: `server/actions/clips.go`

**New Function**: `listClips`

```go
// ListClipsResponse represents the paginated clips response
type ListClipsResponse struct {
    Clips      []ClipSummary `json:"clips"`
    Page       int           `json:"page"`
    PerPage    int           `json:"per_page"`
    Total      int           `json:"total"`
    TotalPages int           `json:"total_pages"`
}

// ClipSummary represents clip metadata without content
type ClipSummary struct {
    ID        string    `json:"id"`
    Title     string    `json:"title"`
    URL       string    `json:"url"`
    Mode      string    `json:"mode"`
    Tags      []string  `json:"tags"`
    Notes     string    `json:"notes,omitempty"`
    CreatedAt time.Time `json:"created_at"`
}

func listClips(c buffalo.Context) error {
    tx := c.Value("tx").(*pop.Connection)
    userIDStr := c.Value("user_id").(string)
    userID, err := uuid.FromString(userIDStr)
    if err != nil {
        return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid user"))
    }

    // Parse pagination params
    page, _ := strconv.Atoi(c.Param("page"))
    if page < 1 {
        page = 1
    }
    perPage, _ := strconv.Atoi(c.Param("per_page"))
    if perPage < 1 || perPage > 100 {
        perPage = 20
    }

    // Optional filters
    mode := c.Param("mode")
    tag := c.Param("tag")

    // Build query
    q := tx.Where("user_id = ?", userID)
    if mode != "" {
        q = q.Where("mode = ?", mode)
    }
    if tag != "" {
        // SQLite JSON contains check
        q = q.Where("tags LIKE ?", "%\""+tag+"\"%")
    }
    q = q.Order("created_at DESC")

    // Get total count
    count, err := q.Count(&models.Clip{})
    if err != nil {
        return c.Error(http.StatusInternalServerError, err)
    }

    // Fetch clips
    clips := models.Clips{}
    if err := q.Paginate(page, perPage).All(&clips); err != nil {
        return c.Error(http.StatusInternalServerError, err)
    }

    // Convert to response format
    summaries := make([]ClipSummary, len(clips))
    for i, clip := range clips {
        var tags []string
        if clip.Tags.Valid {
            json.Unmarshal([]byte(clip.Tags.String), &tags)
        }
        summaries[i] = ClipSummary{
            ID:        clip.ID.String(),
            Title:     clip.Title,
            URL:       clip.URL,
            Mode:      clip.Mode,
            Tags:      tags,
            Notes:     clip.Notes.String,
            CreatedAt: clip.CreatedAt,
        }
    }

    totalPages := (count + perPage - 1) / perPage

    return c.Render(http.StatusOK, r.JSON(ListClipsResponse{
        Clips:      summaries,
        Page:       page,
        PerPage:    perPage,
        Total:      count,
        TotalPages: totalPages,
    }))
}
```

---

### Component 5: Get Clip Handler

**Responsibility**: Return single clip with content

**File**: `server/actions/clips.go`

**New Types and Function**:
```go
// ClipDetail represents full clip data including content
type ClipDetail struct {
    ClipSummary
    Path     string `json:"path"`
    Content  string `json:"content,omitempty"`   // Markdown content
    Images   []ClipImage `json:"images,omitempty"`
}

// ClipImage represents an image in the clip
type ClipImage struct {
    Filename string `json:"filename"`
    Path     string `json:"path"`  // Relative path for serving
}

func getClip(c buffalo.Context) error {
    tx := c.Value("tx").(*pop.Connection)
    userIDStr := c.Value("user_id").(string)
    userID, err := uuid.FromString(userIDStr)
    if err != nil {
        return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid user"))
    }

    clipIDStr := c.Param("id")
    clipID, err := uuid.FromString(clipIDStr)
    if err != nil {
        return c.Error(http.StatusBadRequest, fmt.Errorf("invalid clip ID"))
    }

    // Fetch clip with ownership check
    clip, err := models.FindClipByIDAndUser(tx, clipID, userID)
    if err != nil {
        return c.Error(http.StatusNotFound, fmt.Errorf("clip not found"))
    }

    // Get user's clip directory
    user := &models.User{}
    if err := tx.Find(user, userID); err != nil {
        return c.Error(http.StatusInternalServerError, err)
    }

    cfg := GetConfig()
    clipDir := cfg.Storage.ClipDirectory
    if user.ClipDirectory.Valid {
        clipDir = user.ClipDirectory.String
    }

    // Read markdown content
    fullPath := filepath.Join(clipDir, clip.Path)
    var content string
    var images []ClipImage

    // Find and read markdown file
    entries, _ := os.ReadDir(fullPath)
    for _, entry := range entries {
        if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
            mdPath := filepath.Join(fullPath, entry.Name())
            data, err := os.ReadFile(mdPath)
            if err == nil {
                content = string(data)
            }
            break
        }
    }

    // List images in media folder
    mediaPath := filepath.Join(fullPath, "media")
    if mediaEntries, err := os.ReadDir(mediaPath); err == nil {
        for _, entry := range mediaEntries {
            if !entry.IsDir() {
                images = append(images, ClipImage{
                    Filename: entry.Name(),
                    Path:     filepath.Join(clip.Path, "media", entry.Name()),
                })
            }
        }
    }

    // Parse tags
    var tags []string
    if clip.Tags.Valid {
        json.Unmarshal([]byte(clip.Tags.String), &tags)
    }

    return c.Render(http.StatusOK, r.JSON(ClipDetail{
        ClipSummary: ClipSummary{
            ID:        clip.ID.String(),
            Title:     clip.Title,
            URL:       clip.URL,
            Mode:      clip.Mode,
            Tags:      tags,
            Notes:     clip.Notes.String,
            CreatedAt: clip.CreatedAt,
        },
        Path:    clip.Path,
        Content: content,
        Images:  images,
    }))
}
```

---

### Component 6: Delete Clip Handler

**Responsibility**: Delete clip from database and filesystem

**File**: `server/actions/clips.go`

```go
func deleteClip(c buffalo.Context) error {
    tx := c.Value("tx").(*pop.Connection)
    userIDStr := c.Value("user_id").(string)
    userID, err := uuid.FromString(userIDStr)
    if err != nil {
        return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid user"))
    }

    clipIDStr := c.Param("id")
    clipID, err := uuid.FromString(clipIDStr)
    if err != nil {
        return c.Error(http.StatusBadRequest, fmt.Errorf("invalid clip ID"))
    }

    // Fetch clip with ownership check
    clip, err := models.FindClipByIDAndUser(tx, clipID, userID)
    if err != nil {
        return c.Error(http.StatusNotFound, fmt.Errorf("clip not found"))
    }

    // Get delete_files param (default: true)
    deleteFiles := c.Param("delete_files") != "false"

    if deleteFiles {
        // Get user's clip directory
        user := &models.User{}
        if err := tx.Find(user, userID); err != nil {
            return c.Error(http.StatusInternalServerError, err)
        }

        cfg := GetConfig()
        clipDir := cfg.Storage.ClipDirectory
        if user.ClipDirectory.Valid {
            clipDir = user.ClipDirectory.String
        }

        // Delete clip folder
        fullPath := filepath.Join(clipDir, clip.Path)
        if err := os.RemoveAll(fullPath); err != nil {
            c.Logger().Warnf("Failed to delete clip files at %s: %v", fullPath, err)
            // Continue with database deletion even if file deletion fails
        }
    }

    // Delete from database
    if err := tx.Destroy(clip); err != nil {
        return c.Error(http.StatusInternalServerError, err)
    }

    return c.Render(http.StatusNoContent, nil)
}
```

---

### Component 7: Route Registration

**Responsibility**: Register new clip endpoints

**File**: `server/actions/app.go`

**Changes**:
```go
// API routes (protected)
api := app.Group("/api/v1")
api.Use(authMiddleware)
api.GET("/config", getConfig)
api.POST("/clips", createClip)
api.GET("/clips", listClips)           // NEW: List user's clips
api.GET("/clips/{id}", getClip)        // NEW: Get single clip
api.DELETE("/clips/{id}", deleteClip)  // NEW: Delete clip
```

---

## Data Model

### Clips Table Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique clip identifier |
| user_id | UUID | NOT NULL, FK(users.id) ON DELETE CASCADE | Owner user |
| title | VARCHAR | NOT NULL | Clip title |
| url | TEXT | NOT NULL | Source URL |
| path | VARCHAR | NOT NULL | Relative path to clip folder |
| mode | VARCHAR | NOT NULL, DEFAULT 'article' | Capture mode |
| tags | TEXT | NULL | JSON array of tags |
| notes | TEXT | NULL | User notes |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| clips_user_id_idx | user_id | Filter by user |
| clips_user_created_idx | user_id, created_at | Efficient pagination |

### Entity Relationship

```
┌─────────────┐       ┌─────────────┐
│    users    │       │    clips    │
├─────────────┤       ├─────────────┤
│ id (PK)     │◀──────│ user_id (FK)│
│ email       │  1:N  │ id (PK)     │
│ name        │       │ title       │
│ ...         │       │ url         │
└─────────────┘       │ path        │
                      │ mode        │
                      │ tags        │
                      │ notes       │
                      │ created_at  │
                      │ updated_at  │
                      └─────────────┘
```

---

## API Specification

### GET /api/v1/clips

**Description**: List authenticated user's clips with pagination and filtering

**Authentication**: Bearer token required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number (1-indexed) |
| per_page | int | 20 | Items per page (max 100) |
| mode | string | - | Filter by capture mode |
| tag | string | - | Filter by tag |

**Request**:
```
GET /api/v1/clips?page=1&per_page=20&mode=article
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "clips": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Example Article",
      "url": "https://example.com/article",
      "mode": "article",
      "tags": ["tech", "tutorial"],
      "notes": "Great resource",
      "created_at": "2026-01-20T10:30:00Z"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 42,
  "total_pages": 3
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| 401 | Unauthorized (invalid/missing token) |
| 500 | Internal server error |

---

### GET /api/v1/clips/{id}

**Description**: Get single clip with full content

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Clip ID |

**Request**:
```
GET /api/v1/clips/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Example Article",
  "url": "https://example.com/article",
  "mode": "article",
  "tags": ["tech", "tutorial"],
  "notes": "Great resource",
  "created_at": "2026-01-20T10:30:00Z",
  "path": "web-clips/20260120_103000_example-com",
  "content": "---\ntitle: Example Article\n---\n\n# Content here...",
  "images": [
    {
      "filename": "image1.png",
      "path": "web-clips/20260120_103000_example-com/media/image1.png"
    }
  ]
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| 400 | Invalid clip ID format |
| 401 | Unauthorized |
| 404 | Clip not found or not owned by user |
| 500 | Internal server error |

---

### DELETE /api/v1/clips/{id}

**Description**: Delete a clip

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Clip ID |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| delete_files | bool | true | Also delete files from filesystem |

**Request**:
```
DELETE /api/v1/clips/550e8400-e29b-41d4-a716-446655440000?delete_files=true
Authorization: Bearer <access_token>
```

**Response** (204 No Content): Empty body

**Errors**:
| Status | Description |
|--------|-------------|
| 400 | Invalid clip ID format |
| 401 | Unauthorized |
| 404 | Clip not found or not owned by user |
| 500 | Internal server error |

---

## Security Implementation

### Authentication

All endpoints require valid JWT Bearer token:
```
Authorization: Bearer <access_token>
```

The existing `authMiddleware` handles:
- Token validation
- Extracting user_id and user_email into context
- Returning 401 for invalid/expired tokens

### Authorization

**Ownership Check**: Every operation verifies the clip belongs to the authenticated user:
```go
clip, err := models.FindClipByIDAndUser(tx, clipID, userID)
```

This prevents:
- Users accessing other users' clips
- Enumeration attacks (404 for non-owned clips)

### Path Traversal Prevention

Clip paths are validated:
- Stored as relative paths in database
- Combined with user's clip directory only at read time
- `filepath.Clean()` applied to prevent `../` attacks

### Rate Limiting (Recommended)

Consider adding rate limiting for production:
- List: 100 requests/minute
- Get: 200 requests/minute
- Delete: 50 requests/minute

---

## Testing Strategy

### Unit Tests

**File**: `server/actions/clips_test.go`

```go
func (as *ActionSuite) Test_ListClips_Authenticated() {
    // Create test user and clips
    // Call GET /api/v1/clips with valid token
    // Assert 200, verify response structure
}

func (as *ActionSuite) Test_ListClips_Unauthenticated() {
    // Call GET /api/v1/clips without token
    // Assert 401
}

func (as *ActionSuite) Test_ListClips_Pagination() {
    // Create 25 clips
    // Request page 2 with per_page=10
    // Assert correct pagination metadata
}

func (as *ActionSuite) Test_ListClips_FilterByMode() {
    // Create clips with different modes
    // Filter by mode=article
    // Assert only article clips returned
}

func (as *ActionSuite) Test_GetClip_Found() {
    // Create test clip
    // Request clip by ID
    // Assert 200, verify content included
}

func (as *ActionSuite) Test_GetClip_NotFound() {
    // Request non-existent clip ID
    // Assert 404
}

func (as *ActionSuite) Test_GetClip_OtherUserClip() {
    // Create clip for user A
    // Request as user B
    // Assert 404 (not 403 to prevent enumeration)
}

func (as *ActionSuite) Test_DeleteClip_Success() {
    // Create test clip with files
    // Delete clip
    // Assert 204, verify DB record removed, files deleted
}

func (as *ActionSuite) Test_DeleteClip_KeepFiles() {
    // Create test clip with files
    // Delete with delete_files=false
    // Assert 204, DB removed, files preserved
}
```

### Integration Tests

1. Full CRUD flow:
   - Create clip via POST /api/v1/clips
   - Verify appears in GET /api/v1/clips list
   - Get details via GET /api/v1/clips/{id}
   - Delete via DELETE /api/v1/clips/{id}
   - Verify removed from list

2. Multi-user isolation:
   - Create clips as user A
   - Login as user B
   - Verify user B cannot see/access user A's clips

### Manual Testing

```bash
# Get auth token (dev mode)
TOKEN=$(curl -s http://localhost:3000/auth/dev-token | jq -r .access_token)

# Create a clip
curl -X POST http://localhost:3000/api/v1/clips \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","url":"https://example.com","markdown":"# Test","tags":["test"],"mode":"article","images":[]}'

# List clips
curl http://localhost:3000/api/v1/clips \
  -H "Authorization: Bearer $TOKEN"

# Get specific clip
curl http://localhost:3000/api/v1/clips/{id} \
  -H "Authorization: Bearer $TOKEN"

# Delete clip
curl -X DELETE http://localhost:3000/api/v1/clips/{id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Implementation Checklist

### Phase 1: Database Setup

- [ ] Create migration file `{timestamp}_create_clips.up.fizz`
- [ ] Create down migration `{timestamp}_create_clips.down.fizz`
- [ ] Create `server/models/clip.go` with Clip model
- [ ] Add model helper functions (FindClipsByUserID, FindClipByIDAndUser)
- [ ] Run migration: `make migrate`

### Phase 2: Update Create Endpoint

- [ ] Modify `createClip` to save metadata to database
- [ ] Update `ClipResponse` to include clip ID
- [ ] Test creating clips saves to both filesystem and database

### Phase 3: List Endpoint

- [ ] Implement `listClips` handler
- [ ] Add pagination support
- [ ] Add mode and tag filtering
- [ ] Register `GET /api/v1/clips` route

### Phase 4: Get Endpoint

- [ ] Implement `getClip` handler
- [ ] Read markdown content from filesystem
- [ ] List images in media folder
- [ ] Register `GET /api/v1/clips/{id}` route

### Phase 5: Delete Endpoint

- [ ] Implement `deleteClip` handler
- [ ] Add `delete_files` query parameter support
- [ ] Register `DELETE /api/v1/clips/{id}` route

### Phase 6: Testing

- [ ] Write unit tests for all handlers
- [ ] Test pagination edge cases
- [ ] Test ownership authorization
- [ ] Test with dev mode
- [ ] Test with real OAuth flow

### Verification

- [ ] All tests pass: `make test`
- [ ] List returns user's clips only
- [ ] Get returns 404 for other user's clips
- [ ] Delete removes both DB record and files
- [ ] Pagination works correctly
- [ ] Tag filtering works with SQLite

---

## References

### Related Documents

- [TS-0001 Web Clipper Phase 1](./approved/TS-0001-web-clipper-phase1.md)
- [TS-0002 Dev Mode Authentication](./draft/TS-0002-dev-mode-authentication-bypass.md)

### Implementation Files

| File | Changes |
|------|---------|
| `server/models/clip.go` | NEW: Clip model |
| `server/migrations/*_create_clips.*.fizz` | NEW: Migration files |
| `server/actions/clips.go` | Modify createClip, add listClips, getClip, deleteClip |
| `server/actions/app.go` | Register new routes |
| `server/actions/clips_test.go` | NEW: Tests for clip handlers |

### Migration Commands

```bash
# Generate migration
cd server
buffalo pop generate fizz create_clips

# Run migration
make migrate

# Rollback if needed
buffalo pop migrate down -s 1
```
