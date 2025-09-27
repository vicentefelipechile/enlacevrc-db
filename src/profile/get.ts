/**
 * @file Implements the logic for retrieving a user profile from the database.
 * @author vicentefelipechile
 */

import { JsonResponse, ErrorResponse } from '../responses';

/**
 * @description Handles the GET request to fetch a single user profile by its VRChat ID.
 * @param {string} id The VRChat user ID (`vrchat_id`) from the request URL.
 * @param {Env} env The Cloudflare Worker environment object, containing database bindings.
 * @returns {Promise<Response>} A Response object with the profile data or an error message.
 */
export async function GetProfile(id: string, env: Env): Promise<Response> {
    try {
        // Prepare and execute the database query
        const statement = env.enlacevrc_db.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
        const profile = await statement.bind(id).first();

        // Handle the result
        if (profile) {
            return JsonResponse({ success: true, data: profile });
        }

        const statementDiscord = env.enlacevrc_db.prepare('SELECT * FROM profiles WHERE discord_id = ?');
        const profileDiscord = await statementDiscord.bind(id).first();

        if (profileDiscord) {
            return JsonResponse({ success: true, data: profileDiscord });
        }

        return ErrorResponse('Profile not found', 404);
    } catch (e: unknown) {
        // Handle potential errors, like database connection issues
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error fetching profile: ${errorMessage}`);
        return ErrorResponse('Internal Server Error', 500);
    }
}