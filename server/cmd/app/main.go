package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"server/actions"
	"server/internal/admin"
)

// main is the starting point for your Buffalo application.
// You can feel free and add to this `main` method, change
// what it does, etc...
// All we ask is that, at some point, you make sure to
// call `app.Serve()`, unless you don't want to start your
// application that is. :)
func main() {
	// Check if first arg is a subcommand (doesn't start with -)
	if len(os.Args) > 1 && !strings.HasPrefix(os.Args[1], "-") {
		handleSubcommand(os.Args[1], os.Args[2:])
		return
	}

	// Start server (default behavior: no args or unknown flags)
	app := actions.App()
	if err := app.Serve(); err != nil {
		log.Fatal(err)
	}
}

func handleSubcommand(cmd string, args []string) {
	ctx := context.Background()

	switch cmd {
	case "users":
		handleUsersCommand(ctx, args)
	case "tokens":
		handleTokensCommand(ctx, args)
	case "migrate":
		handleMigrateCommand(ctx, args)
	case "version":
		handleVersionCommand()
	case "help":
		handleHelpCommand()
	default:
		// Unknown command: start server (backward compat)
		app := actions.App()
		if err := app.Serve(); err != nil {
			log.Fatal(err)
		}
	}
}

func handleUsersCommand(ctx context.Context, args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "Usage: web-clipper users <list|show|set-storage|disable|enable>\n")
		os.Exit(1)
	}

	subcmd := args[0]
	switch subcmd {
	case "list":
		if err := admin.ListUsers(ctx); err != nil {
			log.Fatal(err)
		}
	case "show":
		email := admin.ParseFlag(args, "email")
		if email == "" {
			log.Fatal("--email is required")
		}
		if err := admin.ShowUser(ctx, email); err != nil {
			log.Fatal(err)
		}
	case "set-storage":
		email := admin.ParseFlag(args, "email")
		path := admin.ParseFlag(args, "path")
		if email == "" {
			log.Fatal("--email is required")
		}
		if err := admin.SetStoragePath(ctx, email, path); err != nil {
			log.Fatal(err)
		}
	case "disable":
		email := admin.ParseFlag(args, "email")
		if email == "" {
			log.Fatal("--email is required")
		}
		if err := admin.DisableUser(ctx, email); err != nil {
			log.Fatal(err)
		}
	case "enable":
		email := admin.ParseFlag(args, "email")
		if email == "" {
			log.Fatal("--email is required")
		}
		if err := admin.EnableUser(ctx, email); err != nil {
			log.Fatal(err)
		}
	default:
		fmt.Fprintf(os.Stderr, "Unknown users subcommand: %s\n", subcmd)
		os.Exit(1)
	}
}

func handleTokensCommand(ctx context.Context, args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "Usage: web-clipper tokens <create|list|revoke>\n")
		os.Exit(1)
	}

	subcmd := args[0]
	switch subcmd {
	case "create":
		email := admin.ParseFlag(args, "email")
		name := admin.ParseFlag(args, "name")
		expiry := admin.ParseFlag(args, "expiry")
		if err := admin.CreateToken(ctx, email, name, expiry); err != nil {
			log.Fatal(err)
		}
	case "list":
		email := admin.ParseFlag(args, "email")
		if err := admin.ListTokens(ctx, email); err != nil {
			log.Fatal(err)
		}
	case "revoke":
		id := admin.ParseFlag(args, "id")
		reason := admin.ParseFlag(args, "reason")
		if err := admin.RevokeToken(ctx, id, reason); err != nil {
			log.Fatal(err)
		}
	default:
		fmt.Fprintf(os.Stderr, "Unknown tokens subcommand: %s\n", subcmd)
		os.Exit(1)
	}
}

func handleMigrateCommand(ctx context.Context, args []string) {
	if len(args) == 0 {
		// Default: run migrations
		if err := admin.RunMigrations(); err != nil {
			log.Fatal(err)
		}
		return
	}

	subcmd := args[0]
	switch subcmd {
	case "status":
		if err := admin.ShowMigrationStatus(); err != nil {
			log.Fatal(err)
		}
	default:
		fmt.Fprintf(os.Stderr, "Unknown migrate subcommand: %s\n", subcmd)
		fmt.Fprintf(os.Stderr, "Usage: web-clipper migrate [status]\n")
		os.Exit(1)
	}
}

func handleVersionCommand() {
	fmt.Println("Web Clipper")
	fmt.Println("Version: 1.0.0")
}

func handleHelpCommand() {
	fmt.Println("Web Clipper - Clip Management Service")
	fmt.Println("")
	fmt.Println("USAGE:")
	fmt.Println("  web-clipper [command] [flags]")
	fmt.Println("")
	fmt.Println("COMMANDS:")
	fmt.Println("  users list                    List all users")
	fmt.Println("  users show --email=x          Show user details")
	fmt.Println("  users set-storage --email=x --path=y  Set storage path")
	fmt.Println("  users disable --email=x       Disable user")
	fmt.Println("  users enable --email=x        Enable user")
	fmt.Println("")
	fmt.Println("  tokens create --email=x --name=y [--expiry=365d]  Create service token")
	fmt.Println("  tokens list --email=x         List user tokens")
	fmt.Println("  tokens revoke --id=x [--reason=y]  Revoke token")
	fmt.Println("")
	fmt.Println("  migrate                       Run database migrations")
	fmt.Println("  migrate status                Show migration status")
	fmt.Println("")
	fmt.Println("  version                       Show version information")
	fmt.Println("  help                          Show this help message")
	fmt.Println("")
	fmt.Println("EXAMPLES:")
	fmt.Println("  sudo -u web-clipper web-clipper users list")
	fmt.Println("  sudo -u web-clipper web-clipper tokens create --email=admin@example.com --name='API Token'")
	fmt.Println("  sudo -u web-clipper MIGRATION_DIR=/usr/share/web-clipper/migrations web-clipper migrate")
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
