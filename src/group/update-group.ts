/**
 * @file        group/update-group.ts
 * @author      vicentefelipechile
 * @description This function updates a VRChat group's information.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { VRChatGroup } from '../models';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// UpdateGroup Function
// =================================================================================================

/**
 * @description Updates a VRChat group's name in the database.
 * @param {Request} request The incoming Request object containing group_name in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} groupId The VRChat group ID to update.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the update.
 */
export async function UpdateGroup(request: Request, env: Env, groupId: string, userId: string): Promise<Response> {
    try {
        // Data extraction
        const data: Partial<VRChatGroup> = await request.json();

        // Input validation
        if (!data.group_name) {
            return ErrorResponse('Missing required field: group_name', 400);
        }

        const { group_name: groupName } = data;

        // Check if group exists
        const existingGroup = await env.DB.prepare(
            'SELECT vrchat_group_id, group_name FROM vrchat_group WHERE vrchat_group_id = ?'
        ).bind(groupId).first() as { vrchat_group_id: string; group_name: string } | null;

        if (!existingGroup) {
            return ErrorResponse('VRChat group not found', 404);
        }

        // Update the group name
        const updateStatement = env.DB.prepare(
            'UPDATE vrchat_group SET group_name = ? WHERE vrchat_group_id = ?'
        );
        const { success: updateSuccess } = await updateStatement.bind(groupName, groupId).run();

        if (!updateSuccess) {
            return ErrorResponse('Failed to update VRChat group', 409);
        }

        // Log the action
        await LogIt(
            env.DB,
            LogLevel.CHANGE,
            `VRChat group updated: ${groupId} - name changed from "${existingGroup.group_name}" to "${groupName}"`,
            userId
        );

        return JsonResponse({
            success: true,
            message: 'VRChat group updated successfully',
            data: {
                vrchat_group_id: groupId,
                group_name: groupName
            }
        }, 200);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        await LogIt(env.DB, LogLevel.ERROR, `Error updating VRChat group: ${errorMessage}`, userId);

        return ErrorResponse('Internal Server Error', 500);
    }
}
