package models

import (
	"time"

	"github.com/gobuffalo/nulls"
	"github.com/gobuffalo/pop/v6"
	"github.com/gobuffalo/validate/v3"
	"github.com/gobuffalo/validate/v3/validators"
	"github.com/gofrs/uuid"
)

// User represents an authenticated user in the system.
type User struct {
	ID            uuid.UUID    `json:"id" db:"id"`
	Email         string       `json:"email" db:"email"`
	Name          string       `json:"name" db:"name"`
	OAuthID       string       `json:"oauth_id" db:"oauth_id"`
	ClipDirectory nulls.String `json:"clip_directory" db:"clip_directory"`
	Disabled      bool         `json:"disabled" db:"disabled"`
	CreatedAt     time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at" db:"updated_at"`
}

// Users is a slice of User objects.
type Users []User

// Validate checks the User fields for validity.
func (u *User) Validate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.Validate(
		&validators.StringIsPresent{Field: u.Email, Name: "Email"},
		&validators.StringIsPresent{Field: u.Name, Name: "Name"},
		&validators.StringIsPresent{Field: u.OAuthID, Name: "OAuthID"},
	), nil
}

// FindOrCreateByOAuthID finds a user by OAuth ID or creates a new one.
func FindOrCreateByOAuthID(tx *pop.Connection, oauthID, email, name string) (*User, error) {
	user := &User{}
	err := tx.Where("oauth_id = ?", oauthID).First(user)
	if err == nil {
		return user, nil
	}

	// User not found, create new one
	user = &User{
		ID:      uuid.Must(uuid.NewV4()),
		Email:   email,
		Name:    name,
		OAuthID: oauthID,
	}

	err = tx.Create(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}
