/**
 * @file        group/_handler.ts
 * @author      vicentefelipechile
 * @description This file handles routing for group-related endpoints.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse } from '../responses';
import { AddGroup } from './add-group';
import { GetGroup } from './get-group';
import { GetServer } from './get-server';
import { UpdateGroup } from './update-group';
import { DeleteGroup } from './delete-group';
import { LogGroup } from './log-group';

// =================================================================================================
// GroupHandler Function
// =================================================================================================

/**
 * @description Routes group-related requests to the appropriate handler based on the action.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string | undefined} groupId The VRChat group ID.
 * @param {string | undefined} action The action to perform.
 * @returns {Promise<Response>} The Response from the executed handler.
 */
export async function GroupHandler(request: Request, env: Env, userId: string, groupId: string | undefined, action: string | undefined): Promise<Response> {
    // Special case: groupId is specified as action (for endpoints without groupId)
    if (!action && groupId) {
        action = groupId;

        switch (action) {
            case 'add-group':
                if (request.method !== 'POST') {
                    return ErrorResponse(`Method ${request.method} not allowed for /group/add-group`, 405);
                }
                return AddGroup(request, env, userId);

            case 'log-group':
                if (request.method !== 'POST') {
                    return ErrorResponse(`Method ${request.method} not allowed for /group/log-group`, 405);
                }
                return LogGroup(request, env, userId);

            default:
                return ErrorResponse('Invalid group endpoint', 400);
        }
    }

    // Require both groupId and action for operations on specific groups
    if (!groupId || !action) {
        return ErrorResponse('Invalid group endpoint', 400);
    }

    // Handle actions that require a group ID
    switch (action) {
        case 'get-group':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /group/${groupId}/get-group`, 405);
            }
            return GetGroup(request, env, groupId);

        case 'get-server':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /group/${groupId}/get-server`, 405);
            }
            return GetServer(request, env, groupId);

        case 'update-group':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /group/${groupId}/update-group`, 405);
            }
            return UpdateGroup(request, env, groupId, userId);

        case 'delete-group':
            if (request.method !== 'DELETE') {
                return ErrorResponse(`Method ${request.method} not allowed for /group/${groupId}/delete-group`, 405);
            }
            return DeleteGroup(request, env, groupId, userId);

        default:
            return ErrorResponse('Unknown action', 404);
    }
}
