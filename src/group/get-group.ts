/**
 * @file        group/get-group.ts
 * @author      vicentefelipechile
 * @description This function retrieves detailed information about a specific VRChat group.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// GetGroup Function
// =================================================================================================

/**
 * @description Retrieves details of a specific VRChat group by its ID.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} groupId The VRChat group ID to retrieve.
 * @returns {Promise<Response>} A response containing the group details or an error.
 */
export async function GetGroup(request: Request, env: Env, groupId: string): Promise<Response> {
    try {
        // Query to get group details with Discord server information
        const group = await env.DB.prepare(`
            SELECT 
                vg.vrchat_group_id,
                vg.group_name,
                vg.discord_server_id,
                ds.server_name,
                vg.added_at,
                vg.added_by
            FROM vrchat_group vg
            INNER JOIN discord_server ds ON vg.discord_server_id = ds.discord_server_id
            WHERE vg.vrchat_group_id = ?
        `).bind(groupId).first();

        if (!group) {
            return ErrorResponse('VRChat group not found', 404);
        }

        return JsonResponse({
            success: true,
            data: group
        }, 200);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error retrieving VRChat group:', errorMessage);

        return ErrorResponse('Internal Server Error', 500);
    }
}
