/**
 * @file        profile/update.ts
 * @author      vicentefelipechile
 * @description This file contains the function to update an existing user profile in the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// UpdateProfile Function
// =================================================================================================

/**
 * @description Updates an existing user profile in the database.
 * @param {Request} request The incoming Request object.
 * @param {string} profileId The ID of the profile to update (can be vrchat_id or discord_id).
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function UpdateProfile(request: Request, profileId: string, env: Env): Promise<Response> {
    try {
        // Data extraction
        const dataProfileUpdate: Partial<Profile> = await request.json();

        // Basic validation
        if (!dataProfileUpdate || Object.keys(dataProfileUpdate).length === 0) {
            return ErrorResponse('No fields provided to update', 400);
        }

        let profile;

        const statementVRChat = env.DB.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
        profile = await statementVRChat.bind(profileId).first<Profile>();

        if (!profile) {
            const statementDiscord = env.DB.prepare('SELECT * FROM profiles WHERE discord_id = ?');
            profile = await statementDiscord.bind(profileId).first<Profile>();
        }

        if (!profile) {
            return ErrorResponse('Profile not found', 404);
        }

        // Variable extraction
        const {
            vrchat_name: vrchatName,
            discord_id: discordId,
            is_verified: isVerified,
            is_banned: isBanned,
        } = dataProfileUpdate;

        const { vrchat_id: vrchatId } = profile;

        // Statement construction
        const fields: string[] = [];
        const values: (string | null)[] = [];

        if (vrchatName) {
            fields.push('vrchat_name = ?');
            values.push(vrchatName);
        }

        if (discordId) {
            fields.push('discord_id = ?');
            values.push(discordId);
        }

        if (isVerified !== undefined) {
            fields.push('is_verified = ?');
            values.push(isVerified ? '1' : '0');

            if (isVerified) {
                fields.push('verified_at = CURRENT_TIMESTAMP');
            } else {
                fields.push('verified_at = NULL');
            }
        }

        if (isBanned !== undefined) {
            fields.push('is_banned = ?');
            values.push(isBanned ? '1' : '0');

            if (isBanned) {
                fields.push('banned_at = CURRENT_TIMESTAMP');
            } else {
                fields.push('banned_at = NULL');
            }
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(vrchatId);

        // Statement preparation and execution
        const statement = `UPDATE profiles SET ${fields.join(', ')} WHERE vrchat_id = ?`;
        const { success } = await env.DB.prepare(statement).bind(...values).run();

        // Database result handling
        if (success) {
            return SuccessResponse('Profile updated successfully');
        } else {
            return ErrorResponse('Failed to update profile', 500);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error updating profile: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}