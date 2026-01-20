package services

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"time"

	"server/internal/repository"
	"server/models"

	"github.com/gobuffalo/nulls"
)

// TokenServiceImpl implements TokenService.
type TokenServiceImpl struct {
	tokenRepo repository.ApiTokenRepository
	userRepo  repository.UserRepository
	logger    Logger
}

// NewTokenService creates a new TokenServiceImpl.
func NewTokenService(tokenRepo repository.ApiTokenRepository, userRepo repository.UserRepository, logger Logger) *TokenServiceImpl {
	return &TokenServiceImpl{
		tokenRepo: tokenRepo,
		userRepo:  userRepo,
		logger:    logger,
	}
}

// Create generates a new service token for a user.
func (s *TokenServiceImpl) Create(ctx context.Context, email, name string, expiryDuration string) (string, error) {
	// Find user
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return "", fmt.Errorf("user not found: %s", email)
	}

	// Check if user is disabled
	if user.Disabled {
		return "", fmt.Errorf("user account is disabled: %s", email)
	}

	// Parse expiry duration
	var expiresAt nulls.Time
	if expiryDuration == "never" || expiryDuration == "" {
		// NULL = never expires (or set to 10 years as pseudo-never)
		expiresAt = nulls.Time{}
	} else {
		duration, err := parseDuration(expiryDuration)
		if err != nil {
			return "", fmt.Errorf("invalid expiry duration '%s': %w", expiryDuration, err)
		}
		expiresAt = nulls.NewTime(time.Now().Add(duration))
	}

	// Default to 1 year if not specified
	if !expiresAt.Valid && expiryDuration == "" {
		expiresAt = nulls.NewTime(time.Now().Add(365 * 24 * time.Hour))
	}

	// Generate token
	fullToken, token, err := models.GenerateToken(user.ID, name, expiresAt)
	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}

	// Save to database
	if err := s.tokenRepo.Create(ctx, token); err != nil {
		return "", fmt.Errorf("failed to save token: %w", err)
	}

	s.logger.Info("service token created",
		"user_email", email,
		"token_name", name,
		"token_prefix", token.Prefix,
		"expires_at", formatNullTime(expiresAt),
	)

	return fullToken, nil
}

// List returns all tokens for a user.
func (s *TokenServiceImpl) List(ctx context.Context, email string) ([]TokenInfo, error) {
	// Find user
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("user not found: %s", email)
	}

	// Get tokens
	tokens, err := s.tokenRepo.FindByUserID(ctx, user.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to list tokens: %w", err)
	}

	// Convert to TokenInfo
	result := make([]TokenInfo, len(tokens))
	for i, token := range tokens {
		result[i] = TokenInfo{
			ID:            token.ID.String(),
			Name:          token.Name,
			Prefix:        token.Prefix,
			ExpiresAt:     formatNullTime(token.ExpiresAt),
			LastUsedAt:    formatNullTime(token.LastUsedAt),
			Revoked:       token.Revoked,
			RevokedAt:     formatNullTime(token.RevokedAt),
			RevokedReason: token.RevokedReason.String,
			CreatedAt:     token.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	return result, nil
}

// Revoke marks a token as revoked with a reason.
func (s *TokenServiceImpl) Revoke(ctx context.Context, tokenID, reason string) error {
	if err := s.tokenRepo.Revoke(ctx, tokenID, reason); err != nil {
		return fmt.Errorf("failed to revoke token: %w", err)
	}

	s.logger.Info("service token revoked",
		"token_id", tokenID,
		"reason", reason,
	)

	return nil
}

// parseDuration converts strings like "365d", "24h", "2y" to time.Duration
func parseDuration(s string) (time.Duration, error) {
	// Match pattern: number + unit (d, h, m, s, y)
	re := regexp.MustCompile(`^(\d+)([dhsy])$`)
	matches := re.FindStringSubmatch(s)
	if matches == nil {
		return 0, fmt.Errorf("invalid format, use: 365d, 24h, 2y, or 'never'")
	}

	value, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0, fmt.Errorf("invalid number: %s", matches[1])
	}

	unit := matches[2]
	switch unit {
	case "s":
		return time.Duration(value) * time.Second, nil
	case "m":
		return time.Duration(value) * time.Minute, nil
	case "h":
		return time.Duration(value) * time.Hour, nil
	case "d":
		return time.Duration(value) * 24 * time.Hour, nil
	case "y":
		return time.Duration(value) * 365 * 24 * time.Hour, nil
	default:
		return 0, fmt.Errorf("unknown unit: %s", unit)
	}
}

// formatNullTime formats a nulls.Time for display
func formatNullTime(t nulls.Time) string {
	if !t.Valid {
		return "never"
	}
	return t.Time.Format("2006-01-02 15:04:05")
}
