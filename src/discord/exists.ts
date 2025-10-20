/**
 * @file        discord/exists.ts
 * @author      vicentefelipechile
 * @description This function checks if a Discord setting exists by its Discord server ID.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DiscordSetting } from '../models';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// DiscordServerExists Function
// =================================================================================================

/**
 * @description Checks if a Discord server exists in the database by its Discord server ID.
 * @param {string} discordServerId The ID of the Discord server.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A response indicating whether the Discord server exists or not.
 */
export async function DiscordServerExists(discordServerId: string, env: Env): Promise<Response> {
    try {
        // Input validation
        if (!discordServerId) {
            return ErrorResponse('Missing required fields: discord_server_id', 400);
        }

        // Statement preparation and execution
        const statement = env.DB.prepare('SELECT 1 FROM discord_settings WHERE discord_server_id = ? LIMIT 1');
        const result = await statement.bind(discordServerId).first();

        // Database result handling
        const exists = result !== null;

        return JsonResponse({ success: true, data: { exists } });
    } catch (error) {
        console.error('Error checking Discord server existence:', error instanceof Error ? error.message : 'An unexpected error occurred');
        return ErrorResponse('Internal Server Error', 500);
    }
}
