/**
 * @file        staff/update_staff_name.ts
 * @author      vicentefelipechile
 * @description This function updates the name of an existing staff member in the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { validateAdmin } from '../middleware/auth';
import { Staff } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// UpdateStaffName Function
// =================================================================================================

/**
 * @description Updates the discord_name of an existing staff member in the database.
 * @param {Request} request The incoming Request object containing discord_name field.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} staffId The Discord ID of the staff member to update.
 * @param {string} userId The Discord ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the update operation.
 */
export async function UpdateStaffName(request: Request, env: Env, staffId: string, userId: string): Promise<Response> {
    try {
        // Admin validation
        const isAdmin = await validateAdmin(userId, env);
        if (!isAdmin) {
            return ErrorResponse('Forbidden: Only admins can update staff members', 403);
        }

        // Data extraction
        const dataStaffUpdate: Partial<Staff> = await request.json();

        // Input validation
        if (!dataStaffUpdate || Object.keys(dataStaffUpdate).length === 0) {
            return ErrorResponse('No fields provided to update', 400);
        }

        // Check if staff member exists
        const checkStatement = env.DB.prepare('SELECT * FROM staff WHERE discord_id = ?');
        const staff = await checkStatement.bind(staffId).first<Staff>();

        if (!staff) {
            return ErrorResponse('Staff member not found', 404);
        }

        // Variable extraction
        const { discord_name: discordName } = dataStaffUpdate;

        // Input validation for updateable fields
        if (!discordName) {
            return ErrorResponse('No valid fields provided to update. Only discord_name can be updated', 400);
        }

        // Statement preparation and execution
        const statement = env.DB.prepare('UPDATE staff SET discord_name = ? WHERE discord_id = ?');
        const { success } = await statement.bind(discordName, staffId).run();

        // Database result handling
        if (success) {
            // Log the action
            const logStmt = env.DB.prepare('INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)');
            await logStmt.bind(1, `Staff member name updated: ${staffId}`, 'system').run();

            return SuccessResponse('Staff member name updated successfully');
        } else {
            return ErrorResponse('Failed to update staff member', 500);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error updating staff member: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
