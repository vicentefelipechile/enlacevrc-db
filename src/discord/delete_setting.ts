/**
 * @file        discord/delete_setting.ts
 * @author      vicentefelipechile
 * @description This function deletes a Discord setting by its Discord server ID and setting key from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { DiscordServer, DiscordSetting } from '../models';
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
export async function DeleteSetting(request: Request, env: Env, discordServerId: string): Promise<Response> {
    try {
        // Data extraction
        const userName = request.headers.get('X-Discord-Name')!;
        const data: Partial<DiscordSetting> = await request.json();
        
        // Basic validation
        if (!data.setting_key) {
            return ErrorResponse('Missing required field: setting_key is required', 400);
        }

        // Find the generated server_id
        const server = await env.DB.prepare('SELECT 1 FROM discord_server WHERE discord_server_id = ?').bind(discordServerId).first<DiscordServer>();
        if (!server) return ErrorResponse('Invalid discord_server_id: server does not exist', 400);

        // Variable extraction
        const { setting_key: settingKey } = data;

        // Statement preparation and execution
        const statementFound = env.DB.prepare('SELECT * FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
        const dataFound = await statementFound.bind(discordServerId, settingKey).first<DiscordSetting>();
        if (!dataFound) {
            return ErrorResponse('Setting not found for the specified server', 404);
        }

        const statement = env.DB.prepare('DELETE FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
        const { success } = await statement.bind(discordServerId, settingKey).run();

        // Database result handling
        if (!success) {
            return ErrorResponse('Failed to delete Discord setting. It may not exist', 404);
        }

        await LogIt(env.DB, LogLevel.REMOVAL, `Discord setting deleted: ${settingKey} for server ${discordServerId}`, userName);
        return SuccessResponse('Setting deleted successfully');
    } catch (error) {
        return ErrorResponse('Failed to delete Discord setting', 500);
    }
}