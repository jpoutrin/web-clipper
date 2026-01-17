package actions

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"server/models"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
	"github.com/golang-jwt/jwt/v5"
	"github.com/markbates/goth/gothic"
)

// TokenResponse is returned after successful authentication
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

// authLogin initiates the OAuth flow via Goth
// The redirect param is stored in the session for use after callback
func authLogin(c buffalo.Context) error {
	// Store the redirect URL in session for use after OAuth callback
	redirectURL := c.Param("redirect")
	if redirectURL != "" {
		c.Session().Set("oauth_redirect", redirectURL)
		if err := c.Session().Save(); err != nil {
			return c.Error(http.StatusInternalServerError, err)
		}
	}

	// Set provider from config if not specified
	q := c.Request().URL.Query()
	if q.Get("provider") == "" {
		cfg := GetConfig()
		if cfg != nil && cfg.OAuth.Provider != "" {
			q.Set("provider", cfg.OAuth.Provider)
		} else {
			q.Set("provider", "keycloak")
		}
		c.Request().URL.RawQuery = q.Encode()
	}

	// Begin OAuth flow - this redirects to the OAuth provider
	gothic.BeginAuthHandler(c.Response(), c.Request())
	return nil
}

// isEmailAllowed checks if an email is allowed based on domain and email whitelists
// Returns true if no restrictions are configured (both lists empty)
func isEmailAllowed(email string, allowedDomains, allowedEmails []string) bool {
	// If no restrictions, allow all
	if len(allowedDomains) == 0 && len(allowedEmails) == 0 {
		return true
	}

	email = strings.ToLower(email)

	// Check email whitelist
	for _, allowed := range allowedEmails {
		if strings.ToLower(allowed) == email {
			return true
		}
	}

	// Check domain whitelist
	parts := strings.Split(email, "@")
	if len(parts) == 2 {
		domain := strings.ToLower(parts[1])
		for _, allowed := range allowedDomains {
			if strings.ToLower(allowed) == domain {
				return true
			}
		}
	}

	return false
}

// renderAuthSuccess renders a success page with tokens for the extension to read
func renderAuthSuccess(c buffalo.Context, tokens *TokenResponse) error {
	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful - Web Clipper</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
        .icon { font-size: 3rem; margin-bottom: 1rem; }
        h1 { color: #2e7d32; margin-bottom: 0.5rem; font-size: 1.5rem; }
        p { color: #666; margin-bottom: 1rem; line-height: 1.5; }
        .hint { font-size: 0.875rem; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✓</div>
        <h1>Authentication Successful</h1>
        <p>You can close this window and return to the extension.</p>
        <p class="hint">The extension will automatically detect your login.</p>
    </div>
    <!-- Token data for extension to read -->
    <script>
        window.webClipperAuth = {
            accessToken: "%s",
            refreshToken: "%s",
            expiresAt: %d
        };
    </script>
</body>
</html>`, tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAt)
	c.Response().Header().Set("Content-Type", "text/html; charset=utf-8")
	c.Response().WriteHeader(http.StatusOK)
	c.Response().Write([]byte(html))
	return nil
}

// renderAuthError renders a user-friendly HTML error page for auth failures
func renderAuthError(c buffalo.Context, status int, title, message string) error {
	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Error - Web Clipper</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
        .icon { font-size: 3rem; margin-bottom: 1rem; }
        h1 { color: #d32f2f; margin-bottom: 0.5rem; font-size: 1.5rem; }
        p { color: #666; margin-bottom: 1.5rem; line-height: 1.5; }
        .error-detail { background: #fafafa; padding: 1rem; border-radius: 4px; font-family: monospace; font-size: 0.875rem; color: #333; word-break: break-all; text-align: left; }
        .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin-top: 1rem; }
        .btn:hover { background: #1565c0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔐</div>
        <h1>%s</h1>
        <p>%s</p>
        <a href="/auth/login" class="btn">Try Again</a>
    </div>
</body>
</html>`, title, message)
	c.Response().Header().Set("Content-Type", "text/html; charset=utf-8")
	c.Response().WriteHeader(status)
	c.Response().Write([]byte(html))
	return nil
}

// authCallback handles the OAuth callback from the provider
func authCallback(c buffalo.Context) error {
	// Set provider from config if not in query
	q := c.Request().URL.Query()
	if q.Get("provider") == "" {
		cfg := GetConfig()
		if cfg != nil && cfg.OAuth.Provider != "" {
			q.Set("provider", cfg.OAuth.Provider)
		} else {
			q.Set("provider", "keycloak")
		}
		c.Request().URL.RawQuery = q.Encode()
	}

	// Check for OAuth error from provider
	if errMsg := c.Param("error"); errMsg != "" {
		errDesc := c.Param("error_description")
		c.Logger().Errorf("OAuth error from provider: %s - %s", errMsg, errDesc)
		return renderAuthError(c, http.StatusUnauthorized, "Access Denied", errDesc)
	}

	// Complete the OAuth flow
	gothUser, err := gothic.CompleteUserAuth(c.Response(), c.Request())
	if err != nil {
		c.Logger().Errorf("OAuth authentication failed: %v", err)
		return renderAuthError(c, http.StatusUnauthorized, "Authentication Failed", err.Error())
	}

	// Check if user is allowed (by domain or email whitelist)
	cfg := GetConfig()
	if cfg != nil && !isEmailAllowed(gothUser.Email, cfg.OAuth.AllowedDomains, cfg.OAuth.AllowedEmails) {
		c.Logger().Warnf("Access denied for email: %s", gothUser.Email)
		return renderAuthError(c, http.StatusForbidden, "Access Denied",
			fmt.Sprintf("The email %s is not authorized to access this application. Please contact an administrator.", gothUser.Email))
	}

	// Find or create user in database
	tx := c.Value("tx").(*pop.Connection)
	user, err := models.FindOrCreateByOAuthID(tx, gothUser.UserID, gothUser.Email, gothUser.Name)
	if err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	// Generate JWT tokens
	tokens, err := generateTokens(user)
	if err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	// Check for redirect URL (for extension callback)
	redirectURL := c.Session().Get("oauth_redirect")
	c.Logger().Infof("OAuth callback - redirect URL from session: %v", redirectURL)

	if redirectURL != nil && redirectURL.(string) != "" {
		// Clear the session value
		c.Session().Delete("oauth_redirect")
		c.Session().Save()

		c.Logger().Infof("Rendering success page for extension callback")
		// Return success page with tokens that the extension can read
		return renderAuthSuccess(c, tokens)
	}

	// Return tokens as JSON if no redirect
	return c.Render(http.StatusOK, r.JSON(tokens))
}

// authRefresh handles token refresh requests
func authRefresh(c buffalo.Context) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.Bind(&req); err != nil {
		return c.Error(http.StatusBadRequest, err)
	}

	cfg := GetConfig()
	if cfg == nil || cfg.JWT.Secret == "" {
		return c.Error(http.StatusInternalServerError, fmt.Errorf("JWT not configured"))
	}

	// Validate refresh token
	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(cfg.JWT.Secret), nil
	})
	if err != nil || !token.Valid {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid refresh token"))
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid token claims"))
	}

	// Verify it's a refresh token
	if claims["type"] != "refresh" {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("not a refresh token"))
	}

	userID := claims["sub"].(string)

	// Find user
	tx := c.Value("tx").(*pop.Connection)
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("user not found"))
	}

	// Generate new tokens
	tokens, err := generateTokens(user)
	if err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	return c.Render(http.StatusOK, r.JSON(tokens))
}

// authLogout handles user logout (client-side logout)
func authLogout(c buffalo.Context) error {
	return c.Render(http.StatusOK, r.JSON(map[string]bool{"success": true}))
}

// authDevToken provides JWT tokens for dev mode testing without OAuth
func authDevToken(c buffalo.Context) error {
	cfg := GetConfig()

	// Reject if dev mode not enabled
	if cfg == nil || !cfg.DevMode.Enabled {
		return c.Error(http.StatusForbidden, fmt.Errorf("dev mode is not enabled"))
	}

	// Find or create dev user
	tx := c.Value("tx").(*pop.Connection)
	user, err := models.FindOrCreateByOAuthID(
		tx,
		cfg.DevMode.UserID,
		cfg.DevMode.Email,
		cfg.DevMode.Name,
	)
	if err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	// Generate tokens
	tokens, err := generateTokens(user)
	if err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	c.Logger().Warn("DEV MODE: Token generated for dev user")
	return c.Render(http.StatusOK, r.JSON(tokens))
}

// generateTokens creates access and refresh JWT tokens for a user
func generateTokens(user *models.User) (*TokenResponse, error) {
	cfg := GetConfig()
	if cfg == nil || cfg.JWT.Secret == "" {
		return nil, fmt.Errorf("JWT not configured")
	}

	expiresAt := time.Now().Add(time.Duration(cfg.JWT.ExpiryHours) * time.Hour)

	// Access token
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID.String(),
		"email": user.Email,
		"exp":   expiresAt.Unix(),
		"type":  "access",
	})
	accessTokenStr, err := accessToken.SignedString([]byte(cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	// Refresh token (7 days expiry)
	refreshExpiry := time.Now().Add(7 * 24 * time.Hour)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID.String(),
		"exp":  refreshExpiry.Unix(),
		"type": "refresh",
	})
	refreshTokenStr, err := refreshToken.SignedString([]byte(cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  accessTokenStr,
		RefreshToken: refreshTokenStr,
		ExpiresAt:    expiresAt.Unix(),
	}, nil
}

// authMiddleware protects API routes by validating JWT tokens
func authMiddleware(next buffalo.Handler) buffalo.Handler {
	return func(c buffalo.Context) error {
		cfg := GetConfig()

		// Dev mode bypass - skip JWT validation entirely
		if cfg != nil && cfg.DevMode.Enabled {
			c.Logger().Warn("DEV MODE: Authentication bypassed for request")

			// Look up or create dev user to get their UUID
			tx := c.Value("tx").(*pop.Connection)
			user, err := models.FindOrCreateByOAuthID(
				tx,
				cfg.DevMode.UserID,
				cfg.DevMode.Email,
				cfg.DevMode.Name,
			)
			if err != nil {
				return c.Error(http.StatusInternalServerError, fmt.Errorf("failed to get dev user: %w", err))
			}

			// Set actual UUID in context
			c.Set("user_id", user.ID.String())
			c.Set("user_email", user.Email)
			return next(c)
		}

		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return c.Error(http.StatusUnauthorized, fmt.Errorf("missing authorization header"))
		}

		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid authorization header format"))
		}

		tokenStr := authHeader[7:]

		if cfg == nil || cfg.JWT.Secret == "" {
			return c.Error(http.StatusInternalServerError, fmt.Errorf("JWT not configured"))
		}

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(cfg.JWT.Secret), nil
		})
		if err != nil || !token.Valid {
			return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid token"))
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid token claims"))
		}

		// Verify it's an access token
		if claims["type"] != "access" {
			return c.Error(http.StatusUnauthorized, fmt.Errorf("not an access token"))
		}

		// Set user info in context for downstream handlers
		c.Set("user_id", claims["sub"])
		c.Set("user_email", claims["email"])

		return next(c)
	}
}

// Helper to convert int64 to string for URL params
func int64ToString(i int64) string {
	return strconv.FormatInt(i, 10)
}

// authTestSuccess renders a test success page (for debugging)
func authTestSuccess(c buffalo.Context) error {
	tokens := &TokenResponse{
		AccessToken:  "test-access-token",
		RefreshToken: "test-refresh-token",
		ExpiresAt:    time.Now().Add(24 * time.Hour).Unix(),
	}
	return renderAuthSuccess(c, tokens)
}
