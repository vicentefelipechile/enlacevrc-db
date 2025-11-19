/**
 * @file        profile/unban_profile.ts
 * @author      vicentefelipechile
 * @description This function handles unbanning user profiles.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// UnbanProfile Function
// =================================================================================================

/**
 * @description Unbans an existing user profile in the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string} profileId The profile ID (VRChat ID or Discord ID).
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function UnbanProfile(request: Request, env: Env, userId: string, profileId: string): Promise<Response> {
    try {
        // Staff validation and ID resolution
        let staffId: string = userId;
        const userName = request.headers.get('X-Discord-Name')!;
        if (!userId.startsWith('stf_')) {
            // Retrieve staff info
            const staffCheckStmt = env.DB.prepare('SELECT staff_id FROM staff WHERE discord_id = ?');
            const staffData = await staffCheckStmt.bind(userId).first<{ staff_id: string }>();

            if (!staffData) {
                return ErrorResponse('Only staff members can unban profiles', 403);
            }
            
            staffId = staffData.staff_id;
        }

        // Find profile
        let profile;

        const statementVRChat = env.DB.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
        profile = await statementVRChat.bind(profileId).first<Profile>();

        if (!profile) {
            const statementDiscord = env.DB.prepare('SELECT * FROM profiles WHERE discord_id = ?');
            profile = await statementDiscord.bind(profileId).first<Profile>();
        }

        if (!profile) {
            await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found for unban action by user ${userId}`, userName);
            return ErrorResponse('Profile not found', 404);
        }

        // Check if profile is already unbanned
        if (!profile.is_banned) {
            await LogIt(env.DB, LogLevel.INFO, `Profile ${profile.profile_id} is not banned; unban action by user ${userId} skipped`, userName);
            return ErrorResponse('Profile is not banned', 409);
        }

        // Unbanning the user
        const updateStatement = env.DB.prepare(`
            UPDATE profiles 
            SET is_banned = FALSE, 
                banned_at = NULL, 
                banned_reason = NULL, 
                banned_by = NULL, 
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
            WHERE profile_id = ?
        `);
        
        const result = await updateStatement.bind(staffId, profile.profile_id).run();
        
        if (!result.success) {
            await LogIt(env.DB, LogLevel.ERROR, `Failed to unban profile ${profile.profile_id} by user ${userId}`, userName);
            return ErrorResponse('Failed to unban profile', 409);
        }

        await LogIt(env.DB, LogLevel.CHANGE, `Profile ${profile.profile_id} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) unbanned by ${userId}`, userName);
        return SuccessResponse('Profile unbanned successfully', 200);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error unbanning profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error unbanning profile by ${userId}: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
