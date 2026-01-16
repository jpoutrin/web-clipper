package actions

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"server/models"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
)

// ClipPayload is the request body for POST /api/v1/clips
type ClipPayload struct {
	Title    string         `json:"title"`
	URL      string         `json:"url"`
	Markdown string         `json:"markdown"`
	Tags     []string       `json:"tags"`
	Notes    string         `json:"notes"`
	Images   []ImagePayload `json:"images"`
}

// ImagePayload represents an image in the clip
type ImagePayload struct {
	Filename    string `json:"filename"`
	Data        string `json:"data"` // base64
	OriginalURL string `json:"originalUrl"`
}

// ClipResponse is the response from POST /api/v1/clips
type ClipResponse struct {
	Success bool   `json:"success"`
	Path    string `json:"path,omitempty"`
	Error   string `json:"error,omitempty"`
}

// createClip handles clip creation
func createClip(c buffalo.Context) error {
	var req ClipPayload
	if err := c.Bind(&req); err != nil {
		return c.Render(http.StatusBadRequest, r.JSON(ClipResponse{
			Success: false,
			Error:   "Invalid request body",
		}))
	}

	cfg := GetConfig()
	if cfg == nil {
		return c.Render(http.StatusInternalServerError, r.JSON(ClipResponse{
			Success: false,
			Error:   "Configuration not loaded",
		}))
	}

	// Validate image sizes
	var totalSize int64
	for _, img := range req.Images {
		data, err := base64.StdEncoding.DecodeString(img.Data)
		if err != nil {
			return c.Render(http.StatusBadRequest, r.JSON(ClipResponse{
				Success: false,
				Error:   fmt.Sprintf("Invalid image data for: %s", img.Filename),
			}))
		}
		size := int64(len(data))
		if size > cfg.Images.MaxSizeBytes {
			return c.Render(http.StatusRequestEntityTooLarge, r.JSON(ClipResponse{
				Success: false,
				Error:   fmt.Sprintf("Image %s exceeds max size of %d bytes", img.Filename, cfg.Images.MaxSizeBytes),
			}))
		}
		totalSize += size
	}
	if totalSize > cfg.Images.MaxTotalBytes {
		return c.Render(http.StatusRequestEntityTooLarge, r.JSON(ClipResponse{
			Success: false,
			Error:   fmt.Sprintf("Total image size %d exceeds limit of %d bytes", totalSize, cfg.Images.MaxTotalBytes),
		}))
	}

	// Get user from context (set by authMiddleware)
	userID, ok := c.Value("user_id").(string)
	if !ok || userID == "" {
		return c.Render(http.StatusUnauthorized, r.JSON(ClipResponse{
			Success: false,
			Error:   "User not authenticated",
		}))
	}

	tx := c.Value("tx").(*pop.Connection)
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Render(http.StatusUnauthorized, r.JSON(ClipResponse{
			Success: false,
			Error:   "User not found",
		}))
	}

	// Determine clip directory (user-specific or default)
	clipDir := cfg.Storage.BasePath
	if user.ClipDirectory.Valid && user.ClipDirectory.String != "" {
		clipDir = user.ClipDirectory.String
	}

	// Create folder structure: YYYYMMDD_HHMMSS_site-slug
	timestamp := time.Now().Format("20060102_150405")
	siteSlug := slugify(extractDomain(req.URL))
	folderName := fmt.Sprintf("%s_%s", timestamp, siteSlug)
	folderPath := filepath.Join(clipDir, "web-clips", folderName)

	// Create directory (and parent directories if needed)
	if err := os.MkdirAll(folderPath, 0755); err != nil {
		return c.Render(http.StatusInternalServerError, r.JSON(ClipResponse{
			Success: false,
			Error:   "Failed to create clip directory",
		}))
	}

	// Save images to media/ subfolder
	if len(req.Images) > 0 {
		mediaDir := filepath.Join(folderPath, "media")
		if err := os.MkdirAll(mediaDir, 0755); err != nil {
			return c.Render(http.StatusInternalServerError, r.JSON(ClipResponse{
				Success: false,
				Error:   "Failed to create media directory",
			}))
		}

		for _, img := range req.Images {
			data, _ := base64.StdEncoding.DecodeString(img.Data)
			imgPath := filepath.Join(mediaDir, sanitizeFilename(img.Filename))
			if err := os.WriteFile(imgPath, data, 0644); err != nil {
				return c.Render(http.StatusInternalServerError, r.JSON(ClipResponse{
					Success: false,
					Error:   fmt.Sprintf("Failed to save image: %s", img.Filename),
				}))
			}
		}
	}

	// Generate Markdown with YAML frontmatter
	frontmatter := generateFrontmatter(req)
	content := frontmatter + "\n" + req.Markdown

	// Save Markdown file
	pageSlug := slugify(req.Title)
	if pageSlug == "" {
		pageSlug = "page"
	}
	mdPath := filepath.Join(folderPath, pageSlug+".md")
	if err := os.WriteFile(mdPath, []byte(content), 0644); err != nil {
		return c.Render(http.StatusInternalServerError, r.JSON(ClipResponse{
			Success: false,
			Error:   "Failed to save markdown file",
		}))
	}

	// Return relative path
	relPath := filepath.Join("web-clips", folderName, pageSlug+".md")
	return c.Render(http.StatusOK, r.JSON(ClipResponse{
		Success: true,
		Path:    relPath,
	}))
}

// generateFrontmatter creates YAML frontmatter for the clip
func generateFrontmatter(req ClipPayload) string {
	var sb strings.Builder
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("title: %q\n", req.Title))
	sb.WriteString(fmt.Sprintf("url: %s\n", req.URL))
	sb.WriteString(fmt.Sprintf("clipped_at: %s\n", time.Now().Format(time.RFC3339)))
	sb.WriteString(fmt.Sprintf("source: %s\n", extractDomain(req.URL)))

	// Tags
	if len(req.Tags) > 0 {
		sb.WriteString("tags:\n")
		for _, tag := range req.Tags {
			sb.WriteString(fmt.Sprintf("  - %s\n", tag))
		}
	} else {
		sb.WriteString("tags: []\n")
	}

	// Notes
	if req.Notes != "" {
		sb.WriteString(fmt.Sprintf("notes: %q\n", req.Notes))
	} else {
		sb.WriteString("notes: \"\"\n")
	}

	sb.WriteString("---\n")
	return sb.String()
}

// extractDomain extracts the domain from a URL
func extractDomain(url string) string {
	re := regexp.MustCompile(`https?://([^/]+)`)
	match := re.FindStringSubmatch(url)
	if len(match) > 1 {
		return match[1]
	}
	return "unknown"
}

// slugify converts a string to a URL-friendly slug
func slugify(s string) string {
	// Convert to lowercase
	s = strings.ToLower(s)
	// Replace non-alphanumeric with dashes
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	// Remove leading/trailing dashes
	s = strings.Trim(s, "-")
	// Limit length
	if len(s) > 50 {
		s = s[:50]
	}
	return s
}

// sanitizeFilename removes unsafe characters from filenames
func sanitizeFilename(name string) string {
	// Remove path traversal attempts
	name = filepath.Base(name)
	// Replace unsafe characters
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	return re.ReplaceAllString(name, "_")
}
