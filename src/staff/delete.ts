/**
 * @file        staff/delete.ts
 * @author      vicentefelipechile
 * @description This function deletes a staff member from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Staff } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// DeleteStaff Function
// =================================================================================================

/**
 * @description Deletes a staff member from the database using the provided Discord ID.
 * @param {string} staffId The Discord ID of the staff member to delete.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating the result of the deletion operation.
 */
export async function DeleteStaff(staffId: string, env: Env): Promise<Response> {
    try {
        // Check if staff member exists
        const checkStatement = env.DB.prepare('SELECT * FROM staff WHERE discord_id = ?');
        const staff = await checkStatement.bind(staffId).first<Staff>();

        // Input validation
        if (!staff) {
            return ErrorResponse('Staff member not found', 404);
        }

        // Statement preparation and execution
        const statement = env.DB.prepare('DELETE FROM staff WHERE discord_id = ?');
        const { success } = await statement.bind(staffId).run();

        // Database result handling
        if (success) {
            // Log the action
            const logStmt = env.DB.prepare('INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)');
            await logStmt.bind(1, `Staff member deleted: ${staffId}`, 'system').run();

            return SuccessResponse('Staff member deleted successfully');
        } else {
            return ErrorResponse('Failed to delete staff member', 500);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error deleting staff member: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
