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
        if (!updateProfileData || Object.keys(updateProfileData).length === 0) {
            return ErrorResponse('No fields provided to update.', 400);
        }

        let profile: Profile | null = null;

        profile = await env.enlacevrc_db.prepare('SELECT * FROM profiles WHERE vrchat_id = ?').bind(id).first();

        if (!profile) {
            profile = await env.enlacevrc_db.prepare('SELECT * FROM profiles WHERE discord_id = ?').bind(id).first();
        }

        if (!profile) {
            return ErrorResponse('Profile not found.', 404);
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
        if (updateProfileData.is_verified !== undefined) {
            fields.push('is_verified = ?');
            values.push(updateProfileData.is_verified ? '1' : '0');

            if (updateProfileData.is_verified) {
                fields.push('verified_at = CURRENT_TIMESTAMP');
            } else {
                fields.push('verified_at = NULL');
            }
        }
        if (updateProfileData.is_banned !== undefined) {
            fields.push('is_banned = ?');
            values.push(updateProfileData.is_banned ? '1' : '0');

            if (updateProfileData.is_banned) {
                fields.push('banned_at = CURRENT_TIMESTAMP');
            } else {
                fields.push('banned_at = NULL');
            }
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