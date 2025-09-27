DROP TABLE IF EXISTS profiles;

CREATE TABLE IF NOT EXISTS profiles (
    vrchat_id       TEXT PRIMARY KEY,
    discord_id      TEXT NOT NULL,
    vrchat_name     TEXT NOT NULL,
    added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at       TIMESTAMP NULL,
    banned_reason   TEXT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMP NULL
);