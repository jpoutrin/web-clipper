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
