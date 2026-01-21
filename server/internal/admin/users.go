package admin

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"server/internal/services"
)

// ListUsers lists all users with their status and storage information.
func ListUsers(ctx context.Context) error {
	svc, err := buildServices()
	if err != nil {
		return err
	}

	users, err := svc.List(ctx)
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
}

// ShowUser shows details for a specific user.
func ShowUser(ctx context.Context, email string) error {
	svc, err := buildServices()
	if err != nil {
		return err
	}

	user, err := svc.Get(ctx, email)
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
}

// SetStoragePath sets storage path for a user.
func SetStoragePath(ctx context.Context, email, path string) error {
	svc, err := buildServices()
	if err != nil {
		return err
	}

	if err := svc.SetStoragePath(ctx, email, path); err != nil {
		return fmt.Errorf("failed to set storage path: %w", err)
	}

	if path == "" {
		fmt.Printf("Storage path reset to default for user: %s\n", email)
	} else {
		fmt.Printf("Storage path set to '%s' for user: %s\n", path, email)
	}

	return nil
}

// DisableUser disables a user account.
func DisableUser(ctx context.Context, email string) error {
	svc, err := buildServices()
	if err != nil {
		return err
	}

	if err := svc.Disable(ctx, email); err != nil {
		if err == services.ErrUserAlreadyDisabled {
			fmt.Printf("User is already disabled: %s\n", email)
			return nil
		}
		return fmt.Errorf("failed to disable user: %w", err)
	}

	fmt.Printf("User disabled: %s\n", email)
	return nil
}

// EnableUser enables a disabled user account.
func EnableUser(ctx context.Context, email string) error {
	svc, err := buildServices()
	if err != nil {
		return err
	}

	if err := svc.Enable(ctx, email); err != nil {
		if err == services.ErrUserAlreadyEnabled {
			fmt.Printf("User is already enabled: %s\n", email)
			return nil
		}
		return fmt.Errorf("failed to enable user: %w", err)
	}

	fmt.Printf("User enabled: %s\n", email)
	return nil
}
