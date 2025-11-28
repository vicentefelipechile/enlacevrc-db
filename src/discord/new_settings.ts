/**
 * @file        discord/new_settings.ts
 * @author      vicentefelipechile
 * @description Adds a new setting to the database and propagates it to all existing servers.
 */

import { ErrorResponse, SuccessResponse } from '../responses';
import { NewDiscordSetting, DiscordServer } from '../models';

/**
 * @description Adds a new setting configuration and applies it to all servers.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} The Response object.
 */
export async function NewSetting(request: Request, env: Env): Promise<Response> {
    try {
        const {
            name: settingName,
            type: settingType,
            default_value: defaultValue
        } = await request.json() as NewDiscordSetting;

        if (!settingName || !settingType || defaultValue === undefined) {
            return ErrorResponse('Missing required fields: name, type, default_value', 400);
        }

        // 1. Check if the setting already exists
        const existingSetting = await env.DB.prepare('SELECT setting_name FROM setting WHERE setting_name = ?').bind(settingName).first();

        if (existingSetting) {
            return ErrorResponse(`Setting '${settingName}' already exists`, 409);
        }

        // 2. Insert the new setting definition
        try {
            await env.DB.prepare('INSERT INTO setting (setting_name, setting_type_name, default_value) VALUES (?, ?, ?)').bind(settingName, settingType, defaultValue).run();
        } catch (e) {
            return ErrorResponse(`Failed to create setting: ${(e as Error).message}`, 500);
        }

        // 2. Get all existing discord servers
        const { results: servers } = await env.DB.prepare('SELECT * FROM discord_server').all<DiscordServer>();

        if (!servers || servers.length === 0) {
            return SuccessResponse('Setting created. No servers to update.');
        }

        // 3. Propagate the new setting to all servers
        // We can use a transaction or batch execution if supported, but for D1 batch is good.
        const statements = servers.map((server) => {
            return env.DB.prepare('INSERT INTO discord_settings (discord_server_id, setting_key, setting_value) VALUES (?, ?, ?)').bind(server.discord_server_id, settingName, defaultValue);
        });

        await env.DB.batch(statements);

        return SuccessResponse(`Setting '${settingName}' created and applied to ${servers.length} servers.`);

    } catch (e) {
        return ErrorResponse(`Internal Server Error: ${(e as Error).message}`, 500);
    }
}
