package actions

import (
	"net/http"

	"github.com/gobuffalo/buffalo"
)

// ConfigResponse is the response from GET /api/v1/config
type ConfigResponse struct {
	ClipDirectory string       `json:"clipDirectory"`
	DefaultFormat string       `json:"defaultFormat"`
	Images        ImagesConfig `json:"images"`
}

// ImagesConfig contains image processing limits
type ImagesConfig struct {
	MaxSizeBytes   int64 `json:"maxSizeBytes"`
	MaxDimensionPx int   `json:"maxDimensionPx"`
	MaxTotalBytes  int64 `json:"maxTotalBytes"`
	ConvertToWebp  bool  `json:"convertToWebp"`
}

// getConfig returns the user's configuration
// TODO: Implement user-specific config in task 2.4
func getConfig(c buffalo.Context) error {
	appCfg := GetConfig()
	if appCfg == nil {
		return c.Render(http.StatusInternalServerError, r.JSON(map[string]string{
			"error": "configuration not loaded",
		}))
	}

	return c.Render(http.StatusOK, r.JSON(ConfigResponse{
		ClipDirectory: appCfg.Storage.BasePath,
		DefaultFormat: "markdown",
		Images: ImagesConfig{
			MaxSizeBytes:   appCfg.Images.MaxSizeBytes,
			MaxDimensionPx: appCfg.Images.MaxDimensionPx,
			MaxTotalBytes:  appCfg.Images.MaxTotalBytes,
			ConvertToWebp:  false,
		},
	}))
}
