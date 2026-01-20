---
tech_spec_id: TS-0013
title: Service Token Management (API Keys)
status: DRAFT
decision_ref:
author:
created: 2026-01-20
last_updated: 2026-01-20
related_prd:
---

# TS-0013: Service Token Management (API Keys)

## Executive Summary

This specification defines a CLI-based system for generating, managing, and revoking long-lived API tokens (service keys) for users. Service tokens enable automation, CI/CD pipelines, and service-to-service authentication without requiring the OAuth flow. Tokens are cryptographically secure, tracked in the database, and compatible with the existing authentication middleware.

---

## Table of Contents

- [Design Overview](#design-overview)
- [Detailed Specifications](#detailed-specifications)
- [Data Model](#data-model)
- [CLI Commands Specification](#cli-commands-specification)
- [Security Implementation](#security-implementation)
- [Testing Strategy](#testing-strategy)
- [Implementation Checklist](#implementation-checklist)

---

## Design Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Service Token System                                 │
│                                                                          │
│  CLI Command ──▶ Grift Task ──▶ TokenService ──▶ ApiTokenRepository     │
│       │                                              │                   │
│       ├─ tokens:create                               ▼                   │
│       ├─ tokens:list                        ┌─────────────────┐          │
│       └─ tokens:revoke                      │ api_tokens table│          │
│                                             └────────┬────────┘          │
│                                                      │                   │
│  API Request ──▶ authMiddleware ──────────────────┘                     │
│       │                │                                                 │
│       │                ├─ Detect: wc_ prefix → validateServiceToken()   │
│       │                └─ Otherwise → validateJWTToken()                │
│       │                                                                  │
│       └─ Bearer wc_abc123... ──▶ Hash ──▶ Lookup ──▶ Validate ──▶ OK   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

1. **api_tokens Table**: Stores token metadata (hash, expiry, usage, revocation)
2. **ApiToken Model**: Handles token generation, hashing, and validation
3. **TokenService**: Business logic for token lifecycle management
4. **CLI Commands**: Grift tasks for create, list, and revoke operations
5. **Auth Middleware**: Extended to support both JWT and service tokens

### Data Flow

**Create Token:**
1. Admin runs `make tokens-create EMAIL=user@example.com NAME="CI Pipeline"`
2. TokenService validates user exists and is not disabled
3. Generate cryptographically secure random token (48 bytes)
4. Format as `wc_<base64-random>`
5. Store SHA-256 hash in database (NEVER plaintext)
6. Display full token once (cannot be retrieved later)

**API Request with Service Token:**
1. Client sends `Authorization: Bearer wc_abc123...`
2. authMiddleware detects `wc_` prefix
3. Hash incoming token with SHA-256
4. Lookup in api_tokens table by hash
5. Validate: not revoked, not expired, user not disabled
6. Update last_used_at asynchronously
7. Set user_id and user_email in context
8. Continue to API handler

**Revoke Token:**
1. Admin runs `make tokens-revoke ID=<uuid> REASON="security breach"`
2. TokenService marks token as revoked with timestamp and reason
3. Future API requests with this token return 401 Unauthorized

---

## Detailed Specifications

### Component 1: Database Schema

**Responsibility**: Store token metadata securely

**File**: `server/migrations/{timestamp}_create_api_tokens.up.fizz`

**Schema**:
```fizz
create_table("api_tokens") {
  t.Column("id", "uuid", {primary: true})
  t.Column("user_id", "uuid", {})
  t.Column("name", "string", {})
  t.Column("token_hash", "string", {})
  t.Column("prefix", "string", {})
  t.Column("last_used_at", "timestamp", {null: true})
  t.Column("expires_at", "timestamp", {null: true})
  t.Column("revoked", "bool", {default: false})
  t.Column("revoked_at", "timestamp", {null: true})
  t.Column("revoked_reason", "text", {null: true})
  t.Timestamps()
}

add_index("api_tokens", "user_id", {})
add_index("api_tokens", "token_hash", {unique: true})
add_index("api_tokens", "prefix", {})
```

**Down Migration** (`{timestamp}_create_api_tokens.down.fizz`):
```fizz
drop_table("api_tokens")
```

**Implementation Notes**:
- `token_hash`: SHA-256 hash, never store plaintext
- `prefix`: First 8-12 chars for safe identification in logs
- `expires_at`: NULL means never expires
- `revoked`: Soft delete for audit trail
- SQLite limitation: May need to skip `add_foreign_key` directive

---

### Component 2: ApiToken Model

**Responsibility**: Token generation, hashing, and validation logic

**File**: `server/models/api_token.go`

**Key Functions**:

```go
// GenerateToken creates a cryptographically secure token
func GenerateToken(userID uuid.UUID, name string, expiresAt nulls.Time) (*ApiToken, string, error)
// Returns: token model (for DB), full token string (show once), error

// HashToken computes SHA-256 hash for verification
func HashToken(token string) string

// IsValid checks if token is not revoked and not expired
func (t *ApiToken) IsValid() bool

// FindTokensByUserID returns all tokens for a user
func FindTokensByUserID(tx *pop.Connection, userID uuid.UUID) (ApiTokens, error)

// FindTokenByHash finds a token by its hash
func FindTokenByHash(tx *pop.Connection, tokenHash string) (*ApiToken, error)
```

**Token Format**:
- Prefix: `wc_` (Web Clipper identifier)
- Random bytes: 48 bytes (cryptographically secure)
- Encoding: Base64 URL-safe encoding
- Example: `wc_AbCdEf123456789...` (total ~70 chars)

**Security Properties**:
- 48 bytes = 384 bits of entropy (extremely secure)
- SHA-256 hashing for storage
- Constant-time comparison for validation

---

### Component 3: Repository Layer

**Responsibility**: Database access for api_tokens table

**Files**:
- `server/internal/repository/interfaces.go` - Interface definition
- `server/internal/repository/api_token_repository.go` - Pop implementation

**Interface**:
```go
type ApiTokenRepository interface {
    FindByUserID(ctx context.Context, userID string) (models.ApiTokens, error)
    FindByHash(ctx context.Context, tokenHash string) (*models.ApiToken, error)
    Create(ctx context.Context, token *models.ApiToken) error
    Update(ctx context.Context, token *models.ApiToken) error
    Revoke(ctx context.Context, id string, reason string) error
}
```

**Implementation Notes**:
- Follow pattern from `PopUserRepository`
- Use Pop ORM for database operations
- Handle errors with context

---

### Component 4: Service Layer

**Responsibility**: Business logic for token lifecycle

**Files**:
- `server/internal/services/interfaces.go` - Interface definition
- `server/internal/services/token_service.go` - Implementation

**Interface**:
```go
type TokenService interface {
    Create(ctx context.Context, email, name string, expiryDuration string) (string, error)
    List(ctx context.Context, email string) ([]TokenInfo, error)
    Revoke(ctx context.Context, tokenID, reason string) error
}
```

**TokenInfo Structure**:
```go
type TokenInfo struct {
    ID           string
    Name         string
    Prefix       string
    ExpiresAt    string
    LastUsedAt   string
    Revoked      bool
    RevokedAt    string
    CreatedAt    string
}
```

**Create Logic**:
1. Validate user exists via UserRepository
2. Parse expiry duration (e.g., "365d", "never")
3. Generate token using `models.GenerateToken()`
4. Save to database via ApiTokenRepository
5. Return full token string (only time it's shown)

**Expiry Parsing**:
- Default: 365 days (1 year)
- Supported formats: "365d", "24h", "2y", "never"
- "never" → NULL in database

---

### Component 5: CLI Commands

**Responsibility**: Administrative interface for token management

**File**: `server/grifts/tokens.go`

**Commands**:

**1. tokens:create**
```bash
make tokens-create EMAIL=user@example.com NAME="Production API" [EXPIRY=365d]
```

Output format:
```
========================================
Service Token Created Successfully
========================================

User:   user@example.com
Name:   Production API
Expiry: 365d

TOKEN (save this, it won't be shown again):
wc_AbCdEf123456789...

========================================
```

**2. tokens:list**
```bash
make tokens-list EMAIL=user@example.com
```

Output format:
```
NAME              PREFIX        STATUS   LAST USED            EXPIRES              CREATED
----              ------        ------   ---------            -------              -------
Production API    wc_AbCdEf     active   2026-01-20 10:30:00  2027-01-20 10:30:00  2026-01-20 10:30:00
CI Pipeline       wc_XyZ123     REVOKED  2026-01-15 14:00:00  never                2026-01-10 09:00:00
```

**3. tokens:revoke**
```bash
make tokens-revoke ID=<uuid> [REASON="security breach"]
```

Output format:
```
Token revoked: 550e8400-e29b-41d4-a716-446655440000
```

**Implementation Notes**:
- Follow pattern from `server/grifts/users.go`
- Use `getArg(c, "name")` for argument parsing
- Use `buildTokenServices()` for service initialization
- Use `tabwriter` for table formatting

---

### Component 6: Authentication Middleware Extension

**Responsibility**: Validate service tokens alongside JWT tokens

**File**: `server/actions/auth.go`

**Modified Function**: `authMiddleware`

**Changes**:
```go
func authMiddleware(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        // ... existing dev mode bypass ...

        authHeader := c.Request().Header.Get("Authorization")
        tokenStr := authHeader[7:] // After "Bearer "

        // Detect token type
        if strings.HasPrefix(tokenStr, "wc_") {
            return validateServiceToken(c, tokenStr, next)
        }

        // Otherwise validate as JWT
        return validateJWTToken(c, tokenStr, cfg, next)
    }
}
```

**New Function**: `validateServiceToken`

```go
func validateServiceToken(c buffalo.Context, token string, next buffalo.Handler) error {
    tx := c.Value("tx").(*pop.Connection)

    // 1. Hash the token
    tokenHash := models.HashToken(token)

    // 2. Find token in database
    apiToken, err := models.FindTokenByHash(tx, tokenHash)
    if err != nil {
        return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid service token"))
    }

    // 3. Validate token
    if !apiToken.IsValid() {
        return c.Error(http.StatusUnauthorized, fmt.Errorf("service token is revoked or expired"))
    }

    // 4. Get user
    user := &models.User{}
    if err := tx.Find(user, apiToken.UserID); err != nil {
        return c.Error(http.StatusUnauthorized, fmt.Errorf("user not found"))
    }

    // 5. Check if user is disabled
    if user.Disabled {
        c.Logger().Warnf("Access denied for disabled user via service token: %s", user.Email)
        return c.Error(http.StatusForbidden, fmt.Errorf("account is disabled"))
    }

    // 6. Update last_used_at (async, don't block request)
    go func() {
        apiToken.LastUsedAt = nulls.NewTime(time.Now())
        tx.Update(apiToken)
    }()

    // 7. Set user info in context
    c.Set("user_id", user.ID.String())
    c.Set("user_email", user.Email)
    c.Set("auth_type", "service_token") // For logging/audit

    c.Logger().Infof("Request authenticated via service token: %s (user: %s)",
        apiToken.Prefix, user.Email)

    return next(c)
}
```

**Extracted Function**: `validateJWTToken`

Extract existing JWT validation logic from authMiddleware into separate function for clarity.

---

### Component 7: Makefile Integration

**Responsibility**: Convenient CLI access

**File**: `server/Makefile`

**New Targets**:
```makefile
# Token management CLI commands
tokens-create:
ifndef EMAIL
	$(error EMAIL is required. Usage: make tokens-create EMAIL=user@example.com NAME="API Name" [EXPIRY=365d])
endif
ifndef NAME
	$(error NAME is required. Usage: make tokens-create EMAIL=user@example.com NAME="API Name" [EXPIRY=365d])
endif
	$(CGO_ENV) $(GRIFT) tokens:create --email=$(EMAIL) --name="$(NAME)" $(if $(EXPIRY),--expiry=$(EXPIRY))

tokens-list:
ifndef EMAIL
	$(error EMAIL is required. Usage: make tokens-list EMAIL=user@example.com)
endif
	$(CGO_ENV) $(GRIFT) tokens:list --email=$(EMAIL)

tokens-revoke:
ifndef ID
	$(error ID is required. Usage: make tokens-revoke ID=token-uuid [REASON="reason"])
endif
	$(CGO_ENV) $(GRIFT) tokens:revoke --id=$(ID) $(if $(REASON),--reason="$(REASON)")
```

---

## Data Model

### api_tokens Table Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique token identifier |
| user_id | UUID | NOT NULL | Owner user (references users.id) |
| name | VARCHAR(255) | NOT NULL | User-friendly name |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE | SHA-256 hash of token |
| prefix | VARCHAR(20) | NOT NULL | First 8-12 chars for identification |
| last_used_at | TIMESTAMP | NULL | Last API request timestamp |
| expires_at | TIMESTAMP | NULL | Expiry timestamp (NULL = never) |
| revoked | BOOLEAN | DEFAULT false | Soft delete flag |
| revoked_at | TIMESTAMP | NULL | Revocation timestamp |
| revoked_reason | TEXT | NULL | Reason for revocation |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| api_tokens_user_id_idx | user_id | Filter by user |
| api_tokens_token_hash_idx | token_hash | Fast token lookup (unique) |
| api_tokens_prefix_idx | prefix | Safe prefix-based searches |

### Entity Relationship

```
┌─────────────┐       ┌─────────────┐
│    users    │       │ api_tokens  │
├─────────────┤       ├─────────────┤
│ id (PK)     │◀──────│ user_id (FK)│
│ email       │  1:N  │ id (PK)     │
│ name        │       │ name        │
│ disabled    │       │ token_hash  │
│ ...         │       │ prefix      │
└─────────────┘       │ last_used_at│
                      │ expires_at  │
                      │ revoked     │
                      │ revoked_at  │
                      │ revoked_reason│
                      │ created_at  │
                      │ updated_at  │
                      └─────────────┘
```

---

## CLI Commands Specification

### Command: tokens:create

**Purpose**: Generate a new long-lived service token for a user

**Syntax**:
```bash
make tokens-create EMAIL=<email> NAME=<name> [EXPIRY=<duration>]
```

**Parameters**:
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| EMAIL | Yes | - | User email address |
| NAME | Yes | - | Token name (e.g., "Production API") |
| EXPIRY | No | 365d | Expiry duration ("365d", "never", "24h", etc.) |

**Examples**:
```bash
# Create token with default 1-year expiry
make tokens-create EMAIL=admin@example.com NAME="Production API"

# Create token with custom expiry
make tokens-create EMAIL=admin@example.com NAME="CI Pipeline" EXPIRY=30d

# Create token that never expires
make tokens-create EMAIL=admin@example.com NAME="Monitoring Service" EXPIRY=never
```

**Success Output**:
```
========================================
Service Token Created Successfully
========================================

User:   admin@example.com
Name:   Production API
Expiry: 365d

TOKEN (save this, it won't be shown again):
wc_AbCdEf123456789KlMnOpQrStUvWxYz...

========================================
```

**Error Cases**:
- User not found → "User not found: admin@example.com"
- Invalid expiry format → "Invalid expiry duration: abc"
- Database error → "Failed to create token: <error>"

---

### Command: tokens:list

**Purpose**: List all service tokens for a user

**Syntax**:
```bash
make tokens-list EMAIL=<email>
```

**Parameters**:
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| EMAIL | Yes | - | User email address |

**Example**:
```bash
make tokens-list EMAIL=admin@example.com
```

**Success Output**:
```
NAME              PREFIX        STATUS   LAST USED            EXPIRES              CREATED
----              ------        ------   ---------            -------              -------
Production API    wc_AbCdEf     active   2026-01-20 10:30:00  2027-01-20 10:30:00  2026-01-20 10:30:00
CI Pipeline       wc_XyZ123     active   2026-01-19 08:15:00  2026-02-18 14:00:00  2026-01-19 08:00:00
Old Token         wc_Qrs456     REVOKED  2026-01-10 12:00:00  never                2025-12-01 09:00:00
```

**Empty Output**:
```
No tokens found for user: admin@example.com
```

**Error Cases**:
- User not found → "User not found: admin@example.com"
- Database error → "Failed to list tokens: <error>"

---

### Command: tokens:revoke

**Purpose**: Revoke a service token (soft delete with audit trail)

**Syntax**:
```bash
make tokens-revoke ID=<token-id> [REASON=<reason>]
```

**Parameters**:
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| ID | Yes | - | Token UUID (from tokens:list) |
| REASON | No | "Revoked via CLI" | Reason for revocation |

**Examples**:
```bash
# Revoke without reason
make tokens-revoke ID=550e8400-e29b-41d4-a716-446655440000

# Revoke with reason
make tokens-revoke ID=550e8400-e29b-41d4-a716-446655440000 REASON="Security breach"
```

**Success Output**:
```
Token revoked: 550e8400-e29b-41d4-a716-446655440000
```

**Error Cases**:
- Token not found → "Token not found: <id>"
- Already revoked → "Token already revoked"
- Database error → "Failed to revoke token: <error>"

---

## Security Implementation

### Token Generation

**Cryptographic Security**:
- Uses `crypto/rand` for cryptographically secure random bytes
- 48 bytes = 384 bits of entropy
- Base64 URL-safe encoding for safe transmission
- Format: `wc_<base64-random>` (~70 chars total)

**Example Generation**:
```go
tokenBytes := make([]byte, 48)
rand.Read(tokenBytes) // Cryptographically secure
tokenValue := base64.RawURLEncoding.EncodeToString(tokenBytes)
fullToken := "wc_" + tokenValue
```

### Token Storage

**Never Store Plaintext**:
- Store SHA-256 hash only
- Hash computed on token creation
- Hash re-computed on token validation
- Constant-time comparison to prevent timing attacks

**Hashing Example**:
```go
hash := sha256.Sum256([]byte(fullToken))
tokenHash := base64.RawURLEncoding.EncodeToString(hash[:])
```

### Token Validation

**Validation Checks** (in order):
1. Token format: Must start with `wc_`
2. Token exists: Hash lookup in database
3. Not revoked: `revoked = false`
4. Not expired: `expires_at > now` or `expires_at IS NULL`
5. User exists: User ID lookup
6. User enabled: `disabled = false`

**Security Properties**:
- Constant-time comparison for hash validation
- No timing attacks possible
- Async last_used_at update (doesn't block validation)
- Audit trail via revoked_at and revoked_reason

### Authorization

**User Permissions**:
- Service tokens inherit user permissions
- No additional authorization layer
- Same access as user's OAuth tokens
- Disabled users cannot use service tokens (checked every request)

**Revocation**:
- Soft delete (revoked flag + timestamp + reason)
- Audit trail preserved
- Cannot be un-revoked (create new token instead)
- Immediate effect (next API request returns 401)

### Rate Limiting

**Recommendation** (not implemented in this spec):
- Apply same rate limiting as OAuth tokens
- Per-user limits, not per-token
- Consider stricter limits for service tokens if needed

---

## Testing Strategy

### Unit Tests

**File**: `server/models/api_token_test.go`

```go
func TestGenerateToken() {
    // Test token generation creates valid format
    // Verify token starts with "wc_"
    // Verify token length and randomness
}

func TestHashToken() {
    // Test hashing produces consistent results
    // Verify different tokens produce different hashes
    // Verify same token produces same hash
}

func TestIsValid() {
    // Test not revoked and not expired returns true
    // Test revoked returns false
    // Test expired returns false
}
```

**File**: `server/actions/auth_test.go`

```go
func (as *ActionSuite) Test_ValidateServiceToken_Valid() {
    // Create valid token
    // Make API request with service token
    // Assert 200 OK
}

func (as *ActionSuite) Test_ValidateServiceToken_Revoked() {
    // Create and revoke token
    // Make API request
    // Assert 401 Unauthorized
}

func (as *ActionSuite) Test_ValidateServiceToken_Expired() {
    // Create token with past expiry
    // Make API request
    // Assert 401 Unauthorized
}

func (as *ActionSuite) Test_ValidateServiceToken_DisabledUser() {
    // Create token for user, then disable user
    // Make API request
    // Assert 403 Forbidden
}
```

### Integration Tests

**Manual Testing Steps**:

1. **Create User**:
   ```bash
   # Via dev mode or OAuth
   DEV_MODE=true make dev
   curl http://localhost:3000/auth/dev-token
   ```

2. **Generate Token**:
   ```bash
   make tokens-create EMAIL=test@example.com NAME="Test Token"
   # Save output token
   ```

3. **Test API with Token**:
   ```bash
   curl -H "Authorization: Bearer wc_..." \
        http://localhost:3000/api/v1/clips
   # Should return 200 OK with clips list
   ```

4. **List Tokens**:
   ```bash
   make tokens-list EMAIL=test@example.com
   # Should show created token with last_used_at updated
   ```

5. **Revoke Token**:
   ```bash
   make tokens-revoke ID=<uuid>
   ```

6. **Test Revoked Token**:
   ```bash
   curl -H "Authorization: Bearer wc_..." \
        http://localhost:3000/api/v1/clips
   # Should return 401 Unauthorized
   ```

7. **Test Token Expiry**:
   ```bash
   # Create short-lived token
   make tokens-create EMAIL=test@example.com NAME="Short" EXPIRY=1m

   # Wait 2 minutes
   sleep 120

   # Test expired token
   curl -H "Authorization: Bearer wc_..." \
        http://localhost:3000/api/v1/clips
   # Should return 401 Unauthorized
   ```

8. **Test Disabled User**:
   ```bash
   # Create token
   make tokens-create EMAIL=test@example.com NAME="Test"

   # Disable user
   make users-disable EMAIL=test@example.com

   # Test token
   curl -H "Authorization: Bearer wc_..." \
        http://localhost:3000/api/v1/clips
   # Should return 403 Forbidden
   ```

---

## Implementation Checklist

### Phase 1: Database Setup

- [ ] Generate migration: `make migrate-new` (name: create_api_tokens)
- [ ] Edit `{timestamp}_create_api_tokens.up.fizz` with schema
- [ ] Edit `{timestamp}_create_api_tokens.down.fizz` with drop statement
- [ ] Remove `add_foreign_key` if SQLite limitation encountered
- [ ] Run migration: `make migrate`
- [ ] Verify table created: `sqlite3 clipper_development.sqlite3 ".schema api_tokens"`

### Phase 2: Model Layer

- [ ] Create `server/models/api_token.go`
- [ ] Implement `ApiToken` struct with validation
- [ ] Implement `GenerateToken()` function
- [ ] Implement `HashToken()` helper
- [ ] Implement `IsValid()` method
- [ ] Implement `FindTokensByUserID()` helper
- [ ] Implement `FindTokenByHash()` helper
- [ ] Add tests in `server/models/api_token_test.go`

### Phase 3: Repository Layer

- [ ] Extend `server/internal/repository/interfaces.go` with `ApiTokenRepository`
- [ ] Create `server/internal/repository/api_token_repository.go`
- [ ] Implement `FindByUserID()`, `FindByHash()`, `Create()`, `Update()`, `Revoke()`
- [ ] Follow pattern from `PopUserRepository`

### Phase 4: Service Layer

- [ ] Extend `server/internal/services/interfaces.go` with `TokenService`
- [ ] Create `server/internal/services/token_service.go`
- [ ] Implement `Create()` with expiry parsing
- [ ] Implement `List()` with formatted output
- [ ] Implement `Revoke()` with soft delete

### Phase 5: CLI Commands

- [ ] Create `server/grifts/tokens.go`
- [ ] Implement `buildTokenServices()` helper
- [ ] Implement `tokens:create` command
- [ ] Implement `tokens:list` command with table formatting
- [ ] Implement `tokens:revoke` command
- [ ] Test all commands manually

### Phase 6: Makefile Integration

- [ ] Add `tokens-create` target to `server/Makefile`
- [ ] Add `tokens-list` target to `server/Makefile`
- [ ] Add `tokens-revoke` target to `server/Makefile`
- [ ] Update `make help` with token management section

### Phase 7: Authentication Integration

- [ ] Modify `server/actions/auth.go`
- [ ] Refactor `authMiddleware` to detect token type
- [ ] Implement `validateServiceToken()` function
- [ ] Extract `validateJWTToken()` function
- [ ] Add imports: `crypto/sha256`, `encoding/base64`
- [ ] Test with both JWT and service tokens

### Phase 8: Testing & Verification

- [ ] Write unit tests for `ApiToken` model
- [ ] Write auth middleware tests for service tokens
- [ ] Run all tests: `make test`
- [ ] Manual testing: create, list, revoke
- [ ] Test API calls with service token
- [ ] Test revoked token returns 401
- [ ] Test expired token returns 401
- [ ] Test disabled user returns 403
- [ ] Verify last_used_at updates

### Verification Checklist

- [ ] Migration applied successfully
- [ ] Token generation produces `wc_` prefixed tokens
- [ ] Tokens stored as SHA-256 hash (never plaintext)
- [ ] CLI commands work correctly
- [ ] Service tokens authenticate API requests
- [ ] JWT tokens still work (backward compatible)
- [ ] Revoked tokens return 401
- [ ] Expired tokens return 401
- [ ] Disabled users return 403
- [ ] last_used_at updates asynchronously
- [ ] All existing tests pass

---

## References

### Related Documents

- [TS-0001 Web Clipper Phase 1](./approved/TS-0001-web-clipper-phase1.md)
- [TS-0002 Dev Mode Authentication](./draft/TS-0002-dev-mode-authentication-bypass.md)
- [TS-0012 Clips Query API](./draft/TS-0012-clips-query-api.md)

### Implementation Files

| File | Changes |
|------|---------|
| `server/migrations/*_create_api_tokens.*.fizz` | NEW: Migration files |
| `server/models/api_token.go` | NEW: Token model and crypto functions |
| `server/internal/repository/interfaces.go` | MODIFY: Add ApiTokenRepository interface |
| `server/internal/repository/api_token_repository.go` | NEW: Repository implementation |
| `server/internal/services/interfaces.go` | MODIFY: Add TokenService interface |
| `server/internal/services/token_service.go` | NEW: Service implementation |
| `server/grifts/tokens.go` | NEW: CLI commands |
| `server/Makefile` | MODIFY: Add token management targets |
| `server/actions/auth.go` | MODIFY: Add service token validation |

### Configuration

**Default Expiry**: 365 days (1 year)

**Expiry Formats Supported**:
- Days: `365d`, `30d`, `7d`
- Hours: `24h`, `12h`
- Years: `2y`, `1y`
- Never: `never` (NULL in database)

### Security Best Practices

1. **Never commit tokens** - Add to .gitignore, use environment variables
2. **Rotate regularly** - Even with long expiry, rotate tokens periodically
3. **Revoke immediately** - If token compromised, revoke and create new
4. **Monitor usage** - Check last_used_at for suspicious activity
5. **Limit scope** - Create separate tokens for different services/environments
6. **Secure storage** - Store tokens in secret managers (not code or config files)

### Example Usage

```bash
# Production deployment
make tokens-create EMAIL=api@company.com NAME="Production API" EXPIRY=365d

# CI/CD pipeline
make tokens-create EMAIL=ci@company.com NAME="GitHub Actions" EXPIRY=90d

# Monitoring service
make tokens-create EMAIL=monitoring@company.com NAME="Prometheus" EXPIRY=never

# Temporary access
make tokens-create EMAIL=contractor@company.com NAME="Contract Work" EXPIRY=30d
```
