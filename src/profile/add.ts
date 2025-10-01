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
        if (!newProfileData.vrchat_id || !newProfileData.discord_id || !newProfileData.vrchat_name) {
            return ErrorResponse('Missing required fields: vrchat_id, discord_id, and vrchat_name are required', 400);
        }

        // Variable extraction
        const {
            vrchat_id: vrchatId,
            discord_id: discordId,
            vrchat_name: vrchatName
        } = newProfileData;

        // Statement preparation and execution
        const statement = env.DB.prepare('INSERT INTO profiles (vrchat_id, discord_id, vrchat_name) VALUES (?, ?, ?)');
        const { success } = await statement.bind(vrchatId, discordId, vrchatName).run();

        // Database result handling
        if (success) {
            return SuccessResponse('Profile created successfully', 201);
        } else {
            // 409 Conflict is more specific
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