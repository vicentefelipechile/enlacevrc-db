/**
 * @file        src/models.ts
 * @author      vicentefelipechile
 * @description This file contains TypeScript interfaces representing the database models
 * used in the application, including user profiles and Discord settings.
 */

// =================================================================================================
// Database Models
// =================================================================================================

/**
 * @description Represents an user profile in the database.
 * @interface Profile
 */

export interface Profile {
    vrchat_id: string;
    discord_id: string;
    vrchat_name: string;
    added_at: Date;
    updated_at: Date;
    is_banned: boolean | number;
    banned_at?: Date;
    banned_reason?: string;
    is_verified: boolean | number;
    verified_at?: Date;
    verified_by?: string;
}

/**
 * @description Represents a Discord setting in the database.
 * @interface DiscordSetting
 */

export interface DiscordSetting {
    id: number;
    discord_server_id: string;
    setting_key: string;
    setting_value: string;
    created_at: Date;
    updated_at: Date;
}

/**
 * @description Represents a staff who can manage the bot and database.
 * @interface Staff
 */

export interface Staff {
    id: number;
    discord_id: string;
    name: string;
    added_at: Date;
}