/**
 * @file        staff/list_staff.ts
 * @author      vicentefelipechile
 * @description This function lists all staff members from the database with optional filtering.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { validateAdmin } from '../middleware/auth';
import { Staff } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// ListStaff Function
// =================================================================================================

/**
 * @description Lists all staff members from the database with optional filtering by limit, start_date, end_date, and created_by.
 * @param {Request} request The incoming Request object containing query parameters.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A Response object containing the list of staff members or an error message.
 */
export async function ListStaff(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Admin validation
        const isAdmin = await validateAdmin(userId, env);
        if (!isAdmin) {
            return ErrorResponse('Forbidden: Only admins can list staff members', 403);
        }

        // Extract query parameters
        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        const startDateParam = url.searchParams.get('start_date');
        const endDateParam = url.searchParams.get('end_date');
        const createdByParam = url.searchParams.get('created_by');

        // Build dynamic query
        let query = 'SELECT * FROM staff WHERE 1=1';
        const params: (string | number)[] = [];

        // Add filters based on query parameters
        if (startDateParam) {
            query += ' AND added_at >= ?';
            params.push(startDateParam);
        }

        if (endDateParam) {
            query += ' AND added_at <= ?';
            params.push(endDateParam);
        }

        if (createdByParam) {
            query += ' AND added_by = ?';
            params.push(createdByParam);
        }

        // Add ordering
        query += ' ORDER BY added_at DESC';

        // Add limit
        if (limitParam) {
            const limit = parseInt(limitParam, 10);
            if (isNaN(limit) || limit <= 0) {
                return ErrorResponse('Invalid limit parameter. Must be a positive integer', 400);
            }
            query += ' LIMIT ?';
            params.push(limit);
        }

        // Statement preparation and execution
        const statement = env.DB.prepare(query);
        const result = await statement.bind(...params).all<Staff>();

        // Log the access
        const userName = request.headers.get('X-Discord-Name')!;
        await LogIt(env.DB, LogLevel.INFO, `Staff list accessed by user ${userName} (${userId}) with filters: limit=${limitParam}, start_date=${startDateParam}, end_date=${endDateParam}, created_by=${createdByParam}`, userName);

        return JsonResponse({
            success: true,
            data: result.results || [],
        });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error listing staff: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error listing staff by ${userId}: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
