/**
 * @file        discord/list_settings.ts
 * @author      vicentefelipechile
 * @description This function lists all Discord settings from the database with optional filtering.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// ListSettings Function
// =================================================================================================

/**
 * @description Lists all Discord settings from the database for a specific server with optional filtering.
 * @param {Request} request The incoming Request object containing query parameters.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string} serverId The Discord server ID to filter settings.
 * @returns {Promise<Response>} A response containing the list of Discord settings or an error message.
 */
export async function ListSettings(request: Request, env: Env, userId: string, serverId: string): Promise<Response> {
    try {
        // Extract query parameters
        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        const startDateParam = url.searchParams.get('start_date');
        const endDateParam = url.searchParams.get('end_date');
        const createdByParam = url.searchParams.get('created_by');

        // Build dynamic query with server filter
        let query = 'SELECT * FROM discord_settings WHERE discord_server_id = ?';
        const params: (string | number)[] = [serverId];

        // Add filters based on query parameters
        if (startDateParam && endDateParam) {
            query += ' AND created_at BETWEEN ? AND ?';
            params.push(startDateParam);
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
        await LogIt(env.DB, LogLevel.INFO, `Discord settings list accessed by user ${userId} for server ${serverId} with filters: limit=${limitParam}, start_date=${startDateParam}, end_date=${endDateParam}, created_by=${createdByParam}`);

        return JsonResponse({
            success: true,
            data: result.results || [],
            count: result.results?.length || 0,
        });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error listing Discord settings for server ${serverId}: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error listing Discord settings for server ${serverId} by ${userId}: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
