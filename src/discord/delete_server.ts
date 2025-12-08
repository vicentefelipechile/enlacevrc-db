/**
 * @file        discord/delete_server.ts
 * @author      vicentefelipechile
 * @description This function deletes a Discord server and all its associated settings from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { DiscordServer } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// DeleteServer Function
// =================================================================================================

/**
 * @description Deletes a Discord server and all its associated settings from the database.
 * First deletes all discord_settings for the server, then deletes the server itself.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} serverId The Discord server ID to delete.
 * @param {string} userId The ID of the user performing the deletion.
 * @returns {Promise<Response>} A response indicating the result of the deletion operation.
 */
export async function DeleteServer(request: Request, env: Env, serverId: string, userId: string): Promise<Response> {
    try {
        // Validate that the server exists
        const server = await env.DB.prepare('SELECT discord_server_id, server_name FROM discord_server WHERE discord_server_id = ?').bind(serverId).first() as DiscordServer | null;

        if (!server) {
            return ErrorResponse('Discord server not found', 404);
        }

        // Step 1: Clear verified_from references in profiles
        const clearProfileReferencesStatement = env.DB.prepare('UPDATE profiles SET verified_from = NULL WHERE verified_from = ?');
        const { success: profilesUpdateSuccess } = await clearProfileReferencesStatement.bind(server.discord_server_id).run();

        if (!profilesUpdateSuccess) {
            return ErrorResponse('Failed to update profile references', 409);
        }

        // Step 2: Delete all discord_settings for this server
        const deleteSettingsStatement = env.DB.prepare('DELETE FROM discord_settings WHERE discord_server_id = ?');
        const { success: settingsDeleteSuccess } = await deleteSettingsStatement.bind(server.discord_server_id).run();

        if (!settingsDeleteSuccess) {
            return ErrorResponse('Failed to delete server settings', 409);
        }

        // Step 3: Delete the discord_server itself
        const deleteServerStatement = env.DB.prepare('DELETE FROM discord_server WHERE discord_server_id = ?');
        const { success: serverDeleteSuccess } = await deleteServerStatement.bind(server.discord_server_id).run();

        if (!serverDeleteSuccess) {
            return ErrorResponse('Failed to delete Discord server', 409);
        }

        // Log the action
        await LogIt(env.DB, LogLevel.REMOVAL, `Discord server deleted: ${server.server_name} (${server.discord_server_id}) with all associated settings`, userId);

        return SuccessResponse('Discord server deleted successfully', 200);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        await LogIt(env.DB, LogLevel.ERROR, `Error deleting Discord server ${serverId}: ${errorMessage}`, userId);

        if (errorMessage.includes('D1_ERROR')) {
            console.error(errorMessage);
        }

        return ErrorResponse('Internal Server Error', 500);
    }
}
