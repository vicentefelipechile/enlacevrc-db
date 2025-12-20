/**
 * @file        group/add-group.ts
 * @author      vicentefelipechile
 * @description This function adds a new VRChat group to a Discord server.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { VRChatGroup } from '../models';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// AddGroup Function
// =================================================================================================

/**
 * @description Adds a new VRChat group to a Discord server in the database.
 * @param {Request} request The incoming Request object containing vrchat_group_id, discord_server_id, and group_name in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the group addition.
 */
export async function AddGroup(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Data extraction
        const data: Partial<VRChatGroup> = await request.json();

        // Input validation
        if (!data.vrchat_group_id || !data.discord_server_id || !data.group_name) {
            return ErrorResponse('Missing required fields: vrchat_group_id, discord_server_id, and group_name are required', 400);
        }

        // Variable extraction
        const {
            vrchat_group_id: vrchatGroupId,
            discord_server_id: discordServerId,
            group_name: groupName
        } = data;

        // Check if Discord server exists
        const existingServer = await env.DB.prepare(
            'SELECT discord_server_id FROM discord_server WHERE discord_server_id = ?'
        ).bind(discordServerId).first() as { discord_server_id: string } | null;

        if (!existingServer) {
            return ErrorResponse('Discord server does not exist', 404);
        }

        // Check if group already exists for this server
        const existingGroup = await env.DB.prepare(
            'SELECT vrchat_group_id FROM vrchat_group WHERE vrchat_group_id = ? AND discord_server_id = ?'
        ).bind(vrchatGroupId, discordServerId).first() as { vrchat_group_id: string } | null;

        if (existingGroup) {
            return ErrorResponse('VRChat group already exists for this Discord server', 409);
        }

        // Statement preparation for adding the group
        const addGroupStatement = env.DB.prepare(
            'INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)'
        );
        const { success: groupInsertSuccess } = await addGroupStatement.bind(vrchatGroupId, discordServerId, groupName, userId).run();

        if (!groupInsertSuccess) {
            return ErrorResponse('Failed to add VRChat group', 409);
        }

        // Log the action
        await LogIt(
            env.DB,
            LogLevel.ADDITION,
            `VRChat group added: ${groupName} (${vrchatGroupId}) to Discord server ${discordServerId}`,
            userId
        );

        return JsonResponse({
            success: true,
            message: 'VRChat group added successfully',
            data: {
                vrchat_group_id: vrchatGroupId,
                discord_server_id: discordServerId,
                group_name: groupName
            }
        }, 201);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        await LogIt(env.DB, LogLevel.ERROR, `Error adding VRChat group: ${errorMessage}`, userId);

        return ErrorResponse('Internal Server Error', 500);
    }
}
