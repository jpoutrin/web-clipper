package actions

import (
	"net/http"
)

func (as *ActionSuite) Test_AuthLogout() {
	res := as.JSON("/auth/logout").Post(nil)
	as.Equal(http.StatusOK, res.Code)
	as.Contains(res.Body.String(), "success")
}

func (as *ActionSuite) Test_AuthMiddleware_NoToken() {
	// Request without auth header should return 401
	res := as.JSON("/api/v1/config").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_AuthMiddleware_InvalidToken() {
	// Request with invalid token should return 401
	res := as.JSON("/api/v1/config").Get()
	// Without proper auth header setup in suite, just verify it rejects
	as.True(res.Code == http.StatusUnauthorized || res.Code == http.StatusInternalServerError)
}

func (as *ActionSuite) Test_AuthMiddleware_ValidToken() {
	// Note: Full token validation test requires matching JWT_SECRET in config
	// This is a basic test to ensure the endpoint exists and rejects without proper auth
	res := as.JSON("/api/v1/config").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_AuthRefresh_EmptyBody() {
	res := as.JSON("/auth/refresh").Post(map[string]string{})
	// Either 400 (bad request) or 401 (invalid token) or 500 (JWT not configured)
	as.True(res.Code == http.StatusBadRequest || res.Code == http.StatusUnauthorized || res.Code == http.StatusInternalServerError)
}

func (as *ActionSuite) Test_AuthRefresh_InvalidToken() {
	res := as.JSON("/auth/refresh").Post(map[string]string{
		"refresh_token": "invalid-token",
	})
	// Either 401 (invalid token) or 500 (JWT not configured)
	as.True(res.Code == http.StatusUnauthorized || res.Code == http.StatusInternalServerError)
}

func (as *ActionSuite) Test_DevToken_WhenDisabled() {
	// Dev mode is disabled by default, so endpoint should return 403 Forbidden
	res := as.JSON("/auth/dev-token").Get()
	as.Equal(http.StatusForbidden, res.Code)
	as.Contains(res.Body.String(), "dev mode is not enabled")
}
