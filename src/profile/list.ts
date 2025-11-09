/**
 * @file        profile/list.ts
 * @author      vicentefelipechile
 * @description This file contains the function to list all profiles from the database with optional filtering.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// ListProfiles Function
// =================================================================================================

/**
 * @description Lists all profiles from the database with optional filtering by limit, start_date, end_date, and created_by.
 * @param {Request} request The incoming Request object containing query parameters.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A Response object containing the list of profiles or an error message.
 */
export async function ListProfiles(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Extract query parameters
        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        const startDateParam = url.searchParams.get('start_date');
        const endDateParam = url.searchParams.get('end_date');
        const createdByParam = url.searchParams.get('created_by');

        // Build dynamic query
        let query = 'SELECT * FROM profiles WHERE 1=1';
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
            query += ' AND created_by = ?';
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
        const result = await statement.bind(...params).all<Profile>();

        // Convert boolean fields
        if (result.results) {
            result.results.forEach(profile => {
                profile.is_banned = profile.is_banned === 1;
                profile.is_verified = profile.is_verified === 1;
            });
        }

        // Log the access
        await LogIt(env.DB, LogLevel.INFO, `Profiles list accessed by admin ${userId} with filters: limit=${limitParam}, start_date=${startDateParam}, end_date=${endDateParam}, created_by=${createdByParam}`);

        return JsonResponse({
            success: true,
            data: result.results || [],
            count: result.results?.length || 0,
        });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error listing profiles: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error listing profiles by ${userId}: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
