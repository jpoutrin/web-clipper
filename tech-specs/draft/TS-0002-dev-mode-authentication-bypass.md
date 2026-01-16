---
tech_spec_id: TS-0002
title: Dev Mode Authentication Bypass
status: DRAFT
decision_ref:
author:
created: 2026-01-16
last_updated: 2026-01-16
related_prd:
---

# TS-0002: Dev Mode Authentication Bypass

## Executive Summary

This specification defines a development mode that bypasses OAuth authentication and uses a pre-configured test user. This simplifies local development and testing by eliminating the need for Keycloak or other OAuth provider setup. When enabled via environment variable (`DEV_MODE=true`), the system creates a default dev user and provides a simple endpoint to obtain valid JWT tokens.

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
┌─────────────────────────────────────────────────────────────────┐
│                    Normal Auth Flow                              │
│  Extension ──▶ /auth/login ──▶ Keycloak ──▶ /auth/callback      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Dev Mode Auth Flow                            │
│  Extension ──▶ /auth/dev-token ──▶ JWT returned directly        │
│                        │                                         │
│                        ▼                                         │
│              (Creates dev user if not exists)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Overview

When `DEV_MODE=true`:

1. **Config Loader**: Reads dev mode settings from `clipper.yaml`
2. **Auth Middleware**: Bypasses JWT validation, injects dev user into context
3. **Dev Token Endpoint**: Returns valid JWT tokens without OAuth flow
4. **Extension**: Can fetch tokens directly via `/auth/dev-token`

### Data Flow

1. Extension calls `GET /auth/dev-token`
2. Server creates dev user in database (if not exists)
3. Server generates and returns JWT tokens
4. Extension stores tokens and proceeds normally
5. Protected endpoints accept requests (middleware injects dev user context)

---

## Detailed Specifications

### Component 1: Configuration

**Responsibility**: Define dev mode settings

**File**: `internal/config/config.go`

**New Types**:
```go
type DevModeConfig struct {
    Enabled bool   `yaml:"enabled"`
    UserID  string `yaml:"user_id"`
    Email   string `yaml:"email"`
    Name    string `yaml:"name"`
}
```

**Config Changes**:
```go
type Config struct {
    // ... existing fields
    DevMode DevModeConfig `yaml:"dev_mode"`
}
```

**Implementation Notes**:
- Default `enabled` to `false` for safety
- Use environment variable expansion: `${DEV_MODE:-false}`
- Provide sensible defaults for user fields

---

### Component 2: YAML Configuration

**Responsibility**: Store dev mode settings

**File**: `config/clipper.yaml`

**New Section**:
```yaml
dev_mode:
  enabled: ${DEV_MODE:-false}
  user_id: "dev-user-001"
  email: "dev@localhost"
  name: "Dev User"
```

**Implementation Notes**:
- Environment variable toggle for easy CI/CD control
- Fixed user_id ensures consistent testing
- Email follows RFC 5321 format for validation compatibility

---

### Component 3: Auth Middleware

**Responsibility**: Skip JWT validation in dev mode

**File**: `actions/auth.go`

**Modified Function**: `authMiddleware`

**Logic**:
```go
func authMiddleware(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        cfg := GetConfig()

        // Dev mode bypass
        if cfg.DevMode.Enabled {
            c.Set("user_id", cfg.DevMode.UserID)
            c.Set("user_email", cfg.DevMode.Email)
            c.Logger().Warn("DEV MODE: Authentication bypassed")
            return next(c)
        }

        // Normal JWT validation...
    }
}
```

**Implementation Notes**:
- Log warning when dev mode is active
- Still set context values for downstream handlers
- No token validation required

---

### Component 4: Dev Token Endpoint

**Responsibility**: Provide JWT tokens without OAuth

**File**: `actions/auth.go`

**New Function**: `authDevToken`

**Logic**:
```go
func authDevToken(c buffalo.Context) error {
    cfg := GetConfig()

    // Reject if dev mode not enabled
    if !cfg.DevMode.Enabled {
        return c.Error(http.StatusForbidden,
            fmt.Errorf("dev mode is not enabled"))
    }

    // Find or create dev user
    tx := c.Value("tx").(*pop.Connection)
    user, err := models.FindOrCreateByOAuthID(
        tx,
        cfg.DevMode.UserID,
        cfg.DevMode.Email,
        cfg.DevMode.Name,
    )
    if err != nil {
        return c.Error(http.StatusInternalServerError, err)
    }

    // Generate tokens
    tokens, err := generateTokens(user)
    if err != nil {
        return c.Error(http.StatusInternalServerError, err)
    }

    c.Logger().Warn("DEV MODE: Token generated for dev user")
    return c.Render(http.StatusOK, r.JSON(tokens))
}
```

**Implementation Notes**:
- Return 403 Forbidden if dev mode not enabled
- Uses existing `FindOrCreateByOAuthID` for user creation
- Generates standard JWT tokens (same as OAuth flow)

---

### Component 5: Route Registration

**Responsibility**: Register dev token endpoint

**File**: `actions/app.go`

**Changes**:
```go
// Auth routes
auth := app.Group("/auth")
auth.GET("/login", authLogin)
auth.GET("/callback", authCallback)
auth.POST("/refresh", authRefresh)
auth.POST("/logout", authLogout)
auth.GET("/dev-token", authDevToken)  // NEW: Dev mode token endpoint
```

**Implementation Notes**:
- Endpoint always registered (returns 403 if dev mode off)
- No auth middleware on this endpoint
- GET method for easy browser/curl testing

---

### Component 6: Extension Support (Optional)

**Responsibility**: Simplify dev mode usage in extension

**File**: `extension/src/background.ts`

**New State Field**:
```typescript
interface AuthState {
    // ... existing fields
    devMode?: boolean;
}
```

**New Function**:
```typescript
async function fetchDevToken(): Promise<TokenResponse | { error: string }> {
    try {
        const response = await fetch(`${authState.serverUrl}/auth/dev-token`);
        if (!response.ok) {
            if (response.status === 403) {
                return { error: 'Dev mode not enabled on server' };
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const tokens = await response.json();
        authState.accessToken = tokens.access_token;
        authState.refreshToken = tokens.refresh_token;
        authState.expiresAt = tokens.expires_at;
        authState.devMode = true;

        await chrome.storage.local.set({ authState });
        return tokens;
    } catch (err) {
        return { error: `Failed to fetch dev token: ${err}` };
    }
}
```

**Implementation Notes**:
- Optional enhancement for extension
- Falls back gracefully if server not in dev mode
- Marks `devMode: true` in state for UI indication

---

## Data Model

### Dev User Entity

Uses existing `users` table with dev-specific values:

| Field | Value | Notes |
|-------|-------|-------|
| id | Auto-generated UUID | Standard |
| oauth_id | "dev-user-001" | From config |
| email | "dev@localhost" | From config |
| name | "Dev User" | From config |
| clip_directory | NULL | Uses default |

### No Schema Changes Required

The dev user is stored in the existing `users` table using `FindOrCreateByOAuthID`.

---

## API Specification

### GET /auth/dev-token

**Description**: Obtain JWT tokens for the dev user (only in dev mode)

**Authentication**: None required

**Request**: No body

**Response** (200 OK - Dev mode enabled)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": 1705449600
}
```

**Response** (403 Forbidden - Dev mode disabled)
```json
{
  "error": "dev mode is not enabled"
}
```

**Errors**
| Status | Description |
|--------|-------------|
| 403 | Dev mode not enabled |
| 500 | Internal error (DB or token generation) |

---

## Security Implementation

### Security Considerations

**WARNING**: Dev mode completely bypasses authentication. It must NEVER be enabled in production.

### Safeguards

1. **Environment Variable Toggle**: Requires explicit `DEV_MODE=true`
2. **Logging**: All dev mode operations log warnings
3. **403 Response**: Endpoint returns forbidden if not enabled
4. **No Default Enablement**: Config defaults to `enabled: false`

### Production Checklist

- [ ] Verify `DEV_MODE` environment variable is NOT set
- [ ] Verify `/auth/dev-token` returns 403
- [ ] Verify logs show no "DEV MODE" warnings
- [ ] Consider removing endpoint in production builds

### Recommended Deployment

```yaml
# docker-compose.yml (development)
environment:
  - DEV_MODE=true
  - JWT_SECRET=dev-secret-not-for-prod

# docker-compose.prod.yml (production)
environment:
  - DEV_MODE=false  # or simply don't set it
  - JWT_SECRET=${JWT_SECRET}  # from secure vault
```

---

## Testing Strategy

### Unit Tests

**File**: `actions/auth_test.go`

**New Test Cases**:
```go
func (as *ActionSuite) Test_DevToken_WhenEnabled() {
    // Enable dev mode in test config
    // Call /auth/dev-token
    // Assert 200 with valid tokens
}

func (as *ActionSuite) Test_DevToken_WhenDisabled() {
    // Ensure dev mode disabled
    // Call /auth/dev-token
    // Assert 403 Forbidden
}

func (as *ActionSuite) Test_AuthMiddleware_DevModeBypass() {
    // Enable dev mode
    // Call protected endpoint without token
    // Assert 200 (not 401)
}
```

### Integration Tests

1. Start server with `DEV_MODE=true`
2. Call `GET /auth/dev-token` → receive tokens
3. Call `GET /api/v1/config` with token → success
4. Call `POST /api/v1/clips` → creates clip as dev user

### Manual Testing

```bash
# Start server in dev mode
DEV_MODE=true JWT_SECRET=test-secret buffalo dev

# Get dev token
curl http://localhost:3000/auth/dev-token

# Use token for API calls
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/config
```

---

## Implementation Checklist

### Phase 1: Backend Changes

- [ ] Add `DevModeConfig` struct to `internal/config/config.go`
- [ ] Add `dev_mode` section to `config/clipper.yaml`
- [ ] Update `authMiddleware` in `actions/auth.go`
- [ ] Add `authDevToken` function in `actions/auth.go`
- [ ] Register `/auth/dev-token` route in `actions/app.go`
- [ ] Add unit tests for dev mode

### Phase 2: Extension Support (Optional)

- [ ] Add `devMode` flag to `AuthState` type
- [ ] Add `fetchDevToken` function to background.ts
- [ ] Add "Dev Login" button to popup (visible only when configured)
- [ ] Add visual indicator when logged in via dev mode

### Verification

- [ ] `DEV_MODE=true buffalo dev` starts server
- [ ] `curl /auth/dev-token` returns tokens
- [ ] Tokens work with protected endpoints
- [ ] Without `DEV_MODE`, endpoint returns 403
- [ ] Logs show "DEV MODE" warnings when active

---

## References

### Related Documents

- Tech Spec: [TS-0001 Web Clipper Phase 1](./TS-0001-web-clipper-phase1.md)
- Tasks: [phase1-tasks.md](../../tasks/phase1-tasks.md)

### Implementation Files

| File | Changes |
|------|---------|
| `server/internal/config/config.go` | Add DevModeConfig |
| `server/config/clipper.yaml` | Add dev_mode section |
| `server/actions/auth.go` | Modify middleware, add endpoint |
| `server/actions/app.go` | Register new route |
| `extension/src/types/index.ts` | Add devMode to AuthState |
| `extension/src/background.ts` | Add fetchDevToken |
