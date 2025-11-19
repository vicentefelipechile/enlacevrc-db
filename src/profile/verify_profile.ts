/**
 * @file        profile/verify_profile.ts
 * @author      vicentefelipechile
 * @description This function handles verifying and unverifying user profiles.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordServer, Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// VerifyProfile Function
// =================================================================================================

/**
 * @description Verifies or unverifies an existing user profile in the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string} profileId The profile ID (VRChat ID or Discord ID).
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function VerifyProfile(request: Request, env: Env, userId: string, profileId: string): Promise<Response> {
    try {
        // Profile
        const userName = request.headers.get('X-Discord-Name')!;
        let profile;

        const statementVRChat = env.DB.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
        profile = await statementVRChat.bind(profileId).first<Profile>();

        if (!profile) {
            const statementDiscord = env.DB.prepare('SELECT * FROM profiles WHERE discord_id = ?');
            profile = await statementDiscord.bind(profileId).first<Profile>();
        }

        if (!profile) {
            await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found for verification action by user ${userId}`, userName);
            return ErrorResponse('Profile not found', 404);
        }

        // Check if the user is already verified
        if (profile.is_verified) {
            return ErrorResponse('Profile is already verified', 409);
        }

        // Data extraction
        const verificationData: Partial<Profile> = await request.json();

        // Basic validation
        if (verificationData.verification_id === undefined) {
            return ErrorResponse('Missing required field: verification_id', 400);
        }

        if (verificationData.verified_from === undefined) {
            return ErrorResponse('Missing required field: verified_from', 400);
        }

        // Staff validation and ID resolution
        let staffId: string = userId;
        if (!userId.startsWith('stf_')) {
            // Retrieve staff info
            const staffCheckStmt = env.DB.prepare('SELECT staff_id FROM staff WHERE discord_id = ?');
            const staffData = await staffCheckStmt.bind(userId).first<{ staff_id: string }>();

            if (!staffData) {
                return ErrorResponse('Only staff members can verify profiles', 403);
            }
            
            staffId = staffData.staff_id;
        }

        // Handle verification logic
        const {
            verification_id: verificationMethod, 
            verified_from: verifiedFrom 
        } = verificationData;
        let serverId: string = '';
        
        // Verifying the user
        if (!verificationMethod) {
            return ErrorResponse('Missing verification method', 400);
        }

        // Verify that the verification type exists
        const verificationTypeCheck = env.DB.prepare('SELECT verification_type_id FROM verification_type WHERE verification_type_id = ? AND is_disabled = FALSE');
        const verificationTypeExists = await verificationTypeCheck.bind(verificationMethod).first();
        
        if (!verificationTypeExists) {
            return ErrorResponse('Invalid verification method provided', 400);
        }

        // If verified_from is provided, validate it exists in discord_server table
        if (verifiedFrom) {
            const serverCheck = env.DB.prepare('SELECT server_id FROM discord_server WHERE discord_server_id = ?');
            let serverInfo = await serverCheck.bind(verifiedFrom).first<DiscordServer>();
            
            if (!serverInfo) {
                const serverByIdCheck = env.DB.prepare('SELECT server_id FROM discord_server WHERE server_id = ?');
                serverInfo = await serverByIdCheck.bind(verifiedFrom).first<DiscordServer>();
            }

            if (!serverInfo) {
                return ErrorResponse('Invalid Discord server ID provided', 400);
            }

            serverId = serverInfo.server_id;
        } else {
            return ErrorResponse('Invalid Discord server ID provided', 400);
        }

        const updateStatement = env.DB.prepare(`
            UPDATE
                profiles 
            SET
                is_verified = TRUE, 
                verification_id = ?, 
                verified_at = CURRENT_TIMESTAMP, 
                verified_from = ?, 
                verified_by = ?, 
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
            WHERE
                profile_id = ?
        `);
        
        const result = await updateStatement.bind(
            verificationMethod,
            serverId,
            staffId,
            staffId,
            profile.profile_id
        ).run();

        if (!result.success) {
            await LogIt(env.DB, LogLevel.ERROR, `Failed to verify profile ${profile.profile_id} by user ${userId}`, userName);
            return ErrorResponse('Failed to verify profile', 409);
        }

        await LogIt(env.DB, LogLevel.CHANGE, `Profile ${profile.profile_id} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) verified by ${userName} using method ${verificationMethod}`, userName);
        return SuccessResponse('Profile verified successfully', 200);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error verifying/unverifying profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error verifying/unverifying profile by ${userId}: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
