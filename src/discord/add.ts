/**
 * @file        discord/add.ts
 * @author      vicentefelipechile
 * @description This function adds a new Discord setting to the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// AddDiscordSetting Function
// =================================================================================================

/**
 * @description Adds a new Discord setting by its Discord server ID, setting key, and setting value to the database.
 * @param {Request} request The incoming Request object containing setting_key and setting_value in the JSON body.
 * @param {string} discordServerId The real Discord server ID.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating the result of the addition operation.
 */
export async function AddDiscordSetting(request: Request, discordServerId: string, env: Env): Promise<Response> {
    try {
        // Data extraction
        const data: Partial<DiscordSetting> = await request.json();

        // Basic validation
        if (!data.setting_key || !data.setting_value) {
            return ErrorResponse('Missing required fields: setting_key and setting_value are required', 400);
        }

        // Validate and ensure server exists
        let server = await env.DB.prepare('SELECT server_id FROM discord_server WHERE discord_server_id = ?').bind(discordServerId).first() as { server_id: string } | null;
        if (!server) {
            // Server does not exist, add it
            const generatedServerId = `srv_${crypto.randomUUID()}`;
            const insertServer = env.DB.prepare('INSERT INTO discord_server (server_id, discord_server_id, server_name, added_by) VALUES (?, ?, ?, ?)');
            await insertServer.bind(generatedServerId, discordServerId, 'Unknown Server', 'system').run();
            server = { server_id: generatedServerId };
        }

        const settingCheck = await env.DB.prepare('SELECT 1 FROM setting WHERE setting_name = ?').bind(data.setting_key).first();
        if (!settingCheck) return ErrorResponse('Invalid setting_key: setting does not exist', 400);

        // Generate new discord setting ID
        const discordSettingId = `dst_${crypto.randomUUID()}`;

        // Variable extraction
        const {
            setting_key: settingKey,
            setting_value: settingValue,
            updated_by: updatedBy = 'system'
        } = data;

        // Statement preparation and execution
        const statement = env.DB.prepare('INSERT INTO discord_settings (discord_setting_id, discord_server_id, setting_key, setting_value, updated_by) VALUES (?, ?, ?, ?, ?)');
        const { success } = await statement.bind(discordSettingId, server.server_id, settingKey, settingValue, updatedBy).run();

        // Database result handling
        if (!success) {
            return ErrorResponse('Failed to add Discord setting', 409);
        }

        // Log the action
        const logStmt = env.DB.prepare('INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)');
        await logStmt.bind(1, `Discord setting added: ${settingKey} for server ${discordServerId}`, 'system').run();

        return SuccessResponse('Discord setting added successfully', 201);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error adding Discord setting: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}