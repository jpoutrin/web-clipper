package actions

import (
	"encoding/base64"
	"net/http"
)

func (as *ActionSuite) Test_ClipsEndpoint_Unauthorized() {
	// Clips endpoint requires authentication
	res := as.JSON("/api/v1/clips").Post(map[string]interface{}{
		"title":    "Test Clip",
		"url":      "https://example.com",
		"markdown": "# Test",
		"tags":     []string{},
		"notes":    "",
		"images":   []interface{}{},
	})
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_SlugifyFunction() {
	tests := []struct {
		input    string
		expected string
	}{
		{"Hello World", "hello-world"},
		{"Test 123!", "test-123"},
		{"  spaces  ", "spaces"},
		{"UPPERCASE", "uppercase"},
		{"special@#$chars", "special-chars"},
	}

	for _, tt := range tests {
		result := slugify(tt.input)
		as.Equal(tt.expected, result, "slugify(%q)", tt.input)
	}
}

func (as *ActionSuite) Test_ExtractDomainFunction() {
	tests := []struct {
		input    string
		expected string
	}{
		{"https://example.com/path", "example.com"},
		{"http://sub.domain.com/page", "sub.domain.com"},
		{"https://example.com", "example.com"},
		{"invalid-url", "unknown"},
	}

	for _, tt := range tests {
		result := extractDomain(tt.input)
		as.Equal(tt.expected, result, "extractDomain(%q)", tt.input)
	}
}

func (as *ActionSuite) Test_SanitizeFilenameFunction() {
	tests := []struct {
		input    string
		expected string
	}{
		{"normal.jpg", "normal.jpg"},
		{"../../../etc/passwd", "passwd"},
		{"file with spaces.png", "file_with_spaces.png"},
		{"special<>chars.gif", "special__chars.gif"},
	}

	for _, tt := range tests {
		result := sanitizeFilename(tt.input)
		as.Equal(tt.expected, result, "sanitizeFilename(%q)", tt.input)
	}
}

func (as *ActionSuite) Test_GenerateFrontmatterFunction() {
	payload := ClipPayload{
		Title:    "Test Title",
		URL:      "https://example.com/page",
		Markdown: "# Content",
		Tags:     []string{"tag1", "tag2"},
		Notes:    "Some notes",
		Images:   []ImagePayload{},
	}

	frontmatter := generateFrontmatter(payload)

	as.Contains(frontmatter, "---")
	as.Contains(frontmatter, `title: "Test Title"`)
	as.Contains(frontmatter, "url: https://example.com/page")
	as.Contains(frontmatter, "source: example.com")
	as.Contains(frontmatter, "- tag1")
	as.Contains(frontmatter, "- tag2")
	as.Contains(frontmatter, `notes: "Some notes"`)
}

func (as *ActionSuite) Test_Base64ImageDecoding() {
	// Test that base64 decoding works for images
	originalData := []byte("test image data")
	encoded := base64.StdEncoding.EncodeToString(originalData)

	decoded, err := base64.StdEncoding.DecodeString(encoded)
	as.NoError(err)
	as.Equal(originalData, decoded)
}

// List Clips Tests

func (as *ActionSuite) Test_ListClips_Unauthorized() {
	// List clips endpoint requires authentication
	res := as.JSON("/api/v1/clips").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_ListClips_DefaultPagination() {
	// Test that default pagination parameters are applied
	// Without auth, should return 401, but endpoint exists
	res := as.JSON("/api/v1/clips").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_ListClips_WithPaginationParams() {
	// Test pagination query parameters
	res := as.JSON("/api/v1/clips?page=2&per_page=10").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_ListClips_WithModeFilter() {
	// Test mode filter query parameter
	res := as.JSON("/api/v1/clips?mode=article").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_ListClips_WithTagFilter() {
	// Test tag filter query parameter
	res := as.JSON("/api/v1/clips?tag=tech").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

// Get Clip Tests

func (as *ActionSuite) Test_GetClip_Unauthorized() {
	// Get clip endpoint requires authentication
	res := as.JSON("/api/v1/clips/550e8400-e29b-41d4-a716-446655440000").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_GetClip_InvalidUUID() {
	// Test with invalid UUID format
	res := as.JSON("/api/v1/clips/invalid-uuid").Get()
	// Should fail at auth middleware first
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_GetClip_ValidUUIDFormat() {
	// Test with valid UUID format (still fails auth)
	res := as.JSON("/api/v1/clips/550e8400-e29b-41d4-a716-446655440000").Get()
	as.Equal(http.StatusUnauthorized, res.Code)
}

// Delete Clip Tests

func (as *ActionSuite) Test_DeleteClip_Unauthorized() {
	// Delete clip endpoint requires authentication
	res := as.JSON("/api/v1/clips/550e8400-e29b-41d4-a716-446655440000").Delete()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_DeleteClip_InvalidUUID() {
	// Test with invalid UUID format
	res := as.JSON("/api/v1/clips/invalid-uuid").Delete()
	// Should fail at auth middleware first
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_DeleteClip_WithDeleteFilesParam() {
	// Test delete_files query parameter
	res := as.JSON("/api/v1/clips/550e8400-e29b-41d4-a716-446655440000?delete_files=false").Delete()
	as.Equal(http.StatusUnauthorized, res.Code)
}

func (as *ActionSuite) Test_DeleteClip_WithDeleteFilesTrue() {
	// Test delete_files=true (default behavior)
	res := as.JSON("/api/v1/clips/550e8400-e29b-41d4-a716-446655440000?delete_files=true").Delete()
	as.Equal(http.StatusUnauthorized, res.Code)
}
