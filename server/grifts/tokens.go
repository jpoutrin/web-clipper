package grifts

import (
	"context"

	"server/internal/admin"

	"github.com/gobuffalo/grift/grift"
)

var _ = grift.Namespace("tokens", func() {

	grift.Desc("create", "Create a new service token (--email=x --name=y [--expiry=365d])")
	grift.Add("create", func(c *grift.Context) error {
		email := getArg(c, "email")
		name := getArg(c, "name")
		expiry := getArg(c, "expiry")
		return admin.CreateToken(context.Background(), email, name, expiry)
	})

	grift.Desc("list", "List all service tokens for a user (--email=x)")
	grift.Add("list", func(c *grift.Context) error {
		email := getArg(c, "email")
		return admin.ListTokens(context.Background(), email)
	})

	grift.Desc("revoke", "Revoke a service token (--id=x [--reason=y])")
	grift.Add("revoke", func(c *grift.Context) error {
		id := getArg(c, "id")
		reason := getArg(c, "reason")
		return admin.RevokeToken(context.Background(), id, reason)
	})
})
