package actions

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"server/models"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/nulls"
	"github.com/gobuffalo/pop/v6"
	"github.com/gofrs/uuid"
)

// ClipPayload is the request body for POST /api/v1/clips
type ClipPayload struct {
	Title    string         `json:"title"`
	URL      string         `json:"url"`
	Markdown string         `json:"markdown"`
	HTML     string         `json:"html,omitempty"` // Used for fullpage mode
	Tags     []string       `json:"tags"`
	Notes    string         `json:"notes"`
	Images   []ImagePayload `json:"images"`
	Mode     string         `json:"mode"` // article, bookmark, screenshot, selection, fullpage
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
	ID      string `json:"id,omitempty"`
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

	// Generate file content based on mode
	pageSlug := slugify(req.Title)
	if pageSlug == "" {
		pageSlug = "page"
	}

	var filePath string
	var relPath string

	if req.Mode == "fullpage" && req.HTML != "" {
		// For fullpage mode, save HTML file
		filePath = filepath.Join(folderPath, pageSlug+".html")
		relPath = filepath.Join("web-clips", folderName, pageSlug+".html")

		// Add a comment header with metadata
		htmlContent := fmt.Sprintf("<!-- \n  Clipped: %s\n  URL: %s\n  Mode: fullpage\n-->\n%s",
			time.Now().Format(time.RFC3339),
			req.URL,
			req.HTML)

		if err := os.WriteFile(filePath, []byte(htmlContent), 0644); err != nil {
			return c.Render(http.StatusInternalServerError, r.JSON(ClipResponse{
				Success: false,
				Error:   "Failed to save HTML file",
			}))
		}

		// Also save a companion markdown file with metadata
		frontmatter := generateFrontmatter(req)
		mdContent := frontmatter + fmt.Sprintf("\n# %s\n\nFull page capture saved as [%s.html](./%s.html)\n\nOriginal URL: %s\n",
			req.Title, pageSlug, pageSlug, req.URL)
		mdPath := filepath.Join(folderPath, pageSlug+".md")
		os.WriteFile(mdPath, []byte(mdContent), 0644) // Best effort
	} else {
		// For other modes, save Markdown file
		frontmatter := generateFrontmatter(req)
		content := frontmatter + "\n" + req.Markdown
		filePath = filepath.Join(folderPath, pageSlug+".md")
		relPath = filepath.Join("web-clips", folderName, pageSlug+".md")

		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			return c.Render(http.StatusInternalServerError, r.JSON(ClipResponse{
				Success: false,
				Error:   "Failed to save markdown file",
			}))
		}
	}

	// Save clip metadata to database
	// tx already declared earlier in function
	userUUID, err := uuid.FromString(userID)
	if err != nil {
		c.Logger().Errorf("Invalid user ID: %v", err)
		return c.Render(http.StatusOK, r.JSON(ClipResponse{
			Success: true,
			Path:    relPath,
		}))
	}

	// Serialize tags to JSON
	var tagsJSON nulls.String
	if len(req.Tags) > 0 {
		tagsBytes, _ := json.Marshal(req.Tags)
		tagsJSON = nulls.NewString(string(tagsBytes))
	}

	// Store relative path from web-clips directory
	relativePath := filepath.Join("web-clips", folderName)

	clip := &models.Clip{
		ID:     uuid.Must(uuid.NewV4()),
		UserID: userUUID,
		Title:  req.Title,
		URL:    req.URL,
		Path:   relativePath,
		Mode:   req.Mode,
		Tags:   tagsJSON,
		Notes:  nulls.NewString(req.Notes),
	}

	if err := tx.Create(clip); err != nil {
		// Log error but don't fail - file was already saved
		c.Logger().Errorf("Failed to save clip metadata: %v", err)
	}

	// Return relative path and clip ID
	return c.Render(http.StatusOK, r.JSON(ClipResponse{
		Success: true,
		Path:    relPath,
		ID:      clip.ID.String(),
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

	// Clip mode
	mode := req.Mode
	if mode == "" {
		mode = "article" // Default mode
	}
	sb.WriteString(fmt.Sprintf("mode: %s\n", mode))

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

// ListClipsResponse represents the paginated clips response
type ListClipsResponse struct {
	Clips      []ClipSummary `json:"clips"`
	Page       int           `json:"page"`
	PerPage    int           `json:"per_page"`
	Total      int           `json:"total"`
	TotalPages int           `json:"total_pages"`
}

// ClipSummary represents clip metadata without content
type ClipSummary struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	URL       string    `json:"url"`
	Mode      string    `json:"mode"`
	Tags      []string  `json:"tags"`
	Notes     string    `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// listClips returns paginated list of user's clips
func listClips(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	userIDStr := c.Value("user_id").(string)
	userID, err := uuid.FromString(userIDStr)
	if err != nil {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid user"))
	}

	// Parse pagination params
	page := 1
	if pageStr := c.Param("page"); pageStr != "" {
		if p, err := fmt.Sscanf(pageStr, "%d", &page); err == nil && p == 1 && page >= 1 {
			// page is valid
		} else {
			page = 1
		}
	}

	perPage := 20
	if perPageStr := c.Param("per_page"); perPageStr != "" {
		if p, err := fmt.Sscanf(perPageStr, "%d", &perPage); err == nil && p == 1 && perPage >= 1 && perPage <= 100 {
			// perPage is valid
		} else {
			perPage = 20
		}
	}

	// Optional filters
	mode := c.Param("mode")
	tag := c.Param("tag")

	// Build query
	q := tx.Where("user_id = ?", userID)
	if mode != "" {
		q = q.Where("mode = ?", mode)
	}
	if tag != "" {
		// SQLite JSON contains check
		q = q.Where("tags LIKE ?", "%\""+tag+"\"%")
	}
	q = q.Order("created_at DESC")

	// Get total count
	count, err := q.Count(&models.Clip{})
	if err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	// Fetch clips
	clips := models.Clips{}
	if err := q.Paginate(page, perPage).All(&clips); err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	// Convert to response format
	summaries := make([]ClipSummary, len(clips))
	for i, clip := range clips {
		var tags []string
		if clip.Tags.Valid {
			json.Unmarshal([]byte(clip.Tags.String), &tags)
		}
		summaries[i] = ClipSummary{
			ID:        clip.ID.String(),
			Title:     clip.Title,
			URL:       clip.URL,
			Mode:      clip.Mode,
			Tags:      tags,
			Notes:     clip.Notes.String,
			CreatedAt: clip.CreatedAt,
		}
	}

	totalPages := (count + perPage - 1) / perPage

	return c.Render(http.StatusOK, r.JSON(ListClipsResponse{
		Clips:      summaries,
		Page:       page,
		PerPage:    perPage,
		Total:      count,
		TotalPages: totalPages,
	}))
}

// ClipDetail represents full clip data including content
type ClipDetail struct {
	ClipSummary
	Path    string      `json:"path"`
	Content string      `json:"content,omitempty"`   // Markdown content
	Images  []ClipImage `json:"images,omitempty"`
}

// ClipImage represents an image in the clip
type ClipImage struct {
	Filename string `json:"filename"`
	Path     string `json:"path"`      // Relative path for serving
	MimeType string `json:"mime_type"` // MIME type of the image
}

// getClip returns single clip with full content
func getClip(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	userIDStr := c.Value("user_id").(string)
	userID, err := uuid.FromString(userIDStr)
	if err != nil {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid user"))
	}

	clipIDStr := c.Param("id")
	clipID, err := uuid.FromString(clipIDStr)
	if err != nil {
		return c.Error(http.StatusBadRequest, fmt.Errorf("invalid clip ID"))
	}

	// Fetch clip with ownership check
	clip, err := models.FindClipByIDAndUser(tx, clipID, userID)
	if err != nil {
		return c.Error(http.StatusNotFound, fmt.Errorf("clip not found"))
	}

	// Get user's clip directory
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	cfg := GetConfig()
	clipDir := cfg.Storage.BasePath
	if user.ClipDirectory.Valid {
		clipDir = user.ClipDirectory.String
	}

	// Read markdown content
	fullPath := filepath.Join(clipDir, clip.Path)
	var content string
	var images []ClipImage

	// Find and read markdown file
	entries, _ := os.ReadDir(fullPath)
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
			mdPath := filepath.Join(fullPath, entry.Name())
			data, err := os.ReadFile(mdPath)
			if err == nil {
				content = string(data)
			}
			break
		}
	}

	// List images in media folder
	mediaPath := filepath.Join(fullPath, "media")
	if mediaEntries, err := os.ReadDir(mediaPath); err == nil {
		for _, entry := range mediaEntries {
			if !entry.IsDir() {
				// Detect MIME type
				mimeType := mime.TypeByExtension(filepath.Ext(entry.Name()))
				if mimeType == "" {
					mimeType = "application/octet-stream"
				}

				images = append(images, ClipImage{
					Filename: entry.Name(),
					Path:     filepath.Join(clip.Path, "media", entry.Name()),
					MimeType: mimeType,
				})
			}
		}
	}

	// Parse tags
	var tags []string
	if clip.Tags.Valid {
		json.Unmarshal([]byte(clip.Tags.String), &tags)
	}

	return c.Render(http.StatusOK, r.JSON(ClipDetail{
		ClipSummary: ClipSummary{
			ID:        clip.ID.String(),
			Title:     clip.Title,
			URL:       clip.URL,
			Mode:      clip.Mode,
			Tags:      tags,
			Notes:     clip.Notes.String,
			CreatedAt: clip.CreatedAt,
		},
		Path:    clip.Path,
		Content: content,
		Images:  images,
	}))
}

// getClipMedia serves media files (images) from a clip
func getClipMedia(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	userIDStr := c.Value("user_id").(string)
	userID, err := uuid.FromString(userIDStr)
	if err != nil {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid user"))
	}

	clipIDStr := c.Param("id")
	clipID, err := uuid.FromString(clipIDStr)
	if err != nil {
		return c.Error(http.StatusBadRequest, fmt.Errorf("invalid clip ID"))
	}

	// Fetch clip with ownership check
	clip, err := models.FindClipByIDAndUser(tx, clipID, userID)
	if err != nil {
		return c.Error(http.StatusNotFound, fmt.Errorf("clip not found"))
	}

	// Get and sanitize filename
	filename := c.Param("filename")
	if filename == "" {
		return c.Error(http.StatusBadRequest, fmt.Errorf("filename required"))
	}

	// Sanitize filename to prevent path traversal
	cleanFilename := filepath.Base(filepath.Clean(filename))
	if cleanFilename != filename || strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		return c.Error(http.StatusBadRequest, fmt.Errorf("invalid filename"))
	}

	// Get user's clip directory
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	cfg := GetConfig()
	clipDir := cfg.Storage.BasePath
	if user.ClipDirectory.Valid {
		clipDir = user.ClipDirectory.String
	}

	// Construct full path to media file
	fullPath := filepath.Join(clipDir, clip.Path, "media", cleanFilename)

	// Verify file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return c.Error(http.StatusNotFound, fmt.Errorf("media file not found"))
	}

	// Detect MIME type
	mimeType := mime.TypeByExtension(filepath.Ext(cleanFilename))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	// Set Content-Type header
	c.Response().Header().Set("Content-Type", mimeType)
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", cleanFilename))

	// Serve the file
	http.ServeFile(c.Response(), c.Request(), fullPath)
	return nil
}

// deleteClip deletes a clip from database and optionally from filesystem
func deleteClip(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	userIDStr := c.Value("user_id").(string)
	userID, err := uuid.FromString(userIDStr)
	if err != nil {
		return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid user"))
	}

	clipIDStr := c.Param("id")
	clipID, err := uuid.FromString(clipIDStr)
	if err != nil {
		return c.Error(http.StatusBadRequest, fmt.Errorf("invalid clip ID"))
	}

	// Fetch clip with ownership check
	clip, err := models.FindClipByIDAndUser(tx, clipID, userID)
	if err != nil {
		return c.Error(http.StatusNotFound, fmt.Errorf("clip not found"))
	}

	// Get delete_files param (default: true)
	deleteFiles := c.Param("delete_files") != "false"

	if deleteFiles {
		// Get user's clip directory
		user := &models.User{}
		if err := tx.Find(user, userID); err != nil {
			return c.Error(http.StatusInternalServerError, err)
		}

		cfg := GetConfig()
		clipDir := cfg.Storage.BasePath
		if user.ClipDirectory.Valid {
			clipDir = user.ClipDirectory.String
		}

		// Delete clip folder
		fullPath := filepath.Join(clipDir, clip.Path)
		if err := os.RemoveAll(fullPath); err != nil {
			c.Logger().Warnf("Failed to delete clip files at %s: %v", fullPath, err)
			// Continue with database deletion even if file deletion fails
		}
	}

	// Delete from database
	if err := tx.Destroy(clip); err != nil {
		return c.Error(http.StatusInternalServerError, err)
	}

	return c.Render(http.StatusNoContent, nil)
}
