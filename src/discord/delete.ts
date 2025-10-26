/**
 * @file        discord/delete.ts
 * @author      vicentefelipechile
 * @description This function deletes a Discord setting by its Discord server ID and setting key from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// DeleteDiscordSetting Function
// =================================================================================================

/**
 * @description Deletes a Discord setting using its Discord server ID and setting key from the database.
 * @param {Request} request The incoming Request object containing setting_key in the JSON body.
 * @param {string} discordServerId The ID of the Discord server.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating the result of the delete operation.
 */
export async function DeleteDiscordSetting(request: Request, discordServerId: string, env: Env): Promise<Response> {
    try {
        // Data extraction
        const data: Partial<DiscordSetting> = await request.json();
        
        // Basic validation
        if (!data.setting_key) {
            return ErrorResponse('Missing required field: setting_key is required', 400);
        }

        // Find the generated server_id
        const server = await env.DB.prepare('SELECT server_id FROM discord_server WHERE discord_server_id = ?').bind(discordServerId).first() as { server_id: string } | null;
        if (!server) return ErrorResponse('Invalid discord_server_id: server does not exist', 400);

        // Variable extraction
        const { setting_key: settingKey } = data;

        // Statement preparation and execution
        const statementFound = env.DB.prepare('SELECT * FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
        const dataFound = await statementFound.bind(server.server_id, settingKey).first<DiscordSetting>();
        if (!dataFound) {
            return ErrorResponse('Discord setting not found', 404);
        }

        const statement = env.DB.prepare('DELETE FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
        const { success } = await statement.bind(server.server_id, settingKey).run();

        // Database result handling
        if (!success) {
            return ErrorResponse('Failed to delete Discord setting. It may not exist', 404);
        }

        // Log the action
        const logStmt = env.DB.prepare('INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)');
        await logStmt.bind(1, `Discord setting deleted: ${settingKey} for server ${discordServerId}`, 'system').run();

        return SuccessResponse('Discord setting deleted');
    } catch (error) {
        return ErrorResponse('Failed to delete Discord setting', 500);
    }
}