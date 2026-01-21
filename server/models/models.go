package models

import (
	"log"

	"github.com/gobuffalo/envy"
	"github.com/gobuffalo/pop/v6"
)

// DB is a connection to your database to be used
// throughout your application.
var DB *pop.Connection

func init() {
	var err error
	env := envy.Get("GO_ENV", "development")

	// Add lookup path for production config location
	// Pop will search in order: current dir, then /etc/web-clipper/
	if err := pop.AddLookupPaths("/etc/web-clipper"); err != nil {
		log.Printf("warning: failed to add config lookup path: %v", err)
	}

	// Connect using database.yml (will use all settings: pool, WAL mode, etc.)
	DB, err = pop.Connect(env)
	if err != nil {
		log.Fatal(err)
	}

	pop.Debug = env == "development"
}
