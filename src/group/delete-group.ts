/**
 * @file        group/delete-group.ts
 * @author      vicentefelipechile
 * @description This function deletes a VRChat group from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// DeleteGroup Function
// =================================================================================================

/**
 * @description Deletes a VRChat group from the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} groupId The VRChat group ID to delete.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the deletion.
 */
export async function DeleteGroup(request: Request, env: Env, groupId: string, userId: string): Promise<Response> {
    try {
        // Check if group exists
        const existingGroup = await env.DB.prepare(
            'SELECT vrchat_group_id, group_name, discord_server_id FROM vrchat_group WHERE vrchat_group_id = ?'
        ).bind(groupId).first() as { vrchat_group_id: string; group_name: string; discord_server_id: string } | null;

        if (!existingGroup) {
            return ErrorResponse('VRChat group not found', 404);
        }

        // Delete the group
        const deleteStatement = env.DB.prepare(
            'DELETE FROM vrchat_group WHERE vrchat_group_id = ?'
        );
        const { success: deleteSuccess } = await deleteStatement.bind(groupId).run();

        if (!deleteSuccess) {
            return ErrorResponse('Failed to delete VRChat group', 409);
        }

        // Log the action
        await LogIt(
            env.DB,
            LogLevel.REMOVAL,
            `VRChat group deleted: ${existingGroup.group_name} (${groupId}) from Discord server ${existingGroup.discord_server_id}`,
            userId
        );

        return JsonResponse({
            success: true,
            message: 'VRChat group deleted successfully',
            data: {
                vrchat_group_id: groupId,
                group_name: existingGroup.group_name
            }
        }, 200);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        await LogIt(env.DB, LogLevel.ERROR, `Error deleting VRChat group: ${errorMessage}`, userId);

        return ErrorResponse('Internal Server Error', 500);
    }
}
