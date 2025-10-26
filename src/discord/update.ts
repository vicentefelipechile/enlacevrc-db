/**
 * @file        discord/update.ts
 * @author      vicentefelipechile
 * @description This function updates a Discord setting by its Discord server ID and setting key in the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// UpdateDiscordSetting Function
// =================================================================================================

/**
 * @description Updates a Discord setting in the database.
 * @param {Request} request The incoming Request object.
 * @param {string} discordServerId The ID of the Discord server.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating the result of the update operation.
 */
export async function UpdateDiscordSetting(request: Request, discordServerId: string, env: Env): Promise<Response> {
    try {
        // Data extraction
        const data: Partial<DiscordSetting> = await request.json();

        // Basic validation
        if (!data.setting_key || !data.setting_value) {
            return ErrorResponse('Missing required fields: setting_key and setting_value are required', 400);
        }

        // Find the generated server_id
        const server = await env.DB.prepare('SELECT server_id FROM discord_server WHERE discord_server_id = ?').bind(discordServerId).first() as { server_id: string } | null;
        if (!server) return ErrorResponse('Invalid discord_server_id: server does not exist', 400);

        const settingCheck = await env.DB.prepare('SELECT 1 FROM setting WHERE setting_name = ?').bind(data.setting_key).first();
        if (!settingCheck) return ErrorResponse('Invalid setting_key: setting does not exist', 400);

        // Variable extraction
        const {
            setting_key: settingKey,
            setting_value: settingValue,
            updated_by: updatedBy = 'system'
        } = data;

        // Statement preparation and execution
        const statement = env.DB.prepare('UPDATE discord_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE discord_server_id = ? AND setting_key = ?');
        const { success } = await statement.bind(settingValue, updatedBy, server.server_id, settingKey).run();

        // Database result handling
        if (success) {
            // Log the action
            const logStmt = env.DB.prepare('INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)');
            await logStmt.bind(1, `Discord setting updated: ${settingKey} for server ${discordServerId}`, 'system').run();

            return SuccessResponse('Discord setting updated', 200);
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