/**
 * @file        staff/get.ts
 * @author      vicentefelipechile
 * @description This function fetches staff member(s) from the database by Discord ID or returns all staff members.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Staff } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';

// =================================================================================================
// GetStaff Function
// =================================================================================================

/**
 * @description Gets a staff member from the database using the provided Discord ID, or all staff members if no ID is provided.
 * @param {string | undefined} staffId The Discord ID of the staff member to fetch (optional).
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response containing the staff data or an error message.
 */
export async function GetStaff(staffId: string | undefined, env: Env): Promise<Response> {
    try {
        // If no ID provided, return all staff members
        if (!staffId) {
            const statement = env.DB.prepare('SELECT * FROM staff ORDER BY added_at DESC');
            const { results } = await statement.all<Staff>();

            return JsonResponse({ success: true, data: results || [] });
        }

        // Statement preparation and execution for specific staff member
        const statement = env.DB.prepare('SELECT * FROM staff WHERE discord_id = ?');
        const staff = await statement.bind(staffId).first<Staff>();

        // Database result handling
        if (staff) {
            return JsonResponse({ success: true, data: staff });
        }

        return ErrorResponse('Staff member not found', 404);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error fetching staff: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
