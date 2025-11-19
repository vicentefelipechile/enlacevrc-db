/**
 * @file        profile/delete_profile.ts
 * @author      vicentefelipechile
 * @description This file contains the function to delete a user profile from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// DeleteProfile Function
// =================================================================================================

/**
 * @description Deletes a user profile from the database using the provided User ID.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string} profileId The profile ID (VRChat ID or Discord ID).
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function DeleteProfile(request: Request, env: Env, userId: string, profileId: string): Promise<Response> {
    try {
        const userName = request.headers.get('X-Discord-Name')!;

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
            await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found for deletion by user ${userName}`, userName);
            return ErrorResponse('Profile not found', 404);
        }

        // Ban status validation
        if (profileData.is_banned === 1) {
            await LogIt(env.DB, LogLevel.WARNING, `Banned user attempted to delete profile. Profile ID: ${profileId}, User: ${userId}`, userName);
            return ErrorResponse('Banned users cannot delete their profile', 403);
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
            await LogIt(env.DB, LogLevel.INFO, `Profile with VRChat ID '${vrchatId}' deleted by user ${userId}`, userName);
            return SuccessResponse('Profile deleted successfully');
        } else {
            await LogIt(env.DB, LogLevel.WARNING, `Failed to delete profile with VRChat ID '${vrchatId}' by user ${userId}`, userName);
            return ErrorResponse('Failed to delete profile', 500);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error deleting profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error deleting profile by ${userId}: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}