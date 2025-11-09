/**
 * @file        staff/delete.ts
 * @author      vicentefelipechile
 * @description This function deletes a staff member from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { Staff } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// DeleteStaff Function
// =================================================================================================

/**
 * @description Deletes a staff member from the database using the provided Discord ID.
 * @param {string} staffId The Discord ID of the staff member to delete.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {Request} request The incoming Request object.
 * @returns {Promise<Response>} A response indicating the result of the deletion operation.
 */
export async function DeleteStaff(staffId: string, env: Env, request: Request): Promise<Response> {
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
