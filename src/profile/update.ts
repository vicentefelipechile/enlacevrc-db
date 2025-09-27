/**
 * @file Implements the logic for updating an existing user profile in the database.
 * @author vicentefelipechile
 */

import type { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

/**
 * @description Handles the PUT request to update an existing user profile.
 * It expects a JSON body containing the fields to be updated.
 * @param {Request} request The incoming Request object.
 * @param {string} id The VRChat user ID (`vrchat_id`) of the profile to update.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function UpdateProfile(request: Request, id: string, env: Env): Promise<Response> {
    try {
        const updateProfileData: Partial<Profile> = await request.json();

        // Validate that there is at least one field to update
        if (!updateProfileData.vrchat_name && !updateProfileData.discord_id) {
            return ErrorResponse('At least one field (vrchat_name or discord_id) must be provided for update.', 400);
        }

        // First, verify the profile exists
        const profileExists = await env.enlacevrc_db.prepare('SELECT vrchat_id FROM profiles WHERE vrchat_id = ?').bind(id).first();
        if (!profileExists) {
            return ErrorResponse(`Profile with id ${id} not found.`, 404);
        }

        // Dynamically build the UPDATE statement
        const fields: string[] = [];
        const values: (string | null)[] = [];

        if (updateProfileData.vrchat_name) {
            fields.push('vrchat_name = ?');
            values.push(updateProfileData.vrchat_name);
        }
        if (updateProfileData.discord_id) {
            fields.push('discord_id = ?');
            values.push(updateProfileData.discord_id);
        }

        // Add the timestamp update and the final ID for the WHERE clause
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const statement = `UPDATE profiles SET ${fields.join(', ')} WHERE vrchat_id = ?`;

        // Execute the query
        const { success } = await env.enlacevrc_db.prepare(statement).bind(...values).run();

        if (success) {
            return SuccessResponse('Profile updated successfully.');
        } else {
            return ErrorResponse('Failed to update profile.', 500);
        }
    } catch (e: unknown) {
        // Handle potential errors
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error updating profile: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body.', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}