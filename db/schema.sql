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
    verified_at     TIMESTAMP NULL,
    verified_by     TEXT NULL
);

CREATE TABLE IF NOT EXISTS discord_settings (
    id                  SERIAL PRIMARY KEY,
    discord_server_id   TEXT NOT NULL,
    setting_key         TEXT NOT NULL,
    setting_value       TEXT NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
    id                  SERIAL PRIMARY KEY,
    discord_id          TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    added_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by            TEXT NOT NULL
);