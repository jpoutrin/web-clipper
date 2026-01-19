package repository

import (
	"context"
	"fmt"

	"server/models"

	"github.com/gobuffalo/pop/v6"
)

// PopUserRepository implements UserRepository using Pop ORM.
type PopUserRepository struct {
	db *pop.Connection
}

// NewPopUserRepository creates a new PopUserRepository.
func NewPopUserRepository(db *pop.Connection) *PopUserRepository {
	return &PopUserRepository{db: db}
}

// FindAll returns all users.
func (r *PopUserRepository) FindAll(ctx context.Context) (models.Users, error) {
	users := models.Users{}
	if err := r.db.WithContext(ctx).All(&users); err != nil {
		return nil, fmt.Errorf("failed to fetch users: %w", err)
	}
	return users, nil
}

// FindByID returns a user by their UUID.
func (r *PopUserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	if err := r.db.WithContext(ctx).Find(user, id); err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

// FindByEmail returns a user by their email address.
func (r *PopUserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(user); err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

// Update persists changes to an existing user.
func (r *PopUserRepository) Update(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).Update(user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}
