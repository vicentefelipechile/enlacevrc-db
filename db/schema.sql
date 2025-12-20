CREATE TABLE IF NOT EXISTS verification_type (
    verification_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name            TEXT NOT NULL UNIQUE,
    description          TEXT NOT NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           TEXT DEFAULT 'system',
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_disabled          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS setting_type (
    type_name      TEXT PRIMARY KEY,
    description    TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     TEXT DEFAULT 'system',
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS setting (
    setting_name        TEXT PRIMARY KEY,
    setting_type_name   TEXT NOT NULL,
    default_value       TEXT NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          TEXT DEFAULT 'system',
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_disabled         BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY(setting_type_name) REFERENCES setting_type(type_name)
);

CREATE TABLE IF NOT EXISTS log_level (
    log_level_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    level_name     TEXT NOT NULL UNIQUE,
    description    TEXT NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     TEXT DEFAULT 'system',
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS log (
    log_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    log_level_id    INTEGER NOT NULL,
    log_message     TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT DEFAULT 'system',
    FOREIGN KEY(log_level_id) REFERENCES log_level(log_level_id)
);

CREATE TABLE IF NOT EXISTS discord_server (
    discord_server_id   TEXT PRIMARY KEY,
    server_name         TEXT NOT NULL,
    added_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_admin (
    discord_id      TEXT PRIMARY KEY,
    added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by        TEXT DEFAULT 'vicentefelipechile'
);

CREATE TABLE IF NOT EXISTS staff (
    discord_id      TEXT PRIMARY KEY,
    discord_name    TEXT NOT NULL,
    added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by        TEXT NOT NULL,
    is_disabled     BOOLEAN NOT NULL DEFAULT FALSE,
    disabled_at     TIMESTAMP,
    FOREIGN KEY(added_by) REFERENCES bot_admin(discord_id)
);

CREATE TABLE IF NOT EXISTS profiles (
    discord_id      TEXT PRIMARY KEY,
    vrchat_id       TEXT NOT NULL UNIQUE,
    vrchat_name     TEXT NOT NULL,
    added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT NOT NULL,
    updated_by      TEXT,

    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at       TIMESTAMP NULL,
    banned_reason   TEXT NULL,
    banned_by       TEXT NULL,

    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verification_id INTEGER NULL,
    verified_at     TIMESTAMP NULL,
    verified_from   TEXT NULL,
    verified_by     TEXT NULL,

    FOREIGN KEY(banned_by) REFERENCES staff(discord_id),
    FOREIGN KEY(verification_id) REFERENCES verification_type(verification_type_id),
    FOREIGN KEY(verified_from) REFERENCES discord_server(discord_server_id),
    FOREIGN KEY(verified_by) REFERENCES staff(discord_id)
);

CREATE TABLE IF NOT EXISTS discord_settings (
    discord_setting_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_server_id   TEXT NOT NULL,
    setting_key         TEXT NOT NULL,
    setting_value       TEXT,

    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          TEXT DEFAULT 'system',

    FOREIGN KEY(discord_server_id) REFERENCES discord_server(discord_server_id),
    FOREIGN KEY(setting_key) REFERENCES setting(setting_name)
);

/* Created on 2025-12-19 19:16 */
CREATE TABLE IF NOT EXISTS vrchat_group (
    vrchat_group_id   TEXT PRIMARY KEY,
    discord_server_id TEXT NOT NULL,
    group_name        TEXT NOT NULL,
    added_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by          TEXT NOT NULL,
    FOREIGN KEY(discord_server_id) REFERENCES discord_server(discord_server_id)
);

/* Created on 2025-12-20 16:28 */
CREATE TABLE IF NOT EXISTS vrchat_group_log (
    vrchat_group_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id              INTEGER,
    vrchat_group_id     TEXT NOT NULL,
    discord_server_id   TEXT NOT NULL,
    group_name          TEXT NOT NULL,
    action_description  TEXT NOT NULL,
    added_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by            TEXT NOT NULL
);