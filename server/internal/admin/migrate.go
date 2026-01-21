package admin

import (
	"fmt"
	"os"

	"server/models"

	"github.com/gobuffalo/pop/v6"
)

// RunMigrations runs database migrations.
func RunMigrations() error {
	fmt.Println("Running database migrations...")

	// Get migration directory from environment or use default
	migrationDir := os.Getenv("MIGRATION_DIR")
	if migrationDir == "" {
		migrationDir = "./migrations"
	}

	mig, err := pop.NewFileMigrator(migrationDir, models.DB)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %v", err)
	}

	if err := mig.Up(); err != nil {
		return fmt.Errorf("migration failed: %v", err)
	}

	fmt.Println("Migrations completed successfully")
	return nil
}

// ShowMigrationStatus displays the current migration status.
func ShowMigrationStatus() error {
	fmt.Println("Migration status:")

	// Get migration directory from environment or use default
	migrationDir := os.Getenv("MIGRATION_DIR")
	if migrationDir == "" {
		migrationDir = "./migrations"
	}

	mig, err := pop.NewFileMigrator(migrationDir, models.DB)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %v", err)
	}

	if err := mig.Status(os.Stdout); err != nil {
		return fmt.Errorf("failed to get migration status: %v", err)
	}

	return nil
}
