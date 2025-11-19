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

// =================================================================================================
// BanProfile Function
// =================================================================================================

/**
 * @description Bans an existing user profile in the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string} profileId The profile ID (VRChat ID or Discord ID).
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function BanProfile(request: Request, env: Env, userId: string, profileId: string): Promise<Response> {
    try {
        // Data extraction
        const banData: Partial<Profile> = await request.json();

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

        // Staff validation and ID resolution
        let staffId: string = userId;
        const userName = request.headers.get('X-Discord-Name')!;
        if (!userId.startsWith('stf_')) {
            // Retrieve staff info
            const staffCheckStmt = env.DB.prepare('SELECT staff_id FROM staff WHERE discord_id = ?');
            const staffData = await staffCheckStmt.bind(userId).first<{ staff_id: string }>();

            if (!staffData) {
                return ErrorResponse('Only staff members can ban profiles', 403);
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
            await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found for ban action by user ${userId}`, userName);
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
                profile_id = ?
        `);
        
        const result = await updateStatement.bind(bannedReason, staffId, staffId, profile.profile_id).run();
        
        if (!result.success) {
            await LogIt(env.DB, LogLevel.ERROR, `Failed to ban profile ${profile.profile_id} by user ${userId}`, userName);
            return ErrorResponse('Failed to ban profile', 409);
        }

        await LogIt(env.DB, LogLevel.CHANGE, `Profile ${profile.vrchat_name} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) banned by ${userId} with reason ${bannedReason}`, userName);
        return SuccessResponse('Profile banned successfully', 200);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error banning profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error banning profile by ${userId}: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
