package admin

import (
	"fmt"
	"strings"

	"server/internal/config"
	"server/internal/repository"
	"server/internal/services"
	"server/models"
)

// CLILogger implements services.Logger for CLI output.
type CLILogger struct{}

func (l *CLILogger) Info(msg string, args ...interface{}) {
	fmt.Printf("[INFO] %s", msg)
	for i := 0; i < len(args); i += 2 {
		if i+1 < len(args) {
			fmt.Printf(" %v=%v", args[i], args[i+1])
		}
	}
	fmt.Println()
}

func (l *CLILogger) Warn(msg string, args ...interface{}) {
	fmt.Printf("[WARN] %s", msg)
	for i := 0; i < len(args); i += 2 {
		if i+1 < len(args) {
			fmt.Printf(" %v=%v", args[i], args[i+1])
		}
	}
	fmt.Println()
}

func (l *CLILogger) Error(msg string, args ...interface{}) {
	fmt.Printf("[ERROR] %s", msg)
	for i := 0; i < len(args); i += 2 {
		if i+1 < len(args) {
			fmt.Printf(" %v=%v", args[i], args[i+1])
		}
	}
	fmt.Println()
}

// buildServices creates the service instances for user CLI commands.
func buildServices() (services.UserService, error) {
	// Find config file (searches production and development paths)
	configPath, err := config.FindConfigPath()
	if err != nil {
		return nil, fmt.Errorf("failed to find config: %w", err)
	}

	// Load config
	cfg, err := config.Load(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// Create logger
	logger := &CLILogger{}

	// Create repository
	repo := repository.NewPopUserRepository(models.DB)

	// Create storage validator
	storageValidator := services.NewStorageService(cfg, logger)

	// Create user service
	userService := services.NewUserService(repo, storageValidator, logger)

	return userService, nil
}

// buildTokenServices creates service instances for token management.
func buildTokenServices() (services.TokenService, error) {
	// Create logger
	logger := &CLILogger{}

	// Create repositories
	userRepo := repository.NewPopUserRepository(models.DB)
	tokenRepo := repository.NewPopApiTokenRepository(models.DB)

	// Create token service
	tokenService := services.NewTokenService(tokenRepo, userRepo, logger)

	return tokenService, nil
}

// ParseFlag extracts a named argument from command-line args (--name=value format).
func ParseFlag(args []string, name string) string {
	prefix := "--" + name + "="
	for _, arg := range args {
		if strings.HasPrefix(arg, prefix) {
			return strings.TrimPrefix(arg, prefix)
		}
	}
	return ""
}

// valueOrDefault returns the value if non-empty, otherwise the default.
func valueOrDefault(value, defaultValue string) string {
	if value == "" {
		return defaultValue
	}
	return value
}
