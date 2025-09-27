/**
 * @file Implements the logic for adding a new user profile to the database.
 * @author vicentefelipechile
 */

import type { Profile } from '../profile';
import { ErrorResponse, SuccessResponse } from '../responses';

/**
 * @description Handles the POST request to create a new user profile.
 * It expects a JSON body with the new profile's data.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function AddProfile(request: Request, env: Env): Promise<Response> {
    try {
        // Parse and validate the request body
        const newProfileData: Partial<Profile> = await request.json();

        if (!newProfileData.vrchat_id || !newProfileData.discord_id || !newProfileData.vrchat_name) {
            return ErrorResponse('Missing required fields: vrchat_id, discord_id, vrchat_name', 400);
        }

        // Prepare and execute the database query
        const statement = env.enlacevrc_db.prepare(
            'INSERT INTO profiles (vrchat_id, discord_id, vrchat_name) VALUES (?, ?, ?)'
        );
        const { success } = await statement.bind(
            newProfileData.vrchat_id,
            newProfileData.discord_id,
            newProfileData.vrchat_name
        ).run();

        // Handle the result
        if (success) {
            return SuccessResponse('Profile created successfully.', 201);
        } else {
            // This case might occur if there's a unique constraint violation, for example.
            return ErrorResponse('Failed to create profile. It may already exist.', 409); // 409 Conflict is more specific
        }
    } catch (e: unknown) {
        // Handle potential errors, like invalid JSON or database issues
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error adding profile: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body.', 400);
        }
        
        return ErrorResponse('Internal Server Error', 500);
    }
}