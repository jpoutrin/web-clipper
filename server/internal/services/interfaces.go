package services

import (
	"context"
)

// Logger defines the interface for audit logging.
type Logger interface {
	Info(msg string, args ...interface{})
	Warn(msg string, args ...interface{})
	Error(msg string, args ...interface{})
}

// UserInfo represents user information for display.
type UserInfo struct {
	ID            string
	Email         string
	Name          string
	ClipDirectory string
	Disabled      bool
	CreatedAt     string
	UpdatedAt     string
}

// UserService defines the interface for user management operations.
type UserService interface {
	// List returns all users with their storage information.
	List(ctx context.Context) ([]UserInfo, error)

	// Get returns a single user's details by email.
	Get(ctx context.Context, email string) (*UserInfo, error)

	// SetStoragePath updates a user's custom storage path.
	SetStoragePath(ctx context.Context, email, path string) error

	// Disable disables a user account.
	Disable(ctx context.Context, email string) error

	// Enable enables a previously disabled user account.
	Enable(ctx context.Context, email string) error

	// IsEnabled checks if a user account is enabled.
	IsEnabled(ctx context.Context, userID string) (bool, error)
}

// StorageValidator defines the interface for storage path validation.
type StorageValidator interface {
	// Validate checks if a path is safe and allowed.
	Validate(path string) error

	// GetEffectivePath returns the full path for a user's storage.
	GetEffectivePath(userID, customPath string) (string, error)
}

// ServiceFactory creates service instances.
type ServiceFactory interface {
	// UserService returns a UserService instance.
	UserService() UserService

	// StorageValidator returns a StorageValidator instance.
	StorageValidator() StorageValidator
}
