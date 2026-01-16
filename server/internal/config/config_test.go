package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad(t *testing.T) {
	// Create a temp config file
	content := `
server:
  port: 3000
  host: "localhost"

oauth:
  provider: "keycloak"
  client_id: "${TEST_CLIENT_ID}"
  client_secret: "secret"
  redirect_url: "http://localhost:3000/callback"
  keycloak:
    realm: "test"
    base_url: "http://localhost:8080"

storage:
  base_path: "./clips"
  create_missing: true

images:
  max_size_bytes: 1000000
  max_dimension_px: 1024
  max_total_bytes: 5000000
  preserve_original: false

jwt:
  secret: "test-secret"
  expiry_hours: 12
`

	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "test.yaml")
	if err := os.WriteFile(configPath, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write temp config: %v", err)
	}

	// Set env var for testing
	os.Setenv("TEST_CLIENT_ID", "my-test-client")
	defer os.Unsetenv("TEST_CLIENT_ID")

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	// Verify env var expansion
	if cfg.OAuth.ClientID != "my-test-client" {
		t.Errorf("expected ClientID 'my-test-client', got '%s'", cfg.OAuth.ClientID)
	}

	// Verify values loaded
	if cfg.Server.Port != "3000" {
		t.Errorf("expected Port '3000', got '%s'", cfg.Server.Port)
	}

	if cfg.Images.MaxSizeBytes != 1000000 {
		t.Errorf("expected MaxSizeBytes 1000000, got %d", cfg.Images.MaxSizeBytes)
	}

	if cfg.JWT.ExpiryHours != 12 {
		t.Errorf("expected ExpiryHours 12, got %d", cfg.JWT.ExpiryHours)
	}
}

func TestLoadDefaults(t *testing.T) {
	// Config with missing image settings - should apply defaults
	content := `
server:
  port: 3000

oauth:
  provider: "keycloak"
  client_id: "test"
  client_secret: "secret"
  redirect_url: "http://localhost/callback"
  keycloak:
    realm: "test"
    base_url: "http://localhost"

storage:
  base_path: "./clips"

jwt:
  secret: "secret"
`

	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "test.yaml")
	if err := os.WriteFile(configPath, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write temp config: %v", err)
	}

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	// Verify defaults applied
	if cfg.Images.MaxSizeBytes != 5*1024*1024 {
		t.Errorf("expected default MaxSizeBytes 5MB, got %d", cfg.Images.MaxSizeBytes)
	}

	if cfg.Images.MaxDimensionPx != 2048 {
		t.Errorf("expected default MaxDimensionPx 2048, got %d", cfg.Images.MaxDimensionPx)
	}

	if cfg.JWT.ExpiryHours != 24 {
		t.Errorf("expected default ExpiryHours 24, got %d", cfg.JWT.ExpiryHours)
	}
}
