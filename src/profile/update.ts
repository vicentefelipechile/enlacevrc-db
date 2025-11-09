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
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// UpdateProfile Function
// =================================================================================================

/**
 * @description Updates an existing user profile in the database.
 * @param {Request} request The incoming Request object.
 * @param {string} profileId The ID of the profile to update (can be vrchat_id or discord_id).
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function UpdateProfile(request: Request, profileId: string, env: Env, userId: string): Promise<Response> {
    try {
        // Data extraction
        const dataProfileUpdate: Partial<Profile> = await request.json();

        // Basic validation
        if (!dataProfileUpdate || Object.keys(dataProfileUpdate).length === 0) {
            return ErrorResponse('No fields provided to update', 400);
        }

        // Staff validation
        if (!userId.startsWith('stf_')) {
            return ErrorResponse('Only staff members can update profiles', 403);
        }

        // Validation: Admin cannot ban and verify at the same time
        if (dataProfileUpdate.is_banned !== undefined && dataProfileUpdate.is_verified !== undefined) {
            return ErrorResponse('Cannot ban and verify a profile at the same time. Choose one action.', 400);
        }

        let profile;

        const statementVRChat = env.DB.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
        profile = await statementVRChat.bind(profileId).first<Profile>();

        if (!profile) {
            const statementDiscord = env.DB.prepare('SELECT * FROM profiles WHERE discord_id = ?');
            profile = await statementDiscord.bind(profileId).first<Profile>();
        }

        if (!profile) {
            await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found for update by user ${userId}`);
            return ErrorResponse('Profile not found', 404);
        }

        // Handle banning logic
        const isChangingBanning = dataProfileUpdate.is_banned !== undefined;
        if (isChangingBanning) {
            const {
                is_banned: isBanned,
                banned_reason: bannedReason
            } = dataProfileUpdate;
            
            if (isBanned) {
                // Banning the user
                if (!bannedReason) {
                    return ErrorResponse('Banned reason is required when banning a profile', 400);
                }

                // Verify that the ban reason exists
                const banReasonCheck = env.DB.prepare('SELECT ban_reason_id FROM ban_reason WHERE ban_reason_id = ? AND is_disabled = FALSE');
                const banReasonExists = await banReasonCheck.bind(bannedReason).first();
                
                if (!banReasonExists) {
                    return ErrorResponse('Invalid ban reason provided', 400);
                }

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
                
                const result = await updateStatement.bind(bannedReason, userId, userId, profile.profile_id).run();
                
                if (!result.success) {
                    await LogIt(env.DB, LogLevel.ERROR, `Failed to ban profile ${profile.profile_id} by user ${userId}`);
                    return ErrorResponse('Failed to ban profile', 409);
                }

                await LogIt(env.DB, LogLevel.INFO, `Profile ${profile.profile_id} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) banned by ${userId} with reason ${bannedReason}`);
                return SuccessResponse('Profile banned successfully', 200);
            } else {
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
                
                const result = await updateStatement.bind(userId, profile.profile_id).run();
                
                if (!result.success) {
                    await LogIt(env.DB, LogLevel.ERROR, `Failed to unban profile ${profile.profile_id} by user ${userId}`);
                    return ErrorResponse('Failed to unban profile', 409);
                }

                await LogIt(env.DB, LogLevel.INFO, `Profile ${profile.profile_id} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) unbanned by ${userId}`);
                return SuccessResponse('Profile unbanned successfully', 200);
            }
        }

        // Handle verification logic
        const isChangingVerification = dataProfileUpdate.is_verified !== undefined;
        if (isChangingVerification) {
            const { 
                is_verified: isVerified, 
                verification_id: verificationMethod, 
                verified_from: verifiedFrom 
            } = dataProfileUpdate;
            
            if (isVerified) {
                // Verifying the user
                if (!verificationMethod) {
                    return ErrorResponse('Verification method is required when verifying a profile', 400);
                }

                // Verify that the verification type exists
                const verificationTypeCheck = env.DB.prepare('SELECT verification_type_id FROM verification_type WHERE verification_type_id = ? AND is_disabled = FALSE');
                const verificationTypeExists = await verificationTypeCheck.bind(verificationMethod).first();
                
                if (!verificationTypeExists) {
                    return ErrorResponse('Invalid verification method provided', 400);
                }

                // If verified_from is provided, validate it exists in discord_server table
                if (verifiedFrom) {
                    const serverCheck = env.DB.prepare('SELECT server_id FROM discord_server WHERE server_id = ?');
                    const serverExists = await serverCheck.bind(verifiedFrom).first();
                    
                    if (!serverExists) {
                        return ErrorResponse('Invalid Discord server ID provided', 400);
                    }
                } else {
                    return ErrorResponse('verified_from is required when verifying a profile', 400);
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
                    verifiedFrom,
                    userId,
                    userId,
                    profile.profile_id
                ).run();

                if (!result.success) {
                    await LogIt(env.DB, LogLevel.ERROR, `Failed to verify profile ${profile.profile_id} by user ${userId}`);
                    return ErrorResponse('Failed to verify profile', 409);
                }

                await LogIt(env.DB, LogLevel.INFO, `Profile ${profile.profile_id} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) verified by ${userId} using method ${verificationMethod}`);
                return SuccessResponse('Profile verified successfully', 200);
            } else {
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
                        profile_id = ?
                `);
                
                const result = await updateStatement.bind(userId, profile.profile_id).run();
                
                if (!result.success) {
                    await LogIt(env.DB, LogLevel.ERROR, `Failed to unverify profile ${profile.profile_id} by user ${userId}`);
                    return ErrorResponse('Failed to unverify profile', 409);
                }

                await LogIt(env.DB, LogLevel.INFO, `Profile ${profile.profile_id} (VRChat: ${profile.vrchat_id}, Discord: ${profile.discord_id}) unverified by ${userId}`);
                return SuccessResponse('Profile unverified successfully', 200);
            }
        }
    
        // If some how we reach here without returning, I simply don't know what to do
        return ErrorResponse('No valid fields provided to update', 400);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error updating profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error updating profile by ${userId}: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}