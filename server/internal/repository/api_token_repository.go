package repository

import (
	"context"
	"fmt"
	"time"

	"server/models"

	"github.com/gobuffalo/nulls"
	"github.com/gobuffalo/pop/v6"
	"github.com/gofrs/uuid"
)

// PopApiTokenRepository implements ApiTokenRepository using Pop ORM.
type PopApiTokenRepository struct {
	db *pop.Connection
}

// NewPopApiTokenRepository creates a new PopApiTokenRepository.
func NewPopApiTokenRepository(db *pop.Connection) *PopApiTokenRepository {
	return &PopApiTokenRepository{db: db}
}

// FindByUserID returns all tokens for a user.
func (r *PopApiTokenRepository) FindByUserID(ctx context.Context, userID string) (models.ApiTokens, error) {
	id, err := uuid.FromString(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	tokens, err := models.FindTokensByUserID(r.db, id)
	if err != nil {
		return nil, fmt.Errorf("failed to find tokens: %w", err)
	}

	return tokens, nil
}

// FindByHash finds a token by its hash.
func (r *PopApiTokenRepository) FindByHash(ctx context.Context, tokenHash string) (*models.ApiToken, error) {
	token, err := models.FindTokenByHash(r.db, tokenHash)
	if err != nil {
		return nil, fmt.Errorf("failed to find token: %w", err)
	}

	return token, nil
}

// Create persists a new API token.
func (r *PopApiTokenRepository) Create(ctx context.Context, token *models.ApiToken) error {
	if err := r.db.Create(token); err != nil {
		return fmt.Errorf("failed to create token: %w", err)
	}

	return nil
}

// Update persists changes to an existing token.
func (r *PopApiTokenRepository) Update(ctx context.Context, token *models.ApiToken) error {
	if err := r.db.Update(token); err != nil {
		return fmt.Errorf("failed to update token: %w", err)
	}

	return nil
}

// Revoke marks a token as revoked with a reason.
func (r *PopApiTokenRepository) Revoke(ctx context.Context, id string, reason string) error {
	tokenID, err := uuid.FromString(id)
	if err != nil {
		return fmt.Errorf("invalid token ID: %w", err)
	}

	token := &models.ApiToken{}
	if err := r.db.Find(token, tokenID); err != nil {
		return fmt.Errorf("failed to find token: %w", err)
	}

	token.Revoked = true
	token.RevokedAt = nulls.NewTime(time.Now())
	token.RevokedReason = nulls.NewString(reason)

	if err := r.db.Update(token); err != nil {
		return fmt.Errorf("failed to revoke token: %w", err)
	}

	return nil
}
