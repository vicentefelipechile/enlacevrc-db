/**
 * @file        staff/delete_staff.ts
 * @author      vicentefelipechile
 * @description This function deletes a staff member from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { validateAdmin } from '../middleware/auth';
import { Staff } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// DeleteStaff Function
// =================================================================================================

/**
 * @description Deletes a staff member from the database using the provided Discord ID.
 * @param {Request} request The incoming Request object.
 * @param {string} staffId The Discord ID of the staff member to delete.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the deletion operation.
 */
export async function DeleteStaff(request: Request, env: Env, staffId: string, userId: string): Promise<Response> {
    try {
        // Check if staff member exists first
        const checkStatement = env.DB.prepare('SELECT * FROM staff WHERE discord_id = ?');
        const staff = await checkStatement.bind(staffId).first<Staff>();

        // Input validation
        if (!staff) {
            return ErrorResponse('Staff member not found', 404);
        }

        // Admin validation
        const isAdmin = await validateAdmin(userId, env);
        if (!isAdmin) {
            return ErrorResponse('Forbidden: Only admins can delete staff members', 403);
        }

        // Statement preparation and execution
        const statement = env.DB.prepare('UPDATE staff SET is_disabled = TRUE, disabled_at = CURRENT_TIMESTAMP WHERE discord_id = ?');
        const { success } = await statement.bind(staff.discord_id).run();

        // Database result handling
        if (success) {
            const userName = request.headers.get('X-Discord-Name')!;
            await LogIt(env.DB, LogLevel.CHANGE, `Staff member deleted: ${staffId}`, userName);

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
