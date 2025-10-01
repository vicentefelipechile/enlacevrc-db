/**
 * @file        discord/get.ts
 * @author      vicentefelipechile
 * @description This function retrieves a Discord setting by its Discord server ID and setting key from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// Type Definitions
// =================================================================================================

type SettingKeyValue = Record<string, string>

// =================================================================================================
// GetDiscordSetting Function
// =================================================================================================

/**
 * @description Retrieves Discord settings by Discord server ID. Can retrieve a specific setting 
 * by setting_key or all settings if getallsettings=true is provided.
 * @param {Request} request The incoming Request object.
 * @param {string} discordServerId The ID of the Discord server.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response containing the Discord setting(s) data or an error message.
 */
export async function GetDiscordSetting(request: Request, discordServerId: string, env: Env): Promise<Response> {
    try {
        // Data extraction
        const url = new URL(request.url);
        const getAllSettings = url.searchParams.get('getallsettings');

        // All settings retrieval
        if (getAllSettings === 'true') {
            // Statement preparation and execution
            const statement = env.DB.prepare('SELECT setting_key, setting_value FROM discord_settings WHERE discord_server_id = ?');
            const result = await statement.bind(discordServerId).all<SettingKeyValue>();

            // Database result handling
            if (!result.success || result.results.length === 0) {
                return ErrorResponse('No Discord settings found for this server', 404);
            }

            // Transform results into a dictionary: { setting_key: setting_value }
            const settingsDict: SettingKeyValue = {};
            for (const { setting_key, setting_value } of result.results) {
                settingsDict[setting_key] = setting_value;
            }

            return JsonResponse({ success: true, data: settingsDict });
        }

        // Original behavior
        const settingKey = url.searchParams.get('setting_key');
        if (!settingKey) return ErrorResponse('Missing required query parameter: setting_key is required', 400);

        // Statement preparation and execution
        const statement = env.DB.prepare('SELECT setting_value FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
        const result = await statement.bind(discordServerId, settingKey).first<SettingKeyValue>();

        // Database result handling
        if (!result) {
            return ErrorResponse('Discord setting not found', 404);
        }

        return JsonResponse({ success: true, data: { [settingKey]: result.setting_value } });
    } catch (error) {
        console.error('Error retrieving Discord setting(s):', error instanceof Error ? error.message : 'An unexpected error occurred');
        return ErrorResponse('Internal Server Error', 500);
    }
}