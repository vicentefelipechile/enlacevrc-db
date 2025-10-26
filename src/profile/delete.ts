/**
 * @file        profile/delete.ts
 * @author      vicentefelipechile
 * @description This file contains the function to delete a user profile from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// DeleteProfile Function
// =================================================================================================

/**
 * @description Deletes a user profile from the database using the provided User ID.
 * @param {string} profileId The ID of the profile to delete (can be vrchat_id or discord_id).
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function DeleteProfile(profileId: string, env: Env): Promise<Response> {
    try {
        // Data extraction
        let profileData;

        const statementDiscord = env.DB.prepare('SELECT * FROM profiles WHERE discord_id = ?');
        profileData = await statementDiscord.bind(profileId).first<Profile>();

        if (!profileData) {
            const statementVRChat = env.DB.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
            profileData = await statementVRChat.bind(profileId).first<Profile>();
        }

        // Basic validation
        if (!profileData) {
            return ErrorResponse('Profile not found.', 404);
        }

        // Variable extraction
        const {
            vrchat_id: vrchatId,
            discord_id: discordId
        } = profileData;

        // Statement preparation and execution
        const statement = env.DB.prepare('DELETE FROM profiles WHERE vrchat_id = ? OR discord_id = ?');
        const { success } = await statement.bind(vrchatId, discordId).run();

        // Database result handling
        if (success) {
            // Log the action
            const logStmt = env.DB.prepare('INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)');
            await logStmt.bind(1, `Profile deleted: ${vrchatId}`, 'system').run();

            return SuccessResponse('Profile deleted successfully.');
        } else {
            return ErrorResponse('Failed to delete profile.', 500);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error deleting profile: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}