/**
 * @file        staff/new_staff.ts
 * @author      vicentefelipechile
 * @description This function adds a new staff member to the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { validateAdmin } from '../middleware/auth';
import { Staff } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// NewStaff Function
// =================================================================================================

/**
 * @description Adds a new staff member to the database.
 * @param {Request} request The incoming Request object containing discord_id, discord_name, and added_by in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The Discord ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the addition operation.
 */
export async function NewStaff(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Admin validation
        const isAdmin = await validateAdmin(userId, env);
        if (!isAdmin) {
            return ErrorResponse('Forbidden: Only admins can add staff members', 403);
        }

        // Data extraction
        const newStaffData: Partial<Staff> = await request.json();

        // Input validation
        if (!newStaffData.discord_id || !newStaffData.added_by) {
            return ErrorResponse('Missing required fields: discord_id and added_by are required', 400);
        }

        // Validate foreign key
        const adminCheck = await env.DB.prepare('SELECT 1 FROM bot_admin WHERE admin_id = ?').bind(newStaffData.added_by).first();
        if (!adminCheck) return ErrorResponse('Invalid added_by: bot admin does not exist', 400);

        // Generate new staff ID
        const staffId = `stf_${crypto.randomUUID()}`;

        // Variable extraction
        const {
            discord_id: discordId,
            discord_name: discordName,
            added_by: addedBy
        } = newStaffData;

        // Statement preparation and execution
        const statement = env.DB.prepare('INSERT INTO staff (staff_id, discord_id, discord_name, added_by) VALUES (?, ?, ?, ?)');
        const { success } = await statement.bind(staffId, discordId, discordName, addedBy).run();

        // Database result handling
        if (success) {
            // Log the action
            const userName = request.headers.get('X-Discord-Name')!;
            await LogIt(env.DB, LogLevel.ADDITION, `New staff member added: ${discordId} by ${addedBy}`, userName);

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
