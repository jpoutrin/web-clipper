package services

import "errors"

// Domain errors for the services layer.
var (
	// ErrUserNotFound is returned when a user cannot be found.
	ErrUserNotFound = errors.New("user not found")

	// ErrInvalidPath is returned when a storage path is invalid.
	ErrInvalidPath = errors.New("invalid storage path")

	// ErrPathTraversal is returned when path traversal is detected.
	ErrPathTraversal = errors.New("path traversal not allowed")

	// ErrPathNotAllowed is returned when a path is not in the allowed list.
	ErrPathNotAllowed = errors.New("path not in allowed list")

	// ErrUserAlreadyDisabled is returned when trying to disable an already disabled user.
	ErrUserAlreadyDisabled = errors.New("user is already disabled")

	// ErrUserAlreadyEnabled is returned when trying to enable an already enabled user.
	ErrUserAlreadyEnabled = errors.New("user is already enabled")
)
