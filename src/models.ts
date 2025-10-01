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
 * @description Represents a user profile in the database.
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
}

/**
 * @description Represents a Discord setting in the database.
 * @interface DiscordSetting
 * Why it have 3D in the name? idk, ask gemini
 */

export interface DiscordSetting3D {
    id: number;
    discord_server_id: string;
    setting_key: string;
    setting_value: string;
    created_at: Date;
    updated_at: Date;
}