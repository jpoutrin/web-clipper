package models

import (
	"time"

	"github.com/gobuffalo/nulls"
	"github.com/gobuffalo/pop/v6"
	"github.com/gobuffalo/validate/v3"
	"github.com/gobuffalo/validate/v3/validators"
	"github.com/gofrs/uuid"
)

// Clip represents a saved web clip
type Clip struct {
	ID        uuid.UUID    `json:"id" db:"id"`
	UserID    uuid.UUID    `json:"user_id" db:"user_id"`
	Title     string       `json:"title" db:"title"`
	URL       string       `json:"url" db:"url"`
	Path      string       `json:"path" db:"path"`           // Relative path to clip folder
	Mode      string       `json:"mode" db:"mode"`           // article, bookmark, screenshot, etc.
	Tags      nulls.String `json:"tags" db:"tags"`           // JSON array stored as string
	Notes     nulls.String `json:"notes" db:"notes"`
	CreatedAt time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt time.Time    `json:"updated_at" db:"updated_at"`

	// Associations
	User User `json:"-" belongs_to:"user"`
}

// Clips is a slice of Clip for collection operations
type Clips []Clip

// Validate validates the Clip fields
func (c *Clip) Validate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.Validate(
		&validators.UUIDIsPresent{Field: c.UserID, Name: "UserID"},
		&validators.StringIsPresent{Field: c.Title, Name: "Title"},
		&validators.StringIsPresent{Field: c.URL, Name: "URL"},
		&validators.StringIsPresent{Field: c.Path, Name: "Path"},
		&validators.StringIsPresent{Field: c.Mode, Name: "Mode"},
	), nil
}

// FindClipsByUserID returns all clips for a user with pagination
func FindClipsByUserID(tx *pop.Connection, userID uuid.UUID, page, perPage int) (Clips, int, error) {
	clips := Clips{}
	q := tx.Where("user_id = ?", userID).Order("created_at DESC")

	// Get total count
	count, err := q.Count(&Clip{})
	if err != nil {
		return clips, 0, err
	}

	// Paginate
	err = q.Paginate(page, perPage).All(&clips)
	return clips, count, err
}

// FindClipByIDAndUser finds a clip ensuring ownership
func FindClipByIDAndUser(tx *pop.Connection, clipID, userID uuid.UUID) (*Clip, error) {
	clip := &Clip{}
	err := tx.Where("id = ? AND user_id = ?", clipID, userID).First(clip)
	return clip, err
}
