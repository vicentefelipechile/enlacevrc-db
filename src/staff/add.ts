/**
 * @file        staff/add.ts
 * @author      vicentefelipechile
 * @description This function adds a new staff member to the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Staff } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// AddStaff Function
// =================================================================================================

/**
 * @description Adds a new staff member to the database.
 * @param {Request} request The incoming Request object containing discord_id and name in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating the result of the addition operation.
 */
export async function AddStaff(request: Request, env: Env): Promise<Response> {
    try {
        // Data extraction
        const newStaffData: Partial<Staff> = await request.json();

        // Input validation
        if (!newStaffData.discord_id || !newStaffData.name) {
            return ErrorResponse('Missing required fields: discord_id and name are required', 400);
        }

        // Variable extraction
        const {
            discord_id: discordId,
            name
        } = newStaffData;

        // Statement preparation and execution
        const statement = env.DB.prepare('INSERT INTO staff (discord_id, name) VALUES (?, ?)');
        const { success } = await statement.bind(discordId, name).run();

        // Database result handling
        if (success) {
            return SuccessResponse('Staff member added successfully', 201);
        } else {
            return ErrorResponse('Failed to add staff member. It may already exist', 409);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error adding staff member: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
