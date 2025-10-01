/**
 * @file        discord/update.ts
 * @author      vicentefelipechile
 * @description This function updates a Discord setting by its Discord server ID and setting key in the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting3D } from '../models';
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
        const data: Partial<DiscordSetting3D> = await request.json();

        // Basic validation
        if (!data.setting_key || !data.setting_value) {
            return ErrorResponse('Missing required fields: setting_key and setting_value are required', 400);
        }

        // Variable extraction
        const {
            setting_key: settingKey,
            setting_value: settingValue
        } = data;

        // Statement preparation and execution
        const statement = env.DB.prepare('UPDATE discord_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_server_id = ? AND setting_key = ?');
        await statement.bind(settingValue, discordServerId, settingKey).run();

        // Database result handling
        return SuccessResponse('Discord setting updated', 200);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error updating profile: ${errorMessage}`);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}