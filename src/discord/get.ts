/**
 * @file        discord/get.ts
 * @author      vicentefelipechile
 * @description This function retrieves a Discord setting by its Discord server ID and setting key from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting3D } from '../models';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// GetDiscordSetting Function
// =================================================================================================

/**
 * @description Retrieves a Discord setting by its Discord server ID and setting key.
 * @param {Request} request The incoming Request object containing setting_key in the JSON body.
 * @param {string} discordServerId The ID of the Discord server.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response containing the Discord setting data or an error message.
 */
export async function GetDiscordSetting(request: Request, discordServerId: string, env: Env): Promise<Response> {
    // Data extraction
    const url = new URL(request.url);

    const settingKey = url.searchParams.get('setting_key');
    if (!settingKey) return ErrorResponse('Missing required query parameter: setting_key is required', 400);

    // Statement preparation and execution
    const statement = env.DB.prepare('SELECT * FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
    const result = await statement.bind(discordServerId, settingKey).first<DiscordSetting3D>();

    // Database result handling
    if (!result) {
        return ErrorResponse('Discord setting not found', 404);
    }

    return JsonResponse({ success: true, data: result });
}