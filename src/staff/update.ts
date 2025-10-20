/**
 * @file        staff/update.ts
 * @author      vicentefelipechile
 * @description This function updates an existing staff member in the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Staff } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// UpdateStaff Function
// =================================================================================================

/**
 * @description Updates an existing staff member in the database.
 * @param {Request} request The incoming Request object containing updated fields.
 * @param {string} staffId The Discord ID of the staff member to update.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating the result of the update operation.
 */
export async function UpdateStaff(request: Request, staffId: string, env: Env): Promise<Response> {
    try {
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
        const { name } = dataStaffUpdate;

        // Input validation for updateable fields
        if (!name) {
            return ErrorResponse('No valid fields provided to update. Only name can be updated', 400);
        }

        // Statement preparation and execution
        const statement = env.DB.prepare('UPDATE staff SET name = ? WHERE discord_id = ?');
        const { success } = await statement.bind(name, staffId).run();

        // Database result handling
        if (success) {
            return SuccessResponse('Staff member updated successfully');
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
