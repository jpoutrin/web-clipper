package grifts

import (
	"context"

	"server/internal/admin"

	"github.com/gobuffalo/grift/grift"
)

// getArg extracts a named argument from grift context (--name=value format).
func getArg(c *grift.Context, name string) string {
	return admin.ParseFlag(c.Args, name)
}

var _ = grift.Namespace("users", func() {

	grift.Desc("list", "List all users with their status and storage information")
	grift.Add("list", func(c *grift.Context) error {
		return admin.ListUsers(context.Background())
	})

	grift.Desc("show", "Show details for a specific user (--email=x)")
	grift.Add("show", func(c *grift.Context) error {
		email := getArg(c, "email")
		return admin.ShowUser(context.Background(), email)
	})

	grift.Desc("set-storage", "Set storage path for a user (--email=x --path=y)")
	grift.Add("set-storage", func(c *grift.Context) error {
		email := getArg(c, "email")
		path := getArg(c, "path")
		return admin.SetStoragePath(context.Background(), email, path)
	})

	grift.Desc("disable", "Disable a user account (--email=x)")
	grift.Add("disable", func(c *grift.Context) error {
		email := getArg(c, "email")
		return admin.DisableUser(context.Background(), email)
	})

	grift.Desc("enable", "Enable a disabled user account (--email=x)")
	grift.Add("enable", func(c *grift.Context) error {
		email := getArg(c, "email")
		return admin.EnableUser(context.Background(), email)
	})

})
