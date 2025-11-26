/**
 * @file        discord/list_servers.ts
 * @author      vicentefelipechile
 * @description This function retrieves all Discord servers from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordServer } from '../models';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// ListServers Function
// =================================================================================================

/**
 * @description Retrieves all Discord servers from the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response containing an array of all Discord servers.
 */
export async function ListServers(request: Request, env: Env): Promise<Response> {
    try {
        // Statement preparation
        const statement = env.DB.prepare(
            'SELECT discord_server_id, server_name FROM discord_server ORDER BY added_at DESC'
        );

        // Statement execution
        const result = await statement.all() as { results: DiscordServer[] };

        // Result handling
        if (!result.results) {
            return JsonResponse({
                success: true,
                data: []
            }, 200);
        }

        // Format the response data
        const servers = result.results.map((server: { discord_server_id: string; server_name: string }) => ({
            discord_server_id: server.discord_server_id,
            discord_server_name: server.server_name
        }));

        return JsonResponse({
            success: true,
            data: servers
        }, 200);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error listing Discord servers: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
