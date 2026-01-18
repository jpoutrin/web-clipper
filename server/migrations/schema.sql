CREATE TABLE IF NOT EXISTS "schema_migration" (
"version" TEXT PRIMARY KEY
);
CREATE UNIQUE INDEX "schema_migration_version_idx" ON "schema_migration" (version);
CREATE TABLE IF NOT EXISTS "users" (
"id" TEXT PRIMARY KEY,
"email" TEXT NOT NULL,
"name" TEXT NOT NULL,
"oauth_id" TEXT NOT NULL,
"clip_directory" TEXT,
"created_at" DATETIME NOT NULL,
"updated_at" DATETIME NOT NULL
, "disabled" bool DEFAULT 'false');
CREATE UNIQUE INDEX "users_oauth_id_idx" ON "users" (oauth_id);
CREATE INDEX "users_email_idx" ON "users" (email);
