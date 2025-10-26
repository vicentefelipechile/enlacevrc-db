/**
 * @file        profile/add.ts
 * @author      vicentefelipechile
 * @description This function adds a new user profile to the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// AddProfile Function
// =================================================================================================

/**
 * @description Adds a new user profile to the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function AddProfile(request: Request, env: Env): Promise<Response> {
    try {
        // Data extraction
        const newProfileData: Partial<Profile> = await request.json();

        // Basic validation
        if (!newProfileData.vrchat_id || !newProfileData.discord_id || !newProfileData.vrchat_name || !newProfileData.verification_method) {
            return ErrorResponse('Missing required fields: vrchat_id, discord_id, vrchat_name, and verification_method are required', 400);
        }

        // Generate new profile ID
        const profileId = `prf_${crypto.randomUUID()}`;

        // Variable extraction
        let {
            vrchat_id: vrchatId,
            discord_id: discordId,
            vrchat_name: vrchatName,
            is_banned: isBanned = false,
            banned_at: bannedAt,
            banned_reason: bannedReason,
            banned_by: bannedBy,
            is_verified: isVerified = false,
            verification_method: verificationMethod,
            verified_at: verifiedAt,
            verified_from: verifiedFrom,
            verified_by: verifiedBy
        } = newProfileData;

        // Validate foreign keys if provided
        if (bannedReason !== undefined) {
            const banReasonCheck = await env.DB.prepare('SELECT 1 FROM ban_reason WHERE ban_reason_id = ?').bind(bannedReason).first();
            if (!banReasonCheck) return ErrorResponse('Invalid banned_reason: ban reason does not exist', 400);
        }
        if (bannedBy !== undefined) {
            const staffCheck = await env.DB.prepare('SELECT 1 FROM staff WHERE staff_id = ?').bind(bannedBy).first();
            if (!staffCheck) return ErrorResponse('Invalid banned_by: staff member does not exist', 400);
        }
        if (verifiedFrom !== undefined) {
            const server = await env.DB.prepare('SELECT server_id FROM discord_server WHERE discord_server_id = ?').bind(verifiedFrom).first() as { server_id: string } | null;
            if (!server) return ErrorResponse('Invalid verified_from: discord server does not exist', 400);
            verifiedFrom = server.server_id; // Update to generated ID
        }
        if (verifiedBy !== undefined) {
            const staffCheck = await env.DB.prepare('SELECT 1 FROM staff WHERE staff_id = ?').bind(verifiedBy).first();
            if (!staffCheck) return ErrorResponse('Invalid verified_by: staff member does not exist', 400);
        }

        // Statement preparation and execution
        const statement = env.DB.prepare(`
            INSERT INTO profiles (
                profile_id, vrchat_id, discord_id, vrchat_name, is_banned, banned_at, banned_reason, banned_by,
                is_verified, verification_method, verified_at, verified_from, verified_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const { success, meta } = await statement.bind(
            profileId, vrchatId, discordId, vrchatName, isBanned ? 1 : 0, bannedAt, bannedReason, bannedBy,
            isVerified ? 1 : 0, verificationMethod, verifiedAt, verifiedFrom, verifiedBy
        ).run();

        // Database result handling
        if (success) {
            // Log the action
            const logStmt = env.DB.prepare('INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)');
            await logStmt.bind(1, `Profile added: ${vrchatId}`, 'system').run(); // Assuming log_level_id 1 is INFO

            return SuccessResponse('Profile created successfully', 201);
        } else {
            return ErrorResponse('Failed to create profile. It may already exist', 409);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error adding profile: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }
        
        return ErrorResponse('Internal Server Error', 500);
    }
}