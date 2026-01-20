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
CREATE TABLE IF NOT EXISTS "clips" (
"id" TEXT PRIMARY KEY,
"user_id" char(36) NOT NULL,
"title" TEXT NOT NULL,
"url" TEXT NOT NULL,
"path" TEXT NOT NULL,
"mode" TEXT NOT NULL DEFAULT 'article',
"tags" TEXT,
"notes" TEXT,
"created_at" DATETIME NOT NULL,
"updated_at" DATETIME NOT NULL
);
CREATE INDEX "clips_user_id_idx" ON "clips" (user_id);
CREATE TABLE IF NOT EXISTS "api_tokens" (
"id" TEXT PRIMARY KEY,
"user_id" char(36) NOT NULL,
"name" TEXT NOT NULL,
"token_hash" TEXT NOT NULL,
"prefix" TEXT NOT NULL,
"last_used_at" DATETIME,
"expires_at" DATETIME,
"revoked" bool NOT NULL DEFAULT 'false',
"revoked_at" DATETIME,
"revoked_reason" TEXT,
"created_at" DATETIME NOT NULL,
"updated_at" DATETIME NOT NULL
);
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens" (user_id);
CREATE UNIQUE INDEX "api_tokens_token_hash_idx" ON "api_tokens" (token_hash);
CREATE INDEX "api_tokens_prefix_idx" ON "api_tokens" (prefix);
