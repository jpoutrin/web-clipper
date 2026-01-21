package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"server/actions"
	"server/models"

	"github.com/gobuffalo/pop/v6"
)

// main is the starting point for your Buffalo application.
// You can feel free and add to this `main` method, change
// what it does, etc...
// All we ask is that, at some point, you make sure to
// call `app.Serve()`, unless you don't want to start your
// application that is. :)
func main() {
	migrate := flag.Bool("migrate", false, "Run database migrations and exit")
	migrateStatus := flag.Bool("migrate-status", false, "Show migration status and exit")
	flag.Parse()

	if *migrate {
		runMigrations()
		return
	}

	if *migrateStatus {
		showMigrationStatus()
		return
	}

	app := actions.App()
	if err := app.Serve(); err != nil {
		log.Fatal(err)
	}
}

func runMigrations() {
	fmt.Println("Running database migrations...")

	// Get migration directory from environment or use default
	migrationDir := os.Getenv("MIGRATION_DIR")
	if migrationDir == "" {
		migrationDir = "./migrations"
	}

	mig, err := pop.NewFileMigrator(migrationDir, models.DB)
	if err != nil {
		log.Fatalf("Failed to create migrator: %v", err)
	}

	if err := mig.Up(); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	fmt.Println("Migrations completed successfully")
	os.Exit(0)
}

func showMigrationStatus() {
	fmt.Println("Migration status:")

	// Get migration directory from environment or use default
	migrationDir := os.Getenv("MIGRATION_DIR")
	if migrationDir == "" {
		migrationDir = "./migrations"
	}

	mig, err := pop.NewFileMigrator(migrationDir, models.DB)
	if err != nil {
		log.Fatalf("Failed to create migrator: %v", err)
	}

	if err := mig.Status(os.Stdout); err != nil {
		log.Fatalf("Failed to get migration status: %v", err)
	}

	os.Exit(0)
}

/*
# Notes about `main.go`

## SSL Support

We recommend placing your application behind a proxy, such as
Apache or Nginx and letting them do the SSL heavy lifting
for you. https://gobuffalo.io/en/docs/proxy

## Buffalo Build

When `buffalo build` is run to compile your binary, this `main`
function will be at the heart of that binary. It is expected
that your `main` function will start your application using
the `app.Serve()` method.

*/
