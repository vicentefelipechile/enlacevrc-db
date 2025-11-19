/**
 * @file        profile/ban_profile.ts
 * @author      vicentefelipechile
 * @description This function handles banning and unbanning user profiles.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';
import { requireAuth } from '../middleware/auth';

// =================================================================================================
// BanProfile Function
// =================================================================================================

/**
 * @description Bans an existing user profile in the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} staffId The ID of the user performing the action.
 * @param {string} profileId The profile ID (VRChat ID or Discord ID).
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function BanProfile(request: Request, env: Env, staffId: string, profileId: string): Promise<Response> {
    try {
        // Permission validation
        const isStaff = await requireAuth(request, env, true);
        if (isStaff) {
            return isStaff;
        }

        // Data extraction
        const banData: Partial<Profile> = await request.json();
        const userName = request.headers.get('X-Discord-Name')!;

        // Input validation
        const allowedFields = ['banned_reason'];
        const receivedFields = Object.keys(banData);
        const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
        
        if (invalidFields.length > 0) {
            return ErrorResponse(`Invalid fields provided: ${invalidFields.join(', ')}`, 400);
        }

        if (!banData.banned_reason) {
            return ErrorResponse('Missing required field: banned_reason', 400);
        }

        if (typeof banData.banned_reason !== 'string' || banData.banned_reason.trim() === '') {
            return ErrorResponse('Field banned_reason must be a valid non-empty string', 400);
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
            await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found for ban action by user ${staffId}`, userName);
            return ErrorResponse('Profile not found', 404);
        }

        // Check if already banned
        if (profile.is_banned) {
            return ErrorResponse('Profile is already banned', 409);
        }

        // Variable extraction
        const { banned_reason: bannedReason } = banData;

        // Statement preparation and execution
        const updateStatement = env.DB.prepare(`
            UPDATE
                profiles 
            SET
                is_banned = TRUE, 
                banned_at = CURRENT_TIMESTAMP, 
                banned_reason = ?, 
                banned_by = ?, 
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
            WHERE
                discord_id = ?
        `);
        
        const result = await updateStatement.bind(bannedReason, staffId, staffId, profile.discord_id).run();
        
        if (!result.success) {
            await LogIt(env.DB, LogLevel.ERROR, `Failed to ban profile ${profile.discord_id} by user ${staffId}`, userName);
            return ErrorResponse('Failed to ban profile', 409);
        }

        await LogIt(env.DB, LogLevel.CHANGE, `Profile ${profile.vrchat_name} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) banned by ${staffId} with reason ${bannedReason}`, userName);
        return SuccessResponse('Profile banned successfully', 200);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error banning profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error banning profile by ${staffId}: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
