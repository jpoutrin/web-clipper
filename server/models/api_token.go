package models

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/gobuffalo/nulls"
	"github.com/gobuffalo/pop/v6"
	"github.com/gobuffalo/validate/v3"
	"github.com/gobuffalo/validate/v3/validators"
	"github.com/gofrs/uuid"
)

const (
	TokenPrefix = "wc_" // Web Clipper prefix for easy identification
	TokenLength = 48    // Base64 encoded random bytes
)

// ApiToken represents a long-lived service token for API authentication
type ApiToken struct {
	ID            uuid.UUID    `json:"id" db:"id"`
	UserID        uuid.UUID    `json:"user_id" db:"user_id"`
	Name          string       `json:"name" db:"name"`
	TokenHash     string       `json:"-" db:"token_hash"` // Never expose
	Prefix        string       `json:"prefix" db:"prefix"`
	LastUsedAt    nulls.Time   `json:"last_used_at" db:"last_used_at"`
	ExpiresAt     nulls.Time   `json:"expires_at" db:"expires_at"`
	Revoked       bool         `json:"revoked" db:"revoked"`
	RevokedAt     nulls.Time   `json:"revoked_at" db:"revoked_at"`
	RevokedReason nulls.String `json:"revoked_reason" db:"revoked_reason"`
	CreatedAt     time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at" db:"updated_at"`

	// Associations
	User User `json:"-" belongs_to:"user"`
}

// ApiTokens is a slice of ApiToken for collection operations
type ApiTokens []ApiToken

// Validate validates the ApiToken fields
func (t *ApiToken) Validate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.Validate(
		&validators.UUIDIsPresent{Field: t.UserID, Name: "UserID"},
		&validators.StringIsPresent{Field: t.Name, Name: "Name"},
		&validators.StringIsPresent{Field: t.TokenHash, Name: "TokenHash"},
		&validators.StringIsPresent{Field: t.Prefix, Name: "Prefix"},
	), nil
}

// GenerateToken creates a new cryptographically secure token
// Returns: full token string (show once), token model to save, error
func GenerateToken(userID uuid.UUID, name string, expiresAt nulls.Time) (string, *ApiToken, error) {
	// Generate cryptographically secure random bytes
	tokenBytes := make([]byte, TokenLength)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", nil, fmt.Errorf("failed to generate random token: %w", err)
	}

	// Encode to base64 for safe transmission
	tokenValue := base64.RawURLEncoding.EncodeToString(tokenBytes)
	fullToken := TokenPrefix + tokenValue

	// Hash for storage
	hash := sha256.Sum256([]byte(fullToken))
	tokenHash := base64.RawURLEncoding.EncodeToString(hash[:])

	// Extract prefix for identification
	prefixLen := 12
	if len(fullToken) < prefixLen {
		prefixLen = len(fullToken)
	}
	prefix := fullToken[:prefixLen]

	token := &ApiToken{
		ID:        uuid.Must(uuid.NewV4()),
		UserID:    userID,
		Name:      name,
		TokenHash: tokenHash,
		Prefix:    prefix,
		ExpiresAt: expiresAt,
		Revoked:   false,
	}

	return fullToken, token, nil
}

// HashToken hashes a token string for comparison
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(hash[:])
}

// IsValid checks if token is not revoked and not expired
func (t *ApiToken) IsValid() bool {
	if t.Revoked {
		return false
	}
	if t.ExpiresAt.Valid && t.ExpiresAt.Time.Before(time.Now()) {
		return false
	}
	return true
}

// FindTokensByUserID returns all tokens for a user
func FindTokensByUserID(tx *pop.Connection, userID uuid.UUID) (ApiTokens, error) {
	tokens := ApiTokens{}
	err := tx.Where("user_id = ?", userID).Order("created_at DESC").All(&tokens)
	return tokens, err
}

// FindTokenByHash finds a token by its hash
func FindTokenByHash(tx *pop.Connection, tokenHash string) (*ApiToken, error) {
	token := &ApiToken{}
	err := tx.Where("token_hash = ?", tokenHash).First(token)
	return token, err
}
