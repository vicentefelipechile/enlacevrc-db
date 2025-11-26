/**
 * @file        discord/add_server.ts
 * @author      vicentefelipechile
 * @description This function adds a new Discord server and automatically populates all existing settings from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { DiscordServer, Setting } from '../models';
import { ErrorResponse, JsonResponse } from '../responses';

// =================================================================================================
// AddServer Function
// =================================================================================================

/**
 * @description Adds a new Discord server to the database and automatically populates all existing settings
 * from the database for that server.
 * @param {Request} request The incoming Request object containing discord_server_id and server_name in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A response indicating the result of the server addition and settings population.
 */
export async function AddServer(request: Request, env: Env, userId: string): Promise<Response> {
    try {
        // Data extraction
        const data: Partial<DiscordServer> = await request.json();

        // Input validation
        if (!data.discord_server_id || !data.server_name) {
            return ErrorResponse('Missing required fields: discord_server_id and server_name are required', 400);
        }

        // Variable extraction
        const {
            discord_server_id: discordServerId,
            server_name: serverName
        } = data;

        // Check if server already exists
        const existingServer = await env.DB.prepare(
            'SELECT discord_server_id FROM discord_server WHERE discord_server_id = ?'
        ).bind(discordServerId).first<{ discord_server_id: string } | null>();

        if (existingServer) {
            return ErrorResponse('Discord server already exists', 409);
        }

        // Statement preparation for adding the server
        const addServerStatement = env.DB.prepare(
            'INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES (?, ?, ?)'
        );
        const { success: serverInsertSuccess } = await addServerStatement.bind(discordServerId, serverName, userId).run();

        if (!serverInsertSuccess) {
            return ErrorResponse('Failed to add Discord server', 409);
        }

        // Retrieve all settings from the database
        const settings = await env.DB.prepare(
            'SELECT setting_name, default_value FROM setting WHERE is_disabled = 0'
        ).all<Setting>();

        if (!settings.results || settings.results.length === 0) {
            // Server added but no settings to populate
            await LogIt(env.DB, LogLevel.ADDITION, `Discord server added: ${serverName} (${discordServerId}) with no settings to populate`, userId);
            return JsonResponse({
                success: true,
                message: 'Discord server added successfully with no settings to populate',
                data: {
                    discord_server_id: discordServerId,
                    server_name: serverName,
                    settings_added: 0
                }
            }, 201);
        }

        // Prepare batch insertion of all settings for the new server
        const settingsArray = settings.results;
        let settingsAddedCount = 0;

        for (const setting of settingsArray) {
            try {
                const { setting_name: settingName, default_value: defaultValue } = setting;
                
                const addSettingStatement = env.DB.prepare(
                    'INSERT INTO discord_settings (discord_server_id, setting_key, setting_value, updated_by) VALUES (?, ?, ?, ?)'
                );
                const { success: settingInsertSuccess } = await addSettingStatement
                    .bind(discordServerId, settingName, defaultValue, userId)
                    .run();

                if (settingInsertSuccess) {
                    settingsAddedCount++;
                }
            } catch (settingError) {
                const errorMessage = settingError instanceof Error ? settingError.message : 'Unknown error';
                console.warn(`Warning: Failed to add setting ${setting.setting_name} for server ${discordServerId}: ${errorMessage}`);
            }
        }

        // Log the action
        await LogIt(
            env.DB,
            LogLevel.ADDITION,
            `Discord server added: ${serverName} (${discordServerId}) with ${settingsAddedCount} settings populated`,
            userId
        );

        return JsonResponse({
            success: true,
            message: 'Discord server added successfully with all settings populated',
            data: {
                discord_server_id: discordServerId,
                server_name: serverName,
                settings_added: settingsAddedCount,
                total_settings: settingsArray.length
            }
        }, 201);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error adding Discord server: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}
