-- Adds refresh token storage so access tokens can be short-lived without forcing
-- users back to the login screen every hour (#39).
-- Fresh databases already receive this table from schema.sql.

CREATE TABLE refresh_tokens (
    id                       CHAR(36) PRIMARY KEY,
    user_id                  CHAR(36) NOT NULL,
    token_hash               CHAR(64) NOT NULL,          -- SHA-256 of the raw token, hex; raw value is never stored
    expires_at               DATETIME(6) NOT NULL,
    created_at               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    revoked_at               DATETIME(6),                -- set on rotation, logout, or reuse detection
    replaced_by_token_hash   CHAR(64),                   -- rotation chain, for auditing a reuse incident

    UNIQUE KEY uq_refresh_tokens_token_hash (token_hash),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Lookup on presentation is by hash (unique index above). This one supports
-- revoking every active token for a user during reuse detection and logout.
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens (user_id, revoked_at, expires_at);
