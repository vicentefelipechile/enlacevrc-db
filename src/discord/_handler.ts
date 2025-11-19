/**
 * @file        discord/_handler.ts
 * @author      vicentefelipechile
 * @description This file handles routing for discord-related endpoints.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse } from '../responses';
import { NewSetting } from './new_setting';
import { GetSetting } from './get_setting';
import { ListSettings } from './list_settings';
import { DeleteSetting } from './delete_setting';
import { UpdateSetting } from './update_setting';
import { ServerExists } from './exists';

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
    // Require both serverId and action for all operations
    if (!serverId || !action) {
        return ErrorResponse('Invalid discord endpoint', 400);
    }

    // Handle actions that require a server ID
    switch (action) {
        case 'new':
            if (request.method !== 'POST') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/new`, 405);
            }
            return NewSetting(request, env, serverId);
        
        case 'get':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/get`, 405);
            }
            return GetSetting(request, env, serverId);
        
        case 'list':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/list`, 405);
            }
            return ListSettings(request, env, userId, serverId);
        
        case 'update':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/update`, 405);
            }
            return UpdateSetting(request, env, serverId);
        
        case 'delete':
            if (request.method !== 'DELETE') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/delete`, 405);
            }
            return DeleteSetting(request, env, serverId);
        
        case 'exists':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /discord/${serverId}/exists`, 405);
            }
            return ServerExists(request, env, serverId);
        
        default:
            return ErrorResponse('Unknown action', 404);
    }
}
