/**
 * @file        discord/update_setting.ts
 * @author      vicentefelipechile
 * @description This function updates a Discord setting by its Discord server ID and setting key in the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { DiscordServer, DiscordSetting, Setting } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// UpdateSetting Function
// =================================================================================================

/**
 * @description Updates a Discord setting in the database.
 * @param {Request} request The incoming Request object.
 * @param {string} discordServerId The ID of the Discord server.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating the result of the update operation.
 */
export async function UpdateSetting(request: Request, env: Env, discordServerId: string): Promise<Response> {
    try {
        // Data extraction
        const data: Partial<DiscordSetting> = await request.json();
        const userId = request.headers.get('X-Discord-ID')!;
        const userName = request.headers.get('X-Discord-Name')!;

        // Basic validation
        if (!data.setting_key || !data.setting_value) {
            return ErrorResponse('Missing required fields: setting_key and setting_value are required', 400);
        }

        // Find the generated discord_server_id
        const server = await env.DB.prepare('SELECT 1 FROM discord_server WHERE discord_server_id = ?').bind(discordServerId).first<DiscordServer>();
        if (!server) return ErrorResponse('Invalid discord_server_id: server does not exist', 400);

        const settingCheck = await env.DB.prepare('SELECT 1 FROM setting WHERE setting_name = ?').bind(data.setting_key).first<Setting>();
        if (!settingCheck) return ErrorResponse('Invalid setting_key: setting does not exist', 400);

        // Variable extraction
        const {
            setting_key: settingKey,
            setting_value: settingValue,
        } = data;

        // Statement preparation and execution
        const statement = env.DB.prepare('UPDATE discord_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE discord_server_id = ? AND setting_key = ?');
        const { success } = await statement.bind(settingValue, userId, discordServerId, settingKey).run();

        // Database result handling
        if (success) {
            await LogIt(env.DB, LogLevel.CHANGE, `Discord setting '${settingKey}' updated to '${settingValue}' for server ID ${discordServerId} by user ID ${userId}`, userName);
            return SuccessResponse('Discord setting updated successfully', 200);
        } else {
            return ErrorResponse('Failed to update Discord setting', 500);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error updating Discord setting: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}