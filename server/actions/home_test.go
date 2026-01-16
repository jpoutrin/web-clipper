package actions

import "net/http"

func (as *ActionSuite) Test_HealthCheck() {
	res := as.JSON("/health").Get()

	as.Equal(http.StatusOK, res.Code)
	as.Contains(res.Body.String(), "ok")
}
