/**
 * @file        src/models.ts
 * @author      vicentefelipechile
 * @description This file contains TypeScript interfaces representing the database models
 * used in the application, including user profiles, Discord settings, staff, and logging.
 */

// =================================================================================================
// Database Models
// =================================================================================================

/**
 * @description Represents a ban reason in the database.
 * @interface BanReason
 */
export interface BanReason {
    ban_reason_id: number;
    reason_text: string;
    created_at: Date;
    created_by: string;
    updated_at: Date;
    is_disabled: boolean;
}

/**
 * @description Represents a setting type in the database.
 * @interface SettingType
 */
export interface SettingType {
    setting_type_id: number;
    type_name: string;
    description?: string;
    created_at: Date;
    created_by: string;
    updated_at: Date;
}

/**
 * @description Represents the type of verification the user going through.
 * @interface VerificationType
 */

export interface VerificationType {
    verification_type_id: number;
    type_name: string;
    description?: string;
    created_at: Date;
    created_by: string;
    updated_at: Date;
    is_disabled: boolean;
}

/**
 * @description Represents a setting in the database.
 * @interface Setting
 */
export interface Setting {
    setting_id: number;
    setting_name: string;
    setting_type_id: number;
    created_at: Date;
    created_by: string;
    updated_at: Date;
    is_disabled: boolean;
}

/**
 * @description Represents a log level in the database.
 * @interface LogLevel
 */
export interface LogLevel {
    log_level_id: number;
    level_name: string;
    description: string;
    created_at: Date;
    created_by: string;
    updated_at: Date;
}

/**
 * @description Represents a log entry in the database.
 * @interface Log
 */
export interface Log {
    log_id: number;
    log_level_id: number;
    log_message: string;
    created_at: Date;
    created_by: string;
}

/**
 * @description Represents a Discord server in the database.
 * @interface DiscordServer
 */
export interface DiscordServer {
    server_id: string;
    server_name: string;
    added_at: Date;
    added_by: string;
}

/**
 * @description Represents a bot admin in the database.
 * @interface BotAdmin
 */
export interface BotAdmin {
    admin_id: number;
    discord_id: string;
    added_at: Date;
    added_by: string;
}

/**
 * @description Represents a staff member in the database.
 * @interface Staff
 */
export interface Staff {
    staff_id: number;
    discord_id: string;
    discord_name?: string;
    added_at: Date;
    added_by: number;
}

/**
 * @description Represents a user profile in the database.
 * @interface Profile
 */
export interface Profile {
    profile_id: number;
    vrchat_id: string;
    discord_id: string;
    vrchat_name: string;
    added_at: Date;
    updated_at: Date;
    is_banned: boolean | number;
    banned_at?: Date;
    banned_reason?: number;
    banned_by?: number;
    is_verified: boolean | number;
    verified_at?: Date;
    verified_from?: string;
    verified_by?: number;
}

/**
 * @description Represents a Discord setting in the database.
 * @interface DiscordSetting
 */
export interface DiscordSetting {
    discord_setting_id: number;
    discord_server_id: string;
    setting_key: string;
    setting_value: string;
    created_at: Date;
    updated_at: Date;
    updated_by: string;
}