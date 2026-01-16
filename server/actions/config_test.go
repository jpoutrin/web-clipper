package actions

import "net/http"

func (as *ActionSuite) Test_ConfigEndpoint_Unauthorized() {
	// Config endpoint requires authentication
	res := as.JSON("/api/v1/config").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

// Note: Testing authenticated config endpoint requires:
// 1. A valid JWT token with matching secret
// 2. Config to be properly loaded
// These would be better tested with a mock config or integration test
