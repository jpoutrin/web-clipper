# TS-0012: Clips Query API Implementation Tasks

Source Tech Spec: ../tech-specs/draft/TS-0012-clips-query-api.md
Generated: 2026-01-20
Total Tasks: 26
Completed: 0

## Overview

This task list covers the implementation of REST API endpoints for querying, retrieving, and deleting clips. Includes database schema for clip metadata tracking, CRUD operations, pagination, filtering, and comprehensive testing.

---

## Tasks

### Phase 1: Database Setup

- [ ] 1.0 Database Schema and Model
  - [ ] 1.1 Review tech spec database design (TS-0012 Data Model section)
  - [ ] 1.2 Generate migration files using `buffalo pop generate fizz create_clips`
  - [ ] 1.3 Implement up migration (`create_clips.up.fizz`) with clips table schema
  - [ ] 1.4 Implement down migration (`create_clips.down.fizz`)
  - [ ] 1.5 Create `server/models/clip.go` with Clip struct and validation
  - [ ] 1.6 Add `FindClipsByUserID` helper function with pagination support
  - [ ] 1.7 Add `FindClipByIDAndUser` helper function for ownership verification
  - [ ] 1.8 Run and verify migration: `make migrate`

### Phase 2: Update Create Endpoint

- [ ] 2.0 Modify CreateClip to Save Metadata
  - [ ] 2.1 Review existing `createClip` handler in `server/actions/clips.go`
  - [ ] 2.2 Add database record creation after successful file save
  - [ ] 2.3 Implement tags JSON serialization using `nulls.String`
  - [ ] 2.4 Update `ClipResponse` struct to include clip ID
  - [ ] 2.5 Test that clips are saved to both filesystem and database

### Phase 3: List Clips Endpoint

- [ ] 3.0 Implement List Clips Handler
  - [ ] 3.1 Create `ListClipsResponse` and `ClipSummary` types
  - [ ] 3.2 Implement `listClips` handler with user authentication
  - [ ] 3.3 Add pagination support (page, per_page parameters)
  - [ ] 3.4 Add mode filtering support
  - [ ] 3.5 Add tag filtering support (SQLite JSON LIKE query)
  - [ ] 3.6 Register `GET /api/v1/clips` route in `app.go`

### Phase 4: Get Clip Endpoint

- [ ] 4.0 Implement Get Clip Handler
  - [ ] 4.1 Create `ClipDetail` and `ClipImage` types
  - [ ] 4.2 Implement `getClip` handler with ownership verification
  - [ ] 4.3 Add markdown content reading from filesystem
  - [ ] 4.4 Add media folder image listing
  - [ ] 4.5 Register `GET /api/v1/clips/{id}` route in `app.go`

### Phase 5: Delete Clip Endpoint

- [ ] 5.0 Implement Delete Clip Handler
  - [ ] 5.1 Implement `deleteClip` handler with ownership verification
  - [ ] 5.2 Add `delete_files` query parameter support (default: true)
  - [ ] 5.3 Implement filesystem cleanup (delete clip folder)
  - [ ] 5.4 Register `DELETE /api/v1/clips/{id}` route in `app.go`

### Phase 6: Testing

- [ ] 6.0 Unit Tests
  - [ ] 6.1 Create `server/actions/clips_test.go` test file
  - [ ] 6.2 Test `listClips` authenticated access
  - [ ] 6.3 Test `listClips` unauthenticated returns 401
  - [ ] 6.4 Test `listClips` pagination behavior
  - [ ] 6.5 Test `listClips` mode filtering
  - [ ] 6.6 Test `listClips` tag filtering
  - [ ] 6.7 Test `getClip` returns clip with content
  - [ ] 6.8 Test `getClip` returns 404 for non-existent clip
  - [ ] 6.9 Test `getClip` returns 404 for other user's clip (authorization)
  - [ ] 6.10 Test `deleteClip` removes DB record and files
  - [ ] 6.11 Test `deleteClip` with `delete_files=false` preserves files

### Phase 7: Verification

- [ ] 7.0 Final Verification
  - [ ] 7.1 Run full test suite: `make test`
  - [ ] 7.2 Manual testing with dev mode (`DEV_MODE=true make dev`)
  - [ ] 7.3 Verify list returns only current user's clips
  - [ ] 7.4 Verify get returns 404 for other user's clips
  - [ ] 7.5 Verify delete removes both DB record and filesystem files
  - [ ] 7.6 Verify pagination metadata is accurate

---

## Implementation Files

| File | Status | Description |
|------|--------|-------------|
| `server/models/clip.go` | NEW | Clip model and helper functions |
| `server/migrations/*_create_clips.up.fizz` | NEW | Up migration |
| `server/migrations/*_create_clips.down.fizz` | NEW | Down migration |
| `server/actions/clips.go` | MODIFY | Add listClips, getClip, deleteClip handlers |
| `server/actions/app.go` | MODIFY | Register new routes |
| `server/actions/clips_test.go` | NEW | Test suite for clip handlers |

---

## Dependencies

- Go 1.21+
- Buffalo CLI
- CGO_ENABLED=1 (for SQLite)
- Existing auth middleware from TS-0002

## Notes

- All endpoints require Bearer token authentication
- Ownership is verified on every get/delete operation
- 404 is returned for unauthorized access (prevents enumeration)
- Tags are stored as JSON string for SQLite compatibility
- File paths are relative to user's clip directory
