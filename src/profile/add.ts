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
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// AddProfile Function
// =================================================================================================

/**
 * @description Adds a new user profile to the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function AddProfile(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Data extraction
        const newProfileData: Partial<Profile> = await request.json();

        // Basic validation
        if (!newProfileData.vrchat_id || !newProfileData.discord_id || !newProfileData.vrchat_name || !newProfileData.verification_id) {
            return ErrorResponse('Missing required fields: vrchat_id, discord_id, vrchat_name, and verification_id are required', 400);
        }

        // Generate new profile ID
        const profileId = `prf_${crypto.randomUUID()}`;

        // Variable extraction
        let {
            vrchat_id: vrchatId,
            discord_id: discordId,
            vrchat_name: vrchatName,
            verification_id: verificationMethod
        } = newProfileData;

        // Statement preparation and execution
        const statement = env.DB.prepare(`
            INSERT INTO profiles (
                profile_id, vrchat_id, discord_id, vrchat_name, verification_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        const { success, meta } = await statement.bind(
            profileId, vrchatId, discordId, vrchatName, verificationMethod, userId
        ).run();

        // Database result handling
        if (success) {
            // Log the action
            await LogIt(env.DB, LogLevel.INFO, `Profile with VRChat ID '${vrchatId}' added by user ${userId}`);
            return SuccessResponse('Profile created successfully', 201);
        } else {
            await LogIt(env.DB, LogLevel.WARNING, `Failed to add profile with VRChat ID '${vrchatId}' by user ${userId}: Profile may already exist`);
            return ErrorResponse('Failed to create profile. It may already exist', 409);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error adding profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error adding profile by ${userId}: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }
        
        return ErrorResponse('Internal Server Error', 500);
    }
}