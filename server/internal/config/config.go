package config

import (
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server  ServerConfig  `yaml:"server"`
	OAuth   OAuthConfig   `yaml:"oauth"`
	Storage StorageConfig `yaml:"storage"`
	Images  ImagesConfig  `yaml:"images"`
	JWT     JWTConfig     `yaml:"jwt"`
	DevMode DevModeConfig `yaml:"dev_mode"`
}

type DevModeConfig struct {
	Enabled bool   `yaml:"enabled"`
	UserID  string `yaml:"user_id"`
	Email   string `yaml:"email"`
	Name    string `yaml:"name"`
}

type ServerConfig struct {
	Port string `yaml:"port"`
	Host string `yaml:"host"`
}

type OAuthConfig struct {
	Provider     string         `yaml:"provider"`
	ClientID     string         `yaml:"client_id"`
	ClientSecret string         `yaml:"client_secret"`
	RedirectURL  string         `yaml:"redirect_url"`
	Keycloak     KeycloakConfig `yaml:"keycloak"`
}

type KeycloakConfig struct {
	Realm   string `yaml:"realm"`
	BaseURL string `yaml:"base_url"`
}

type StorageConfig struct {
	BasePath      string `yaml:"base_path"`
	CreateMissing bool   `yaml:"create_missing"`
}

type ImagesConfig struct {
	MaxSizeBytes     int64 `yaml:"max_size_bytes"`
	MaxDimensionPx   int   `yaml:"max_dimension_px"`
	MaxTotalBytes    int64 `yaml:"max_total_bytes"`
	PreserveOriginal bool  `yaml:"preserve_original"`
}

type JWTConfig struct {
	Secret      string `yaml:"secret"`
	ExpiryHours int    `yaml:"expiry_hours"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Expand environment variables
	expanded := os.ExpandEnv(string(data))

	var cfg Config
	if err := yaml.Unmarshal([]byte(expanded), &cfg); err != nil {
		return nil, err
	}

	// Apply defaults
	if cfg.Images.MaxSizeBytes == 0 {
		cfg.Images.MaxSizeBytes = 5 * 1024 * 1024 // 5MB
	}
	if cfg.Images.MaxDimensionPx == 0 {
		cfg.Images.MaxDimensionPx = 2048
	}
	if cfg.Images.MaxTotalBytes == 0 {
		cfg.Images.MaxTotalBytes = 25 * 1024 * 1024 // 25MB
	}
	if cfg.JWT.ExpiryHours == 0 {
		cfg.JWT.ExpiryHours = 24
	}

	// Override dev mode from environment variable (handles string "true"/"false")
	if devMode := os.Getenv("DEV_MODE"); devMode != "" {
		cfg.DevMode.Enabled = strings.ToLower(devMode) == "true" || devMode == "1"
	}

	// Dev mode defaults
	if cfg.DevMode.Enabled {
		if cfg.DevMode.UserID == "" {
			cfg.DevMode.UserID = "dev-user-001"
		}
		if cfg.DevMode.Email == "" {
			cfg.DevMode.Email = "dev@localhost"
		}
		if cfg.DevMode.Name == "" {
			cfg.DevMode.Name = "Dev User"
		}
		// Use default JWT secret in dev mode if not set
		if cfg.JWT.Secret == "" {
			cfg.JWT.Secret = "dev-secret-change-in-production"
		}
	}

	return &cfg, nil
}
