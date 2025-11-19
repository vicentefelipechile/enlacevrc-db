/**
 * @file        profile/unverify_profile.ts
 * @author      vicentefelipechile
 * @description This function handles unverifying user profiles.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';
import { requireAuth } from '../middleware/auth';

// =================================================================================================
// UnverifyProfile Function
// =================================================================================================

/**
 * @description Unverifies an existing user profile in the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} staffId The ID of the user performing the action.
 * @param {string} profileId The profile ID (VRChat ID or Discord ID).
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function UnverifyProfile(request: Request, env: Env, staffId: string, profileId: string): Promise<Response> {
    try {
        // Staff validation and ID resolution
        const isStaff = await requireAuth(request, env, true);
        if (isStaff) {
            return isStaff;
        }

        const userName = request.headers.get('X-Discord-Name')!;

        // Find profile
        let profile;

        const statementVRChat = env.DB.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
        profile = await statementVRChat.bind(profileId).first<Profile>();

        if (!profile) {
            const statementDiscord = env.DB.prepare('SELECT * FROM profiles WHERE discord_id = ?');
            profile = await statementDiscord.bind(profileId).first<Profile>();
        }

        if (!profile) {
            await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found for unverify action by user ${staffId}`, userName);
            return ErrorResponse('Profile not found', 404);
        }

        // Check if already unverified
        if (!profile.is_verified) {
            await LogIt(env.DB, LogLevel.INFO, `Attempt to unverify already unverified profile ${profile.discord_id} by user ${staffId}`, userName);
            return ErrorResponse('Profile is not verified', 409);
        }

        // Unverifying the user
        const updateStatement = env.DB.prepare(`
            UPDATE
                profiles
            SET
                is_verified = FALSE,
                verification_id = NULL,
                verified_at = NULL,
                verified_from = NULL,
                verified_by = NULL,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
            WHERE
                discord_id = ?
        `);
        
        const result = await updateStatement.bind(staffId, profile.discord_id).run();
        
        if (!result.success) {
            await LogIt(env.DB, LogLevel.ERROR, `Failed to unverify profile ${profile.discord_id} by user ${staffId}`, userName);
            return ErrorResponse('Failed to unverify profile', 409);
        }

        await LogIt(env.DB, LogLevel.CHANGE, `Profile ${profile.vrchat_name} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) unverified by ${staffId}`, userName);
        return SuccessResponse('Profile unverified successfully', 200);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error unverifying profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error unverifying profile by ${staffId}: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
