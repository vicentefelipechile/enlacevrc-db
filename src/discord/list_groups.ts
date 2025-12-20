/**
 * @file        discord/list_groups.ts
 * @author      vicentefelipechile
 * @description This function lists all VRChat groups associated with a Discord server.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { VRChatGroup } from '../models';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// ListGroups Function
// =================================================================================================

/**
 * @description Lists all VRChat groups for a specific Discord server.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} serverId The Discord server ID.
 * @returns {Promise<Response>} A response containing the list of groups or an error.
 */
export async function ListGroups(request: Request, env: Env, serverId: string): Promise<Response> {
    try {
        // Check if Discord server exists
        const serverExists = await env.DB.prepare(
            'SELECT discord_server_id FROM discord_server WHERE discord_server_id = ?'
        ).bind(serverId).first();

        if (!serverExists) {
            return ErrorResponse('Discord server not found', 404);
        }

        // Query to get all groups for this server
        const groups = await env.DB.prepare(`
            SELECT 
                vrchat_group_id,
                group_name,
                added_at,
                added_by
            FROM vrchat_group
            WHERE discord_server_id = ?
            ORDER BY added_at DESC
        `).bind(serverId).all<VRChatGroup>();

        return JsonResponse({
            success: true,
            data: {
                discord_server_id: serverId,
                groups: groups.results || [],
                total: groups.results?.length || 0
            }
        }, 200);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error listing VRChat groups for Discord server:', errorMessage);

        return ErrorResponse('Internal Server Error', 500);
    }
}
