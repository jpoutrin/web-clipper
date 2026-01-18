# TS-0010: Admin CLI for User Management - Implementation Tasks

Source: tech-specs/draft/TS-0010-admin-cli-user-management.md
Generated: 2026-01-18
Total Tasks: 32
Completed: 0

---

## Phase 1: Database & Model Setup

- [ ] 1.0 Database Migration
  - [ ] 1.1 Create migration file `migrations/20260118120000_add_disabled_to_users.fizz`
  - [ ] 1.2 Add `disabled` column with `{ "default": false, "null": false }`
  - [ ] 1.3 Run migration: `buffalo pop migrate`
  - [ ] 1.4 Verify column exists in database

- [ ] 2.0 Model Update
  - [ ] 2.1 Add `Disabled bool` field to `models/user.go` with proper tags
  - [ ] 2.2 Verify existing tests still pass

---

## Phase 2: Configuration

- [ ] 3.0 Admin Config
  - [ ] 3.1 Add `AdminConfig` struct to `internal/config/config.go`
  - [ ] 3.2 Add `Admin` field to main `Config` struct
  - [ ] 3.3 Add `admin.allowed_paths` section to `config/clipper.yaml`
  - [ ] 3.4 Test config loading with new section

---

## Phase 3: Repository Layer

- [ ] 4.0 Repository Package Setup
  - [ ] 4.1 Create `internal/repository/` directory
  - [ ] 4.2 Create `internal/repository/interfaces.go` with `UserRepository` interface
  - [ ] 4.3 Create `internal/repository/user_repository.go` with Pop implementation

- [ ] 5.0 Repository Methods
  - [ ] 5.1 Implement `FindAll(ctx) ([]User, error)`
  - [ ] 5.2 Implement `FindByID(ctx, id) (*User, error)`
  - [ ] 5.3 Implement `FindByEmail(ctx, email) (*User, error)`
  - [ ] 5.4 Implement `Update(ctx, user) error`
  - [ ] 5.5 Ensure all methods use `db.WithContext(ctx)`

---

## Phase 4: Service Layer

- [ ] 6.0 Service Package Setup
  - [ ] 6.1 Create `internal/services/` directory
  - [ ] 6.2 Create `internal/services/errors.go` with domain errors
  - [ ] 6.3 Create `internal/services/interfaces.go` with service interfaces

- [ ] 7.0 Storage Validator
  - [ ] 7.1 Create `internal/services/storage_service.go`
  - [ ] 7.2 Implement `Validate(path)` with path traversal protection
  - [ ] 7.3 Implement `GetEffectivePath(userID, customPath)`
  - [ ] 7.4 Add symlink resolution via `filepath.EvalSymlinks`

- [ ] 8.0 User Service
  - [ ] 8.1 Create `internal/services/user_service.go`
  - [ ] 8.2 Implement `List(ctx)` - list all users with storage info
  - [ ] 8.3 Implement `Get(ctx, email)` - get single user details
  - [ ] 8.4 Implement `SetStoragePath(ctx, email, path)` - update storage
  - [ ] 8.5 Implement `Disable(ctx, email)` - disable user
  - [ ] 8.6 Implement `Enable(ctx, email)` - enable user
  - [ ] 8.7 Implement `IsEnabled(ctx, userID)` - check user status
  - [ ] 8.8 Add audit logging to all state-changing methods

---

## Phase 5: CLI Tasks

- [ ] 9.0 Grift Setup
  - [ ] 9.1 Create `grifts/users.go`
  - [ ] 9.2 Implement `buildServices()` helper with proper env handling
  - [ ] 9.3 Implement CLI logger for audit output

- [ ] 10.0 CLI Commands
  - [ ] 10.1 Implement `users:list` command with tabular output
  - [ ] 10.2 Implement `users:show --email=x` command
  - [ ] 10.3 Implement `users:set-storage --email=x --path=y` command
  - [ ] 10.4 Implement `users:disable --email=x` command
  - [ ] 10.5 Implement `users:enable --email=x` command

---

## Phase 6: Auth Middleware Update

- [ ] 11.0 Middleware Changes
  - [ ] 11.1 Update `authMiddleware` to check `user.Disabled`
  - [ ] 11.2 Return 403 Forbidden for disabled users
  - [ ] 11.3 Update `authRefresh` to check disabled status before issuing tokens

---

## Phase 7: Makefile & Documentation

- [ ] 12.0 Makefile Shortcuts
  - [ ] 12.1 Add `users-list` target
  - [ ] 12.2 Add `users-show` target with EMAIL validation
  - [ ] 12.3 Add `users-set-storage` target with EMAIL/PATH validation
  - [ ] 12.4 Add `users-disable` target
  - [ ] 12.5 Add `users-enable` target

---

## Phase 8: Testing & Verification

- [ ] 13.0 Manual Testing
  - [ ] 13.1 Run `buffalo task users:list` - verify output format
  - [ ] 13.2 Run `buffalo task users:show --email=x` - verify details
  - [ ] 13.3 Run `buffalo task users:set-storage` - verify DB update
  - [ ] 13.4 Run `buffalo task users:disable` - verify user disabled
  - [ ] 13.5 Verify disabled user gets 403 on API call
  - [ ] 13.6 Verify disabled user cannot refresh tokens
  - [ ] 13.7 Run `buffalo task users:enable` - verify user re-enabled
  - [ ] 13.8 Verify path traversal (`..`) is rejected

---

## Acceptance Criteria Checklist

| AC | Description | Status |
|----|-------------|--------|
| AC1 | `users:list` displays all users with status | [ ] |
| AC2 | `users:show --email=x` displays user details | [ ] |
| AC3 | `users:set-storage` updates database | [ ] |
| AC4 | `users:disable` sets disabled=true | [ ] |
| AC5 | `users:enable` sets disabled=false | [ ] |
| AC6 | Disabled user receives 403 on API calls | [ ] |
| AC7 | Disabled user cannot refresh tokens | [ ] |
| AC8 | Path with `..` is rejected | [ ] |
| AC9 | Services are unit testable with mocks | [ ] |

---

## Notes

- This introduces new `internal/repository/` and `internal/services/` packages (architectural improvement per CTO review)
- Auth middleware adds a DB query per request (acceptable trade-off for small user base)
- Future enhancements: pagination, --confirm flag, persistent audit log
