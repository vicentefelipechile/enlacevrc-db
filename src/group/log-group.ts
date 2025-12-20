/**
 * @file        group/log-group.ts
 * @author      vicentefelipechile
 * @description This function adds a log entry for an existing VRChat group.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// LogGroup Function
// =================================================================================================

/**
 * @description Creates a log entry for an existing VRChat group with an incremental log_id.
 * @param {Request} request The incoming Request object containing vrchat_group_id, discord_server_id, and action_description in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the log creation.
 */
export async function LogGroup(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Data extraction
        const data = await request.json() as {
            vrchat_group_id?: string;
            discord_server_id?: string;
            action_description?: string;
        };

        // Input validation
        if (!data.vrchat_group_id || !data.discord_server_id || !data.action_description) {
            return ErrorResponse('Missing required fields: vrchat_group_id, discord_server_id, and action_description are required', 400);
        }

        // Variable extraction
        const {
            vrchat_group_id: vrchatGroupId,
            discord_server_id: discordServerId,
            action_description: actionDescription
        } = data;

        // Check if the VRChat group exists for this Discord server
        const existingGroup = await env.DB.prepare(`
            SELECT vrchat_group_id, group_name 
            FROM vrchat_group 
            WHERE vrchat_group_id = ? AND discord_server_id = ?
        `).bind(vrchatGroupId, discordServerId).first<{ vrchat_group_id: string; group_name: string }>();

        if (!existingGroup) {
            return ErrorResponse('VRChat group does not exist for this Discord server', 404);
        }

        // Get the latest log_id for this specific vrchat_group_id and discord_server_id combination
        const resultPreviousLogId = await env.DB.prepare(`
            SELECT
                COALESCE(MAX(log_id), 0) AS max_log_id
            FROM
                vrchat_group_log
            WHERE
                vrchat_group_id = ? AND
                discord_server_id = ?
        `).bind(vrchatGroupId, discordServerId).first<{ max_log_id: number }>();

        const previousLogId = resultPreviousLogId?.max_log_id ?? 0;
        const newLogId = previousLogId + 1;

        // Insert the new log entry
        const logStatement = env.DB.prepare(`
            INSERT INTO vrchat_group_log (
                log_id,
                vrchat_group_id,
                discord_server_id,
                group_name,
                action_description,
                added_by
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const { success: logInsertSuccess } = await logStatement.bind(
            newLogId,
            vrchatGroupId,
            discordServerId,
            existingGroup.group_name,
            actionDescription,
            userId
        ).run();

        if (!logInsertSuccess) {
            return ErrorResponse('Failed to create log entry', 500);
        }

        // Log the action to the general log
        await LogIt(
            env.DB,
            LogLevel.ADDITION,
            `Log entry created for VRChat group ${existingGroup.group_name} (${vrchatGroupId}) on Discord server ${discordServerId}`,
            userId
        );

        // Return the response
        return JsonResponse({
            success: true,
            message: 'Log entry created successfully',
            data: {
                log_id: newLogId,
                vrchat_group_id: vrchatGroupId,
                discord_server_id: discordServerId,
                action_description: actionDescription
            }
        }, 201);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        await LogIt(env.DB, LogLevel.ERROR, `Error creating log entry: ${errorMessage}`, userId);

        return ErrorResponse('Internal Server Error', 500);
    }
}
