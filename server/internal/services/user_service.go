package services

import (
	"context"
	"fmt"

	"server/internal/repository"
	"server/models"

	"github.com/gobuffalo/nulls"
)

// UserServiceImpl implements UserService.
type UserServiceImpl struct {
	repo             repository.UserRepository
	storageValidator StorageValidator
	logger           Logger
}

// NewUserService creates a new UserServiceImpl.
func NewUserService(repo repository.UserRepository, storageValidator StorageValidator, logger Logger) *UserServiceImpl {
	return &UserServiceImpl{
		repo:             repo,
		storageValidator: storageValidator,
		logger:           logger,
	}
}

// List returns all users with their storage information.
func (s *UserServiceImpl) List(ctx context.Context) ([]UserInfo, error) {
	users, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]UserInfo, len(users))
	for i, u := range users {
		result[i] = userToInfo(&u)
	}
	return result, nil
}

// Get returns a single user's details by email.
func (s *UserServiceImpl) Get(ctx context.Context, email string) (*UserInfo, error) {
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, ErrUserNotFound
	}
	info := userToInfo(user)
	return &info, nil
}

// SetStoragePath updates a user's custom storage path.
func (s *UserServiceImpl) SetStoragePath(ctx context.Context, email, path string) error {
	// Validate path first
	if err := s.storageValidator.Validate(path); err != nil {
		return err
	}

	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return ErrUserNotFound
	}

	oldPath := user.ClipDirectory.String
	if path == "" {
		user.ClipDirectory = nulls.String{}
	} else {
		user.ClipDirectory = nulls.NewString(path)
	}

	if err := s.repo.Update(ctx, user); err != nil {
		return err
	}

	s.logger.Info("storage path updated",
		"email", email,
		"old_path", oldPath,
		"new_path", path,
	)

	return nil
}

// Disable disables a user account.
func (s *UserServiceImpl) Disable(ctx context.Context, email string) error {
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return ErrUserNotFound
	}

	if user.Disabled {
		return ErrUserAlreadyDisabled
	}

	user.Disabled = true
	if err := s.repo.Update(ctx, user); err != nil {
		return err
	}

	s.logger.Info("user disabled", "email", email)
	return nil
}

// Enable enables a previously disabled user account.
func (s *UserServiceImpl) Enable(ctx context.Context, email string) error {
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return ErrUserNotFound
	}

	if !user.Disabled {
		return ErrUserAlreadyEnabled
	}

	user.Disabled = false
	if err := s.repo.Update(ctx, user); err != nil {
		return err
	}

	s.logger.Info("user enabled", "email", email)
	return nil
}

// IsEnabled checks if a user account is enabled.
func (s *UserServiceImpl) IsEnabled(ctx context.Context, userID string) (bool, error) {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to find user: %w", err)
	}
	return !user.Disabled, nil
}

// userToInfo converts a User model to UserInfo.
func userToInfo(u *models.User) UserInfo {
	clipDir := ""
	if u.ClipDirectory.Valid {
		clipDir = u.ClipDirectory.String
	}
	return UserInfo{
		ID:            u.ID.String(),
		Email:         u.Email,
		Name:          u.Name,
		ClipDirectory: clipDir,
		Disabled:      u.Disabled,
		CreatedAt:     u.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:     u.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}
