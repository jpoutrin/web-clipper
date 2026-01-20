package grifts

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"server/internal/repository"
	"server/internal/services"
	"server/models"

	"github.com/gobuffalo/grift/grift"
)

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

var _ = grift.Namespace("tokens", func() {

	grift.Desc("create", "Create a new service token (--email=x --name=y [--expiry=365d])")
	grift.Add("create", func(c *grift.Context) error {
		email := getArg(c, "email")
		name := getArg(c, "name")
		expiry := getArg(c, "expiry")

		if email == "" {
			return fmt.Errorf("--email is required")
		}
		if name == "" {
			return fmt.Errorf("--name is required (e.g., 'Production API', 'CI/CD Pipeline')")
		}

		svc, err := buildTokenServices()
		if err != nil {
			return err
		}

		token, err := svc.Create(context.Background(), email, name, expiry)
		if err != nil {
			return fmt.Errorf("failed to create token: %w", err)
		}

		// Display token (only time it's shown!)
		fmt.Println("")
		fmt.Println("========================================")
		fmt.Println("Service Token Created Successfully")
		fmt.Println("========================================")
		fmt.Println("")
		fmt.Printf("User:   %s\n", email)
		fmt.Printf("Name:   %s\n", name)
		if expiry == "" {
			fmt.Printf("Expiry: 365d (default)\n")
		} else {
			fmt.Printf("Expiry: %s\n", expiry)
		}
		fmt.Println("")
		fmt.Println("TOKEN (save this, it won't be shown again):")
		fmt.Println(token)
		fmt.Println("")
		fmt.Println("========================================")
		fmt.Println("")

		return nil
	})

	grift.Desc("list", "List all service tokens for a user (--email=x)")
	grift.Add("list", func(c *grift.Context) error {
		email := getArg(c, "email")
		if email == "" {
			return fmt.Errorf("--email is required")
		}

		svc, err := buildTokenServices()
		if err != nil {
			return err
		}

		tokens, err := svc.List(context.Background(), email)
		if err != nil {
			return fmt.Errorf("failed to list tokens: %w", err)
		}

		if len(tokens) == 0 {
			fmt.Printf("No tokens found for user: %s\n", email)
			return nil
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "NAME\tPREFIX\tSTATUS\tLAST USED\tEXPIRES\tCREATED")
		fmt.Fprintln(w, "----\t------\t------\t---------\t-------\t-------")

		for _, t := range tokens {
			status := "active"
			if t.Revoked {
				status = "REVOKED"
			}
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\t%s\n",
				t.Name, t.Prefix, status, t.LastUsedAt, t.ExpiresAt, t.CreatedAt)
		}
		w.Flush()

		return nil
	})

	grift.Desc("revoke", "Revoke a service token (--id=x [--reason=y])")
	grift.Add("revoke", func(c *grift.Context) error {
		id := getArg(c, "id")
		reason := getArg(c, "reason")

		if id == "" {
			return fmt.Errorf("--id is required")
		}
		if reason == "" {
			reason = "Revoked via CLI"
		}

		svc, err := buildTokenServices()
		if err != nil {
			return err
		}

		if err := svc.Revoke(context.Background(), id, reason); err != nil {
			return fmt.Errorf("failed to revoke token: %w", err)
		}

		fmt.Printf("Token revoked: %s\n", id)
		return nil
	})
})
