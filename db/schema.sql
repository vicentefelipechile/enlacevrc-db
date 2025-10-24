/* =================================================================================================
// Schema for EnlaceVRC Discord Bot Database
// This schema defines the necessary tables for managing ban reasons, settings, user profiles,
// Discord server settings, and staff members.
// ===============================================================================================*/

/* ==============================================================================================
// Small Tables
// ============================================================================================== */

/*
    Table: ban_reason
    Description: Stores predefined reasons for banning users.
*/

CREATE TABLE IF NOT EXISTS ban_reason (
    ban_reason_id   INT AUTO_INCREMENT PRIMARY KEY,
    reason_text     TEXT NOT NULL UNIQUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT NOT NULL,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/*
    Table: setting_type
    Description: Stores types of settings available for the bot.
*/

CREATE TABLE IF NOT EXISTS setting_type (
    setting_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name       TEXT NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT DEFAULT 'system',
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/*
    Table: setting
    Description: Stores predefined settings for the bot's operation.
*/

CREATE TABLE IF NOT EXISTS setting (
    setting_id          INT AUTO_INCREMENT PRIMARY KEY,
    setting_name        TEXT NOT NULL UNIQUE,
    setting_type_id     INTEGER NOT NULL REFERENCES setting_type(setting_type_id),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          TEXT DEFAULT 'system',
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/*
    Table: log_level
    Description: Different levels of logs for categorizing log messages.
*/

CREATE TABLE IF NOT EXISTS log_level (
    log_level_id   INT AUTO_INCREMENT PRIMARY KEY,
    level_name     TEXT NOT NULL UNIQUE,
    description    TEXT NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     TEXT DEFAULT 'system',
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/*
    Table: log
    Description: Stores logs of bot activities and events.
*/

CREATE TABLE IF NOT EXISTS log (
    log_id          INT AUTO_INCREMENT PRIMARY KEY,
    log_level       TEXT NOT NULL,
    log_message     TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT DEFAULT 'system',
);

/* ==============================================================================================
// Main Tables
// ============================================================================================== */

/*
    Table: discord_server
    Description: Stores information about Discord servers where the bot is active.
*/

CREATE TABLE IF NOT EXISTS discord_server (
    server_id          TEXT UNIQUE,
    server_name        TEXT NOT NULL,
    added_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by           TEXT NOT NULL
);


/*
    Table: admin
    Description: Who are the bot administrators with elevated privileges.
*/

CREATE TABLE IF NOT EXISTS bot_admin (
    admin_id        INT AUTO_INCREMENT PRIMARY KEY,
    discord_id      TEXT NOT NULL UNIQUE,
    added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by        DEFAULT TEXT 'vicentefelipechile'
);


/*
    Table: staff
    Description: Stores information about staff members who manage the bot.
*/

CREATE TABLE IF NOT EXISTS staff (
    staff_id        INT AUTO_INCREMENT PRIMARY KEY,
    discord_id      TEXT NOT NULL UNIQUE,
    discord_name    TEXT,
    added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by        INTEGER NOT NULL REFERENCES bot_admin(admin_id)
);

/*
    Table: profiles
    Description: Stores user profiles linked between VRChat and Discord.
*/

CREATE TABLE IF NOT EXISTS profiles (
    profile_id      INT AUTO_INCREMENT PRIMARY KEY,
    vrchat_id       TEXT NOT NULL UNIQUE,
    discord_id      TEXT NOT NULL,
    vrchat_name     TEXT NOT NULL,
    added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at       TIMESTAMP NULL,
    banned_reason   INTEGER NULL REFERENCES ban_reason(ban_reason_id),
    banned_by       INTEGER NULL REFERENCES staff(staff_id),

    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMP NULL,
    verified_from   INTEGER NULL REFERENCES discord_server(discord_server_id),
    verified_by     INTEGER NULL REFERENCES staff(staff_id)
);

/*
    Table: discord_settings
    Description: Stores settings specific to Discord servers.
*/

CREATE TABLE IF NOT EXISTS discord_settings (
    discord_setting_id  INT AUTO_INCREMENT PRIMARY KEY,
    discord_server_id   TEXT NOT NULL REFERENCES discord_server(server_id),
    setting_key         TEXT NOT NULL,
    setting_value       TEXT NOT NULL,

    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          TEXT DEFAULT 'system'
);