/**
 * @file        discord/list.ts
 * @author      vicentefelipechile
 * @description This file contains the function to list all Discord settings from the database with optional filtering.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// ListDiscordSettings Function
// =================================================================================================

/**
 * @description Lists all Discord settings from the database with optional filtering by limit, start_date, end_date, and created_by.
 * @param {Request} request The incoming Request object containing query parameters.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A Response object containing the list of Discord settings or an error message.
 */
export async function ListDiscordSettings(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Extract query parameters
        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        const startDateParam = url.searchParams.get('start_date');
        const endDateParam = url.searchParams.get('end_date');
        const createdByParam = url.searchParams.get('created_by');

        // Build dynamic query
        let query = 'SELECT * FROM discord_setting WHERE 1=1';
        const params: (string | number)[] = [];

        // Add filters based on query parameters
        if (startDateParam) {
            query += ' AND created_at >= ?';
            params.push(startDateParam);
        }

        if (endDateParam) {
            query += ' AND created_at <= ?';
            params.push(endDateParam);
        }

        if (createdByParam) {
            query += ' AND updated_by = ?';
            params.push(createdByParam);
        }

        // Add ordering
        query += ' ORDER BY created_at DESC';

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
        const result = await statement.bind(...params).all<DiscordSetting>();

        // Log the access
        await LogIt(env.DB, LogLevel.INFO, `Discord settings list accessed by user ${userId} with filters: limit=${limitParam}, start_date=${startDateParam}, end_date=${endDateParam}, created_by=${createdByParam}`);

        return JsonResponse({
            success: true,
            data: result.results || [],
            count: result.results?.length || 0,
        });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error listing Discord settings: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error listing Discord settings by ${userId}: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
