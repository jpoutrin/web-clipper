package repository

import (
	"context"

	"server/models"
)

// UserRepository defines the interface for user data access.
type UserRepository interface {
	// FindAll returns all users.
	FindAll(ctx context.Context) (models.Users, error)

	// FindByID returns a user by their UUID.
	FindByID(ctx context.Context, id string) (*models.User, error)

	// FindByEmail returns a user by their email address.
	FindByEmail(ctx context.Context, email string) (*models.User, error)

	// Update persists changes to an existing user.
	Update(ctx context.Context, user *models.User) error
}

// ApiTokenRepository defines the interface for API token data access.
type ApiTokenRepository interface {
	// FindByUserID returns all tokens for a user.
	FindByUserID(ctx context.Context, userID string) (models.ApiTokens, error)

	// FindByHash finds a token by its hash.
	FindByHash(ctx context.Context, tokenHash string) (*models.ApiToken, error)

	// Create persists a new API token.
	Create(ctx context.Context, token *models.ApiToken) error

	// Update persists changes to an existing token.
	Update(ctx context.Context, token *models.ApiToken) error

	// Revoke marks a token as revoked with a reason.
	Revoke(ctx context.Context, id string, reason string) error
}
