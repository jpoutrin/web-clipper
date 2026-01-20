package actions

import (
	"log"
	"sync"

	"server/internal/config"
	"server/models"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/buffalo-pop/v3/pop/popmw"
	"github.com/gobuffalo/envy"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/openidConnect"
)

// ENV is used to help switch settings based on where the
// application is being run. Default is "development".
var ENV = envy.Get("GO_ENV", "development")

var (
	app     *buffalo.App
	appOnce sync.Once
	cfg     *config.Config
)

// App is where all routes and middleware for buffalo
// should be defined. This is the nerve center of your
// application.
func App() *buffalo.App {
	appOnce.Do(func() {
		// Find and load configuration
		configPath, err := config.FindConfigPath()
		if err != nil {
			log.Printf("Warning: %v", err)
			log.Println("Using default configuration")
			cfg = &config.Config{}
		} else {
			cfg, err = config.Load(configPath)
			if err != nil {
				log.Printf("Warning: Could not load config from %s: %v", configPath, err)
				cfg = &config.Config{}
			}
		}

		// Log dev mode status
		if cfg.DevMode.Enabled {
			log.Println("WARNING: Dev mode is ENABLED - authentication is bypassed!")
		}

		// Setup OAuth provider (only if configured and not in dev mode)
		if cfg.OAuth.ClientID != "" && cfg.OAuth.ClientSecret != "" {
			setupOAuth()
		} else if !cfg.DevMode.Enabled {
			log.Println("Warning: OAuth not configured, auth endpoints will not work")
		}

		app = buffalo.New(buffalo.Options{
			Env:         ENV,
			SessionName: "_clipper_session",
		})

		// CORS middleware
		app.Use(corsMiddleware)

		// Wraps each request in a transaction.
		app.Use(popmw.Transaction(models.DB))

		// Routes
		app.GET("/health", healthCheck)

		// Auth routes
		auth := app.Group("/auth")
		auth.GET("/login", authLogin)
		auth.GET("/callback", authCallback)
		auth.POST("/refresh", authRefresh)
		auth.POST("/logout", authLogout)
		auth.GET("/dev-token", authDevToken) // Dev mode only
		auth.GET("/test-success", authTestSuccess) // Test success page rendering

		// API routes (protected)
		api := app.Group("/api/v1")
		api.Use(authMiddleware)
		api.GET("/config", getConfig)
		api.POST("/clips", createClip)
		api.GET("/clips", listClips)
		api.GET("/clips/{id}", getClip)
		api.GET("/clips/{id}/media/{filename}", getClipMedia)
		api.DELETE("/clips/{id}", deleteClip)
	})

	return app
}

// setupOAuth configures the OpenID Connect provider based on config
func setupOAuth() {
	var discoveryURL string
	var providerName string

	switch cfg.OAuth.Provider {
	case "google":
		discoveryURL = "https://accounts.google.com/.well-known/openid-configuration"
		providerName = "google"
	case "keycloak":
		discoveryURL = cfg.OAuth.Keycloak.BaseURL +
			"/realms/" + cfg.OAuth.Keycloak.Realm +
			"/.well-known/openid-configuration"
		providerName = "keycloak"
	default:
		log.Printf("Warning: Unknown OAuth provider: %s", cfg.OAuth.Provider)
		return
	}

	provider, err := openidConnect.New(
		cfg.OAuth.ClientID,
		cfg.OAuth.ClientSecret,
		cfg.OAuth.RedirectURL,
		discoveryURL,
		"openid", "email", "profile",
	)
	if err != nil {
		log.Printf("Warning: Could not setup OAuth provider: %v", err)
		return
	}
	provider.SetName(providerName)
	goth.UseProviders(provider)
}

// corsMiddleware handles CORS headers for the extension
func corsMiddleware(next buffalo.Handler) buffalo.Handler {
	return func(c buffalo.Context) error {
		c.Response().Header().Set("Access-Control-Allow-Origin", "*")
		c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		c.Response().Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

		if c.Request().Method == "OPTIONS" {
			return c.Render(200, nil)
		}
		return next(c)
	}
}

// healthCheck returns server status
func healthCheck(c buffalo.Context) error {
	return c.Render(200, r.JSON(map[string]string{"status": "ok"}))
}

// GetConfig returns the loaded configuration (for use by other actions)
func GetConfig() *config.Config {
	return cfg
}
