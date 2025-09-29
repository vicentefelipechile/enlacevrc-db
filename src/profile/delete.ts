/**
 * @file Implements the logic for removing a user profile from the database.
 * @author vicentefelipechile
 */

import { ErrorResponse, SuccessResponse } from '../responses';

/**
 * @description Handles the DELETE request to remove a user profile.
 * It expects the Discord user ID (`discord_id`) as a URL parameter.
 * @param {string} id The Discord user ID (`discord_id`) of the profile to delete.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function DeleteProfile(id: string, env: Env): Promise<Response> {
    try {
        // Check if the profile exists
        const profile = await env.enlacevrc_db.prepare('SELECT * FROM profiles WHERE discord_id = ?').bind(id).first();

        if (!profile) {
            return ErrorResponse('Profile not found.', 404);
        }

        // Delete the profile
        const { success } = await env.enlacevrc_db.prepare('DELETE FROM profiles WHERE discord_id = ?').bind(id).run();

        if (success) {
            return SuccessResponse('Profile deleted successfully.');
        } else {
            return ErrorResponse('Failed to delete profile.', 500);
        }
    } catch (e: unknown) {
        // Handle potential errors
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error deleting profile: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}