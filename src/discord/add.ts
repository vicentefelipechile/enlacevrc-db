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
 * @param {string} discordServerId The ID of the Discord server.
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

        // Variable extraction
        const {
            setting_key: settingKey,
            setting_value: settingValue
        } = data;

        // Statement preparation and execution
        const statement = env.DB.prepare('INSERT INTO discord_settings (discord_server_id, setting_key, setting_value) VALUES (?, ?, ?)');
        const { success } = await statement.bind(discordServerId, settingKey, settingValue).run();

        // Database result handling
        if (!success) {
            return ErrorResponse('Failed to add Discord setting', 409);
        }

        return SuccessResponse('Discord setting added successfully', 201);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error adding Discord setting: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}