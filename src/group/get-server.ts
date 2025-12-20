/**
 * @file        group/get-server.ts
 * @author      vicentefelipechile
 * @description This function retrieves the Discord server associated with a VRChat group.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// GetServer Function
// =================================================================================================

/**
 * @description Retrieves the Discord server information for a specific VRChat group.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} groupId The VRChat group ID.
 * @returns {Promise<Response>} A response containing the Discord server details or an error.
 */
export async function GetServer(request: Request, env: Env, groupId: string): Promise<Response> {
    try {
        // Query to get Discord server info for this group
        const result = await env.DB.prepare(`
            SELECT 
                vg.vrchat_group_id,
                vg.group_name,
                ds.discord_server_id,
                ds.server_name,
                vg.added_at,
                vg.added_by
            FROM vrchat_group vg
            INNER JOIN discord_server ds ON vg.discord_server_id = ds.discord_server_id
            WHERE vg.vrchat_group_id = ?
        `).bind(groupId).first();

        if (!result) {
            return ErrorResponse('VRChat group not found', 404);
        }

        return JsonResponse({
            success: true,
            data: result
        }, 200);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error retrieving Discord server for VRChat group:', errorMessage);

        return ErrorResponse('Internal Server Error', 500);
    }
}
