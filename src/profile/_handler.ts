/**
 * @file        profile/handler.ts
 * @author      vicentefelipechile
 * @description This file handles routing for profile-related endpoints.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse } from '../responses';
import { NewProfile } from './new_profile';
import { GetProfile } from './get_profile';
import { ListProfiles } from './list_profiles';
import { DeleteProfile } from './delete_profile';
import { BanProfile } from './ban_profile';
import { UnbanProfile } from './unban_profile';
import { VerifyProfile } from './verify_profile';
import { UnverifyProfile } from './unverify_profile';

// =================================================================================================
// ProfileHandler Function
// =================================================================================================

/**
 * @description Routes profile-related requests to the appropriate handler based on the action.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string | undefined} profileId The profile ID (VRChat ID or Discord ID).
 * @param {string | undefined} action The action to perform.
 * @returns {Promise<Response>} The Response from the executed handler.
 */
export async function ProfileHandler(request: Request, env: Env, userId: string, profileId: string | undefined, action: string | undefined): Promise<Response> {
    // Handle special routes without profileId (new and list)
    if (profileId === 'new') {
        if (request.method !== 'POST') {
            return ErrorResponse(`Method ${request.method} not allowed for /profile/new`, 405);
        }
        return NewProfile(request, env, userId);
    }

    if (profileId === 'list') {
        if (request.method !== 'GET') {
            return ErrorResponse(`Method ${request.method} not allowed for /profile/list`, 405);
        }
        return ListProfiles(request, env, userId);
    }

    // Require both profileId and action for other operations
    if (!profileId || !action) {
        return ErrorResponse('Invalid profile endpoint', 400);
    }

    // Handle actions that require a profile ID
    switch (action) {
        case 'get':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /profile/${profileId}/get`, 405);
            }
            return GetProfile(request, env, userId, profileId);
        
        case 'delete':
            if (request.method !== 'DELETE') {
                return ErrorResponse(`Method ${request.method} not allowed for /profile/${profileId}/delete`, 405);
            }
            return DeleteProfile(request, env, userId, profileId);
        
        case 'ban':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /profile/${profileId}/ban`, 405);
            }
            return BanProfile(request, env, userId, profileId);
        
        case 'unban':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /profile/${profileId}/unban`, 405);
            }
            return UnbanProfile(request, env, userId, profileId);
        
        case 'verify':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /profile/${profileId}/verify`, 405);
            }
            return VerifyProfile(request, env, userId, profileId);
        
        case 'unverify':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /profile/${profileId}/unverify`, 405);
            }
            return UnverifyProfile(request, env, userId, profileId);
        
        default:
            return ErrorResponse('Unknown action', 404);
    }
}
