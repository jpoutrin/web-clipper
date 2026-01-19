package grifts

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"server/internal/config"
	"server/internal/repository"
	"server/internal/services"
	"server/models"

	"github.com/gobuffalo/grift/grift"
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

// buildServices creates the service instances for CLI commands.
func buildServices() (services.UserService, error) {
	// Load config
	cfg, err := config.Load("config/clipper.yaml")
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

var _ = grift.Namespace("users", func() {

	grift.Desc("list", "List all users with their status and storage information")
	grift.Add("list", func(c *grift.Context) error {
		svc, err := buildServices()
		if err != nil {
			return err
		}

		users, err := svc.List(context.Background())
		if err != nil {
			return fmt.Errorf("failed to list users: %w", err)
		}

		if len(users) == 0 {
			fmt.Println("No users found.")
			return nil
		}

		// Print table header
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "EMAIL\tNAME\tSTATUS\tSTORAGE PATH\tCREATED")
		fmt.Fprintln(w, "-----\t----\t------\t------------\t-------")

		for _, u := range users {
			status := "enabled"
			if u.Disabled {
				status = "DISABLED"
			}
			storagePath := u.ClipDirectory
			if storagePath == "" {
				storagePath = "(default)"
			}
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n",
				u.Email, u.Name, status, storagePath, u.CreatedAt)
		}
		w.Flush()

		return nil
	})

	grift.Desc("show", "Show details for a specific user (--email=x)")
	grift.Add("show", func(c *grift.Context) error {
		email := getArg(c, "email")
		if email == "" {
			return fmt.Errorf("--email is required")
		}

		svc, err := buildServices()
		if err != nil {
			return err
		}

		user, err := svc.Get(context.Background(), email)
		if err != nil {
			return fmt.Errorf("user not found: %s", email)
		}

		status := "enabled"
		if user.Disabled {
			status = "DISABLED"
		}

		fmt.Println("User Details:")
		fmt.Println("-------------")
		fmt.Printf("ID:           %s\n", user.ID)
		fmt.Printf("Email:        %s\n", user.Email)
		fmt.Printf("Name:         %s\n", user.Name)
		fmt.Printf("Status:       %s\n", status)
		fmt.Printf("Storage Path: %s\n", valueOrDefault(user.ClipDirectory, "(default)"))
		fmt.Printf("Created:      %s\n", user.CreatedAt)
		fmt.Printf("Updated:      %s\n", user.UpdatedAt)

		return nil
	})

	grift.Desc("set-storage", "Set storage path for a user (--email=x --path=y)")
	grift.Add("set-storage", func(c *grift.Context) error {
		email := getArg(c, "email")
		path := getArg(c, "path")

		if email == "" {
			return fmt.Errorf("--email is required")
		}
		// path can be empty to reset to default

		svc, err := buildServices()
		if err != nil {
			return err
		}

		if err := svc.SetStoragePath(context.Background(), email, path); err != nil {
			return fmt.Errorf("failed to set storage path: %w", err)
		}

		if path == "" {
			fmt.Printf("Storage path reset to default for user: %s\n", email)
		} else {
			fmt.Printf("Storage path set to '%s' for user: %s\n", path, email)
		}

		return nil
	})

	grift.Desc("disable", "Disable a user account (--email=x)")
	grift.Add("disable", func(c *grift.Context) error {
		email := getArg(c, "email")
		if email == "" {
			return fmt.Errorf("--email is required")
		}

		svc, err := buildServices()
		if err != nil {
			return err
		}

		if err := svc.Disable(context.Background(), email); err != nil {
			if err == services.ErrUserAlreadyDisabled {
				fmt.Printf("User is already disabled: %s\n", email)
				return nil
			}
			return fmt.Errorf("failed to disable user: %w", err)
		}

		fmt.Printf("User disabled: %s\n", email)
		return nil
	})

	grift.Desc("enable", "Enable a disabled user account (--email=x)")
	grift.Add("enable", func(c *grift.Context) error {
		email := getArg(c, "email")
		if email == "" {
			return fmt.Errorf("--email is required")
		}

		svc, err := buildServices()
		if err != nil {
			return err
		}

		if err := svc.Enable(context.Background(), email); err != nil {
			if err == services.ErrUserAlreadyEnabled {
				fmt.Printf("User is already enabled: %s\n", email)
				return nil
			}
			return fmt.Errorf("failed to enable user: %w", err)
		}

		fmt.Printf("User enabled: %s\n", email)
		return nil
	})

})

// getArg extracts a named argument from grift context (--name=value format).
func getArg(c *grift.Context, name string) string {
	prefix := "--" + name + "="
	for _, arg := range c.Args {
		if len(arg) > len(prefix) && arg[:len(prefix)] == prefix {
			return arg[len(prefix):]
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
