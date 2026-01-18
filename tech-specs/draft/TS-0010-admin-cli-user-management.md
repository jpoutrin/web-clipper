# TS-0010: Admin CLI for User Management

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0010 |
| Title | Admin CLI for User Management |
| Status | DRAFT |
| Author | Claude |
| Created | 2026-01-18 |
| Last Updated | 2026-01-18 |
| Related RFC | - |
| Phase | 1 - Admin Features |
| Location | tech-specs/draft/TS-0010-admin-cli-user-management.md |
| Tasks | tasks/TS-0010-admin-cli-user-management-tasks.md |

---

## Executive Summary

This specification adds Buffalo CLI tasks for server administrators to manage users without direct database access. Commands include listing users, modifying storage locations, and disabling/enabling user accounts. All business logic resides in a service layer for testability and reuse.

---

## Scope

| Component | Included | Notes |
|-----------|----------|-------|
| CLI Commands | Yes | Buffalo grift tasks |
| Service Layer | Yes | Business logic abstraction |
| Repository Layer | Yes | Database access abstraction |
| User Listing | Yes | List all users with status |
| Storage Path Management | Yes | Set/clear custom clip directories |
| User Disable/Enable | Yes | Soft-disable without deletion |
| Database Migration | Yes | Add `disabled` column |
| Auth Middleware Update | Yes | Block disabled users |

**Out of Scope:** Web admin UI, bulk operations, user deletion

---

## 1. CLI Commands

### 1.1 List Users

```bash
buffalo task users:list

# Output:
# ID          EMAIL                     STATUS    STORAGE PATH
# ────────    ─────                     ──────    ────────────
# 550e84..    admin@example.com         active    /data/clips/550e8400...
# 7c9e21..    user@example.com          disabled  ~/clips (custom)
#
# Total: 2 users (1 active, 1 disabled)
```

### 1.2 Show User Details

```bash
buffalo task users:show --email=user@example.com

# Output:
# User Details
# ────────────
# ID:           7c9e2100-e29b-41d4-a716-446655440001
# Email:        user@example.com
# Name:         Test User
# Status:       disabled
# Storage:      ~/clips (custom)
# Created:      2026-01-15 10:30:00
```

### 1.3 Set Storage Path

```bash
# Set custom storage path
buffalo task users:set-storage --email=user@example.com --path=/data/user-clips

# Clear custom path (revert to default)
buffalo task users:set-storage --email=user@example.com --path=

# Output:
# Storage path updated for user@example.com
# New path: /data/user-clips
```

### 1.4 Disable User

```bash
buffalo task users:disable --email=user@example.com

# Output:
# User user@example.com has been disabled.
# [INFO] ADMIN: User disabled | id=7c9e2100... email=user@example.com
```

### 1.5 Enable User

```bash
buffalo task users:enable --email=user@example.com

# Output:
# User user@example.com has been enabled.
# [INFO] ADMIN: User enabled | id=7c9e2100... email=user@example.com
```

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CLI Layer (grifts/)                        │
│  • Parse arguments                                            │
│  • Format output                                              │
│  • Call services                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                Service Layer (internal/services/)             │
│  • Business logic                                             │
│  • Input validation                                           │
│  • Audit logging                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Repository Layer (internal/repository/)          │
│  • Database operations                                        │
│  • Query building                                             │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 File Structure

```
server/
├── internal/
│   ├── repository/
│   │   ├── interfaces.go          # Repository interfaces
│   │   └── user_repository.go     # Pop implementation
│   │
│   └── services/
│       ├── interfaces.go          # Service interfaces
│       ├── errors.go              # Domain errors
│       ├── user_service.go        # User management
│       └── storage_service.go     # Path validation
│
├── grifts/
│   └── users.go                   # CLI commands
│
├── models/
│   └── user.go                    # Updated with Disabled field
│
└── migrations/
    └── YYYYMMDD_add_disabled_to_users.fizz
```

---

## 3. Database Migration

**File:** `server/migrations/20260118120000_add_disabled_to_users.fizz`

```fizz
add_column("users", "disabled", "bool", { "default": false, "null": false })
```

**Down:**
```fizz
drop_column("users", "disabled")
```

---

## 4. Model Update

**File:** `server/models/user.go`

```go
type User struct {
    ID            uuid.UUID    `json:"id" db:"id"`
    Email         string       `json:"email" db:"email"`
    Name          string       `json:"name" db:"name"`
    OAuthID       string       `json:"oauth_id" db:"oauth_id"`
    ClipDirectory nulls.String `json:"clip_directory" db:"clip_directory"`
    Disabled      bool         `json:"disabled" db:"disabled"`
    CreatedAt     time.Time    `json:"created_at" db:"created_at"`
    UpdatedAt     time.Time    `json:"updated_at" db:"updated_at"`
}
```

---

## 5. Repository Layer

### 5.1 Interface

**File:** `server/internal/repository/interfaces.go`

```go
package repository

import (
    "context"

    "server/models"
    "github.com/gofrs/uuid"
)

type UserRepository interface {
    FindAll(ctx context.Context) ([]models.User, error)
    FindByID(ctx context.Context, id uuid.UUID) (*models.User, error)
    FindByEmail(ctx context.Context, email string) (*models.User, error)
    Update(ctx context.Context, user *models.User) error  // Generic update
}
```

### 5.2 Implementation

**File:** `server/internal/repository/user_repository.go`

```go
package repository

import (
    "context"
    "fmt"

    "server/models"
    "github.com/gobuffalo/nulls"
    "github.com/gobuffalo/pop/v6"
    "github.com/gofrs/uuid"
)

type popUserRepository struct {
    db *pop.Connection
}

func NewUserRepository(db *pop.Connection) UserRepository {
    return &popUserRepository{db: db}
}

func (r *popUserRepository) FindAll(ctx context.Context) ([]models.User, error) {
    users := []models.User{}
    err := r.db.WithContext(ctx).Order("created_at desc").All(&users)
    if err != nil {
        return nil, fmt.Errorf("query users: %w", err)
    }
    return users, nil
}

func (r *popUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
    user := &models.User{}
    err := r.db.WithContext(ctx).Find(user, id)
    if err != nil {
        return nil, fmt.Errorf("find user %s: %w", id, err)
    }
    return user, nil
}

func (r *popUserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
    user := &models.User{}
    err := r.db.WithContext(ctx).Where("email = ?", email).First(user)
    if err != nil {
        return nil, fmt.Errorf("find user by email: %w", err)
    }
    return user, nil
}

func (r *popUserRepository) Update(ctx context.Context, user *models.User) error {
    return r.db.WithContext(ctx).Update(user)
}
```

---

## 6. Service Layer

### 6.1 Errors

**File:** `server/internal/services/errors.go`

```go
package services

import "errors"

var (
    ErrUserNotFound   = errors.New("user not found")
    ErrUserDisabled   = errors.New("user account is disabled")
    ErrAlreadyState   = errors.New("user already in requested state")
    ErrInvalidPath    = errors.New("invalid path")
    ErrPathTraversal  = errors.New("path traversal not allowed")
    ErrPathNotAllowed = errors.New("path outside allowed directories")
)
```

### 6.2 Interfaces

**File:** `server/internal/services/interfaces.go`

```go
package services

import (
    "context"

    "server/models"
)

type UserService interface {
    List(ctx context.Context) ([]UserInfo, error)
    Get(ctx context.Context, email string) (*UserInfo, error)
    SetStoragePath(ctx context.Context, email, path string) error
    Disable(ctx context.Context, email string) error
    Enable(ctx context.Context, email string) error
    IsEnabled(ctx context.Context, userID string) (bool, error)
}

type UserInfo struct {
    models.User
    EffectivePath string
    IsCustomPath  bool
}

type StorageValidator interface {
    Validate(path string) (normalized string, err error)
    GetEffectivePath(userID, customPath string) string
}

type Logger interface {
    Infof(format string, args ...interface{})
}
```

### 6.3 Storage Validator

**File:** `server/internal/services/storage_service.go`

```go
package services

import (
    "fmt"
    "os"
    "path/filepath"
    "strings"

    "server/internal/config"
)

type storageValidator struct {
    basePath     string
    allowedPaths []string
}

func NewStorageValidator(cfg *config.Config) StorageValidator {
    return &storageValidator{
        basePath:     cfg.Storage.BasePath,
        allowedPaths: cfg.Admin.AllowedPaths,
    }
}

func (s *storageValidator) Validate(path string) (string, error) {
    if path == "" {
        return "", nil
    }

    // Reject path traversal before any transformation
    if strings.Contains(path, "..") {
        return "", ErrPathTraversal
    }

    // Expand ~
    expanded := path
    if strings.HasPrefix(path, "~/") {
        home, err := os.UserHomeDir()
        if err != nil {
            return "", fmt.Errorf("%w: %v", ErrInvalidPath, err)
        }
        expanded = filepath.Join(home, path[2:])
    }

    // Normalize
    abs, err := filepath.Abs(expanded)
    if err != nil {
        return "", fmt.Errorf("%w: %v", ErrInvalidPath, err)
    }
    clean := filepath.Clean(abs)

    // Resolve symlinks if path exists
    if real, err := filepath.EvalSymlinks(clean); err == nil {
        clean = real
    }

    // Verify allowed
    if len(s.allowedPaths) > 0 {
        allowed := false
        for _, base := range s.allowedPaths {
            absBase, _ := filepath.Abs(base)
            if strings.HasPrefix(clean, absBase) {
                allowed = true
                break
            }
        }
        if !allowed {
            return "", fmt.Errorf("%w: must be under %v", ErrPathNotAllowed, s.allowedPaths)
        }
    }

    return clean, nil
}

func (s *storageValidator) GetEffectivePath(userID, customPath string) string {
    if customPath != "" {
        return customPath
    }
    return filepath.Join(s.basePath, userID)
}
```

### 6.4 User Service

**File:** `server/internal/services/user_service.go`

```go
package services

import (
    "context"
    "fmt"

    "server/internal/repository"
    "github.com/gobuffalo/nulls"
    "github.com/gofrs/uuid"
)

type userService struct {
    repo    repository.UserRepository
    storage StorageValidator
    logger  Logger
}

func NewUserService(repo repository.UserRepository, storage StorageValidator, logger Logger) UserService {
    return &userService{repo: repo, storage: storage, logger: logger}
}

func (s *userService) List(ctx context.Context) ([]UserInfo, error) {
    users, err := s.repo.FindAll(ctx)
    if err != nil {
        return nil, err
    }

    result := make([]UserInfo, len(users))
    for i, u := range users {
        custom := ""
        if u.ClipDirectory.Valid {
            custom = u.ClipDirectory.String
        }
        result[i] = UserInfo{
            User:          u,
            EffectivePath: s.storage.GetEffectivePath(u.ID.String(), custom),
            IsCustomPath:  custom != "",
        }
    }
    return result, nil
}

func (s *userService) Get(ctx context.Context, email string) (*UserInfo, error) {
    user, err := s.repo.FindByEmail(ctx, email)
    if err != nil {
        return nil, ErrUserNotFound
    }

    custom := ""
    if user.ClipDirectory.Valid {
        custom = user.ClipDirectory.String
    }

    return &UserInfo{
        User:          *user,
        EffectivePath: s.storage.GetEffectivePath(user.ID.String(), custom),
        IsCustomPath:  custom != "",
    }, nil
}

func (s *userService) SetStoragePath(ctx context.Context, email, path string) error {
    user, err := s.repo.FindByEmail(ctx, email)
    if err != nil {
        return ErrUserNotFound
    }

    normalized := ""
    if path != "" {
        normalized, err = s.storage.Validate(path)
        if err != nil {
            return err
        }
    }

    // Update user's clip directory
    if normalized == "" {
        user.ClipDirectory = nulls.String{}
    } else {
        user.ClipDirectory = nulls.NewString(normalized)
    }

    if err := s.repo.Update(ctx, user); err != nil {
        return fmt.Errorf("update storage: %w", err)
    }

    s.logger.Infof("ADMIN: Storage path changed | id=%s email=%s path=%q", user.ID, email, normalized)
    return nil
}

func (s *userService) Disable(ctx context.Context, email string) error {
    user, err := s.repo.FindByEmail(ctx, email)
    if err != nil {
        return ErrUserNotFound
    }
    if user.Disabled {
        return ErrAlreadyState
    }

    user.Disabled = true
    if err := s.repo.Update(ctx, user); err != nil {
        return fmt.Errorf("disable user: %w", err)
    }

    s.logger.Infof("ADMIN: User disabled | id=%s email=%s", user.ID, email)
    return nil
}

func (s *userService) Enable(ctx context.Context, email string) error {
    user, err := s.repo.FindByEmail(ctx, email)
    if err != nil {
        return ErrUserNotFound
    }
    if !user.Disabled {
        return ErrAlreadyState
    }

    user.Disabled = false
    if err := s.repo.Update(ctx, user); err != nil {
        return fmt.Errorf("enable user: %w", err)
    }

    s.logger.Infof("ADMIN: User enabled | id=%s email=%s", user.ID, email)
    return nil
}

func (s *userService) IsEnabled(ctx context.Context, userID string) (bool, error) {
    id, err := uuid.FromString(userID)
    if err != nil {
        return false, fmt.Errorf("invalid user ID: %w", err)
    }

    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return false, err
    }

    return !user.Disabled, nil
}
```

---

## 7. CLI Tasks

**File:** `server/grifts/users.go`

```go
package grifts

import (
    "context"
    "fmt"
    "log"
    "os"
    "text/tabwriter"

    "server/internal/config"
    "server/internal/repository"
    "server/internal/services"

    "github.com/gobuffalo/pop/v6"
    "github.com/markbates/grift/grift"
)

type cliLogger struct{}

func (l *cliLogger) Infof(format string, args ...interface{}) {
    log.Printf("[INFO] "+format, args...)
}

func buildServices() (services.UserService, error) {
    cfg, err := config.Load("config/clipper.yaml")
    if err != nil {
        return nil, err
    }

    env := os.Getenv("GO_ENV")
    if env == "" {
        env = "development"
    }
    db, err := pop.Connect(env)
    if err != nil {
        return nil, err
    }

    repo := repository.NewUserRepository(db)
    storage := services.NewStorageValidator(cfg)
    return services.NewUserService(repo, storage, &cliLogger{}), nil
}

var _ = grift.Namespace("users", func() {

    grift.Desc("list", "List all users")
    grift.Add("list", func(c *grift.Context) error {
        svc, err := buildServices()
        if err != nil {
            return err
        }

        users, err := svc.List(context.Background())
        if err != nil {
            return err
        }

        w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
        fmt.Fprintln(w, "ID\tEMAIL\tSTATUS\tSTORAGE PATH")
        fmt.Fprintln(w, "────────\t─────\t──────\t────────────")

        active, disabled := 0, 0
        for _, u := range users {
            status := "active"
            if u.Disabled {
                status = "disabled"
                disabled++
            } else {
                active++
            }

            pathNote := ""
            if u.IsCustomPath {
                pathNote = " (custom)"
            }

            fmt.Fprintf(w, "%s..\t%s\t%s\t%s%s\n",
                u.ID.String()[:8], u.Email, status, u.EffectivePath, pathNote)
        }
        w.Flush()
        fmt.Printf("\nTotal: %d users (%d active, %d disabled)\n", len(users), active, disabled)
        return nil
    })

    grift.Desc("show", "Show user details (--email required)")
    grift.Add("show", func(c *grift.Context) error {
        email := c.Get("email")
        if email == "" {
            return fmt.Errorf("--email is required")
        }

        svc, err := buildServices()
        if err != nil {
            return err
        }

        u, err := svc.Get(context.Background(), email)
        if err != nil {
            return err
        }

        status := "active"
        if u.Disabled {
            status = "disabled"
        }
        pathType := ""
        if u.IsCustomPath {
            pathType = " (custom)"
        }

        fmt.Println("User Details")
        fmt.Println("────────────")
        fmt.Printf("ID:       %s\n", u.ID)
        fmt.Printf("Email:    %s\n", u.Email)
        fmt.Printf("Name:     %s\n", u.Name)
        fmt.Printf("Status:   %s\n", status)
        fmt.Printf("Storage:  %s%s\n", u.EffectivePath, pathType)
        fmt.Printf("Created:  %s\n", u.CreatedAt.Format("2006-01-02 15:04:05"))
        return nil
    })

    grift.Desc("set-storage", "Set storage path (--email, --path required)")
    grift.Add("set-storage", func(c *grift.Context) error {
        email := c.Get("email")
        if email == "" {
            return fmt.Errorf("--email is required")
        }
        path := c.Get("path") // empty string clears custom path

        svc, err := buildServices()
        if err != nil {
            return err
        }

        if err := svc.SetStoragePath(context.Background(), email, path); err != nil {
            return err
        }

        if path == "" {
            fmt.Printf("Storage path cleared for %s (using default)\n", email)
        } else {
            fmt.Printf("Storage path updated for %s\nNew path: %s\n", email, path)
        }
        return nil
    })

    grift.Desc("disable", "Disable a user (--email required)")
    grift.Add("disable", func(c *grift.Context) error {
        email := c.Get("email")
        if email == "" {
            return fmt.Errorf("--email is required")
        }

        svc, err := buildServices()
        if err != nil {
            return err
        }

        if err := svc.Disable(context.Background(), email); err != nil {
            return err
        }

        fmt.Printf("User %s has been disabled.\n", email)
        return nil
    })

    grift.Desc("enable", "Enable a user (--email required)")
    grift.Add("enable", func(c *grift.Context) error {
        email := c.Get("email")
        if email == "" {
            return fmt.Errorf("--email is required")
        }

        svc, err := buildServices()
        if err != nil {
            return err
        }

        if err := svc.Enable(context.Background(), email); err != nil {
            return err
        }

        fmt.Printf("User %s has been enabled.\n", email)
        return nil
    })
})
```

---

## 8. Auth Middleware Update

**File:** `server/actions/auth.go`

Update middleware to block disabled users:

```go
func authMiddleware(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        cfg := GetConfig()

        // Dev mode bypass
        if cfg.DevMode.Enabled {
            c.Set("user_id", cfg.DevMode.UserID)
            c.Set("user_email", cfg.DevMode.Email)
            return next(c)
        }

        // Validate JWT
        token := extractToken(c)
        claims, err := validateToken(token, cfg.JWT.Secret)
        if err != nil {
            return c.Error(http.StatusUnauthorized, err)
        }

        // Check if user is disabled
        tx := c.Value("tx").(*pop.Connection)
        user := &models.User{}
        if err := tx.Select("id", "disabled").Find(user, claims.UserID); err != nil {
            return c.Error(http.StatusUnauthorized, fmt.Errorf("user not found"))
        }
        if user.Disabled {
            return c.Error(http.StatusForbidden, fmt.Errorf("account disabled"))
        }

        c.Set("user_id", claims.UserID)
        c.Set("user_email", claims.Email)
        return next(c)
    }
}
```

Also update `authRefresh` to prevent token refresh for disabled users:

```go
func authRefresh(c buffalo.Context) error {
    // ... existing token validation ...

    // Find user and check disabled status
    tx := c.Value("tx").(*pop.Connection)
    user := &models.User{}
    if err := tx.Find(user, claims.UserID); err != nil {
        return c.Error(http.StatusUnauthorized, fmt.Errorf("user not found"))
    }
    if user.Disabled {
        return c.Error(http.StatusForbidden, fmt.Errorf("account disabled"))
    }

    // Generate new tokens...
}
```

---

## 9. Configuration

**File:** `server/internal/config/config.go`

Add admin config:

```go
type AdminConfig struct {
    AllowedPaths []string `yaml:"allowed_paths"`
}

type Config struct {
    // ... existing fields ...
    Admin AdminConfig `yaml:"admin"`
}
```

**File:** `server/config/clipper.yaml`

```yaml
admin:
  allowed_paths:
    - "./clips"
    - "/var/lib/web-clipper"
```

---

## 10. Makefile Shortcuts

**File:** `server/Makefile`

```makefile
.PHONY: users-list users-show users-set-storage users-disable users-enable

users-list:
	buffalo task users:list

users-show:
	@test -n "$(EMAIL)" || (echo "Usage: make users-show EMAIL=x@y.com" && exit 1)
	buffalo task users:show --email=$(EMAIL)

users-set-storage:
	@test -n "$(EMAIL)" || (echo "Usage: make users-set-storage EMAIL=x@y.com PATH=/path" && exit 1)
	buffalo task users:set-storage --email=$(EMAIL) --path=$(PATH)

users-disable:
	@test -n "$(EMAIL)" || (echo "Usage: make users-disable EMAIL=x@y.com" && exit 1)
	buffalo task users:disable --email=$(EMAIL)

users-enable:
	@test -n "$(EMAIL)" || (echo "Usage: make users-enable EMAIL=x@y.com" && exit 1)
	buffalo task users:enable --email=$(EMAIL)
```

---

## 11. Security Considerations

| Risk | Mitigation |
|------|------------|
| Path traversal | Reject `..` before transformation; resolve symlinks |
| Token refresh bypass | Check disabled in both middleware and refresh |
| Unauthorized CLI access | CLI requires shell access (implicit auth) |
| Audit trail | Structured logging on all state changes |

---

## 12. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC1 | `users:list` displays all users with status |
| AC2 | `users:show --email=x` displays user details |
| AC3 | `users:set-storage` updates database |
| AC4 | `users:disable` sets disabled=true |
| AC5 | `users:enable` sets disabled=false |
| AC6 | Disabled user receives 403 on API calls |
| AC7 | Disabled user cannot refresh tokens |
| AC8 | Path with `..` is rejected |
| AC9 | Services are unit testable with mocks |

---

## 13. Implementation Order

1. Create migration for `disabled` column
2. Update `models/user.go` with `Disabled` field
3. Add `AdminConfig` to config
4. Create `internal/repository/` package
5. Create `internal/services/` package
6. Create `grifts/users.go` CLI commands
7. Update `actions/auth.go` middleware
8. Add Makefile shortcuts
9. Run migration and test all commands

---

## 14. Manual Testing

```bash
# Run migration
buffalo pop migrate

# List users
buffalo task users:list

# Show user
buffalo task users:show --email=test@example.com

# Set custom storage
buffalo task users:set-storage --email=test@example.com --path=~/clips

# Disable user
buffalo task users:disable --email=test@example.com

# Verify disabled user cannot access API
curl -H "Authorization: Bearer <token>" localhost:3000/api/v1/config
# Expected: 403 Forbidden

# Re-enable user
buffalo task users:enable --email=test@example.com

# Verify API access restored
curl -H "Authorization: Bearer <token>" localhost:3000/api/v1/config
# Expected: 200 OK
```

---

## 15. CTO Architecture Review

**Reviewed by:** CTO Architect Agent
**Date:** 2026-01-18
**Verdict:** Approved with modifications

### Review Summary

| Area | Assessment | Status |
|------|------------|--------|
| Layered architecture | Appropriate, introduces new pattern | ✅ Approved |
| Repository interface | Made generic with single `Update()` | ✅ Fixed |
| Migration | Added `NOT NULL` constraint | ✅ Fixed |
| Path validation | Symlink resolution included | ✅ OK |
| Auth middleware | DB query per request (acceptable trade-off) | ✅ Documented |
| Audit logging | Structured logging in services | ✅ OK |

### Trade-offs Accepted

1. **Auth Middleware DB Query**: Each authenticated request now requires a database lookup to check disabled status. For small user bases, this is acceptable. For scale, consider caching disabled status in JWT claims or using a short-TTL cache.

2. **New Package Structure**: Introduces `internal/repository/` and `internal/services/` which don't exist in current codebase. This is an architectural improvement that should be documented as an ADR and potentially applied to other features over time.

### Future Enhancements (Not in Scope)

- Pagination for user list
- `--confirm` flag for destructive operations
- Standalone CLI tool (vs Buffalo grifts)
- Persistent audit log table
