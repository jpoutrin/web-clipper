package services

import (
	"fmt"
	"path/filepath"
	"strings"

	"server/internal/config"
)

// StorageService validates and manages storage paths.
type StorageService struct {
	basePath     string
	allowedPaths []string
	logger       Logger
}

// NewStorageService creates a new StorageService.
func NewStorageService(cfg *config.Config, logger Logger) *StorageService {
	return &StorageService{
		basePath:     cfg.Storage.BasePath,
		allowedPaths: cfg.Admin.AllowedPaths,
		logger:       logger,
	}
}

// Validate checks if a path is safe and allowed.
func (s *StorageService) Validate(path string) error {
	if path == "" {
		return nil // Empty path means use default
	}

	// Check for path traversal attempts
	if strings.Contains(path, "..") {
		return ErrPathTraversal
	}

	// Resolve symlinks and get absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidPath, err)
	}

	// Try to resolve symlinks (file may not exist yet, so ignore errors)
	resolvedPath, err := filepath.EvalSymlinks(absPath)
	if err == nil {
		absPath = resolvedPath
	}

	// Double-check for traversal after resolution
	if strings.Contains(absPath, "..") {
		return ErrPathTraversal
	}

	// Check against allowed paths if configured
	if len(s.allowedPaths) > 0 {
		allowed := false
		for _, allowedPath := range s.allowedPaths {
			absAllowed, err := filepath.Abs(allowedPath)
			if err != nil {
				continue
			}
			if strings.HasPrefix(absPath, absAllowed) {
				allowed = true
				break
			}
		}
		if !allowed {
			return ErrPathNotAllowed
		}
	}

	return nil
}

// GetEffectivePath returns the full path for a user's storage.
func (s *StorageService) GetEffectivePath(userID, customPath string) (string, error) {
	if customPath != "" {
		if err := s.Validate(customPath); err != nil {
			return "", err
		}
		return customPath, nil
	}
	// Default: base_path/user_id
	return filepath.Join(s.basePath, userID), nil
}
