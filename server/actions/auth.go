package actions

import (
	"fmt"
	"net/http"
	"strconv"
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

	// Set provider to keycloak if not specified
	q := c.Request().URL.Query()
	if q.Get("provider") == "" {
		q.Set("provider", "keycloak")
		c.Request().URL.RawQuery = q.Encode()
	}

	// Begin OAuth flow - this redirects to the OAuth provider
	gothic.BeginAuthHandler(c.Response(), c.Request())
	return nil
}

// authCallback handles the OAuth callback from the provider
func authCallback(c buffalo.Context) error {
	// Set provider if not in query
	q := c.Request().URL.Query()
	if q.Get("provider") == "" {
		q.Set("provider", "keycloak")
		c.Request().URL.RawQuery = q.Encode()
	}

	// Complete the OAuth flow
	gothUser, err := gothic.CompleteUserAuth(c.Response(), c.Request())
	if err != nil {
		return c.Error(http.StatusUnauthorized, err)
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
	if redirectURL != nil && redirectURL.(string) != "" {
		// Clear the session value
		c.Session().Delete("oauth_redirect")
		c.Session().Save()

		// Redirect to extension with tokens in URL params
		return c.Redirect(http.StatusFound, fmt.Sprintf("%s?access_token=%s&refresh_token=%s&expires_at=%d",
			redirectURL.(string),
			tokens.AccessToken,
			tokens.RefreshToken,
			tokens.ExpiresAt,
		))
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
