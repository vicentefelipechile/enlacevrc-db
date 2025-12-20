/**
 * @file        discord/_handler.ts
 * @author      vicentefelipechile
 * @description This file handles routing for discord-related endpoints.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse } from '../responses';
import { GetSetting } from './get_setting';
import { ListSettings } from './list_settings';
import { UpdateSetting } from './update_setting';
import { ServerExists } from './exists_server';
import { AddServer } from './add_server';
import { ListServers } from './list_servers';
import { NewSetting } from './new_settings';
import { ListGroups } from './list_groups';

// =================================================================================================
// DiscordHandler Function
// =================================================================================================

/**
 * @description Routes discord-related requests to the appropriate handler based on the action.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string | undefined} serverId The Discord server ID.
 * @param {string | undefined} action The action to perform.
 * @returns {Promise<Response>} The Response from the executed handler.
 */
export async function DiscordHandler(request: Request, env: Env, userId: string, serverId: string | undefined, action: string | undefined): Promise<Response> {
    // Special case: serverId is specified as action
    if (!action && serverId) {
        action = serverId;

        switch (action) {
            case 'list-servers':
                if (request.method !== 'GET') {
                    return ErrorResponse(`Method ${request.method} not allowed for /discord/list-servers`, 405);
                }
                return ListServers(request, env);

            case 'add-server':
                if (request.method !== 'POST') {
                    return ErrorResponse(`Method ${request.method} not allowed for /discord/add-server`, 405);
                }
                return AddServer(request, env, userId);

            case 'new-setting':
                if (request.method !== 'POST') {
                    return ErrorResponse(`Method ${request.method} not allowed for /discord/new-setting`, 405);
                }
                return NewSetting(request, env);
        }
    }

    // Require both serverId and action for all operations
    if (!serverId || !action) {
        return ErrorResponse('Invalid discord endpoint', 400);
    }

    // Handle actions that require a server ID
    switch (action) {
        case 'add-server':
            if (request.method !== 'POST') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/add-server`, 405);
            }
            return AddServer(request, env, serverId);

        case 'get-setting':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/get-setting`, 405);
            }
            return GetSetting(request, env, serverId);

        case 'list-settings':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/list-settings`, 405);
            }
            return ListSettings(request, env, userId, serverId);

        case 'update-setting':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/update-setting`, 405);
            }
            return UpdateSetting(request, env, serverId);

        case 'exists-server':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/exists-server`, 405);
            }
            return ServerExists(request, env, serverId);

        case 'list-groups':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/list-groups`, 405);
            }
            return ListGroups(request, env, serverId);

        default:
            return ErrorResponse('Unknown action', 404);
    }
}
