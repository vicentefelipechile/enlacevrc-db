/**
 * @file        src/index.ts
 * @author      vicentefelipechile
 * @description This file handles incoming HTTP requests, performs authentication,
 * and routes them to the appropriate handler based on the request method and URL.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { DeleteProfile } from './profile/delete';
import { UpdateProfile } from './profile/update';
import { ErrorResponse } from './responses';
import { AddProfile } from './profile/add';
import { GetProfile } from './profile/get';
import { AddDiscordSetting } from './discord/add';
import { GetDiscordSetting } from './discord/get';
import { UpdateDiscordSetting } from './discord/update';
import { DeleteDiscordSetting } from './discord/delete';
import { DiscordServerExists } from './discord/exists';
import { AddStaff } from './staff/add';
import { GetStaff } from './staff/get';
import { UpdateStaff } from './staff/update';
import { DeleteStaff } from './staff/delete';

// =================================================================================================
// Helper Functions
// =================================================================================================

/**
 * @description Authenticates the incoming request by checking the Authorization header.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Response | null} A Response object if authentication fails, otherwise null.
 */
function HandleAuthentication(request: Request, env: Env): Response | null {
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = `Bearer ${env.PRIVATE_KEY}`;

    if (!authHeader || authHeader !== expectedAuth) {
        return ErrorResponse('Unauthorized', 401);
    }

    return null;
}

/**
 * @description Routes the request to the appropriate handler based on the method and URL.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} The Response from the executed handler.
 */
async function RouteRequest(request: Request, env: Env): Promise<Response> {
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
        return ErrorResponse('X-User-ID header is required', 400);
    }

    const { pathname } = new URL(request.url);
    const pathParts = pathname.split('/').filter(p => p); // e.g., /profiles/usr_123 -> ['profiles', 'usr_123']

    if (pathParts[0] === 'profiles') {
        const profileId = pathParts.length > 1 ? pathParts[1] : undefined;
        switch (request.method) {
            case 'POST':
                if (profileId) return ErrorResponse('POST requests cannot include an ID in the URL', 400);
                return AddProfile(request, env, userId);
            case 'GET':
                if (!profileId) return ErrorResponse('A profile ID is required for GET requests (e.g., /profiles/some_id)', 400);
                return GetProfile(profileId, env, userId);
            case 'PUT':
                if (!profileId) return ErrorResponse('A profile ID is required for PUT requests (e.g., /profiles/some_id)', 400);
                return UpdateProfile(request, profileId, env, userId);
            case 'DELETE':
                if (!profileId) return ErrorResponse('A profile ID is required for DELETE requests (e.g., /profiles/some_id)', 400);
                return DeleteProfile(profileId, env, userId);
            default:
                return ErrorResponse(`Method ${request.method} not allowed`, 405);
        }
    }

    if (pathParts[0] === 'discord-settings') {
        const discordServerId = pathParts.length > 1 ? pathParts[1] : undefined;
        const action = pathParts.length > 2 ? pathParts[2] : undefined;

        // Handle /discord-settings/:id/exists
        if (action === 'exists' && request.method === 'GET') {
            if (!discordServerId) return ErrorResponse('A server ID is required for exists check (e.g., /discord-settings/some_id/exists)', 400);
            return DiscordServerExists(discordServerId, env);
        }

        // Reject unknown actions
        if (action && action !== 'exists') {
            return ErrorResponse(`Unknown action: ${action}`, 404);
        }

        switch (request.method) {
            case 'POST':
                if (!discordServerId) return ErrorResponse('A server ID is required for POST requests (e.g., /discord-settings/some_id)', 400);
                return AddDiscordSetting(request, discordServerId, env);
            case 'GET':
                if (!discordServerId) return ErrorResponse('A server ID is required for GET requests (e.g., /discord-settings/some_id)', 400);
                return GetDiscordSetting(request, discordServerId, env);
            case 'PUT':
                if (!discordServerId) return ErrorResponse('A server ID is required for PUT requests (e.g., /discord-settings/some_id)', 400);
                return UpdateDiscordSetting(request, discordServerId, env);
            case 'DELETE':
                if (!discordServerId) return ErrorResponse('A server ID is required for DELETE requests (e.g., /discord-settings/some_id)', 400);
                return DeleteDiscordSetting(request, discordServerId, env);
            default:
                return ErrorResponse(`Method ${request.method} not allowed.`, 405);
        }
    }

    if (pathParts[0] === 'staff') {
        const staffId = pathParts.length > 1 ? pathParts[1] : undefined;
        
        switch (request.method) {
            case 'POST':
                if (staffId) return ErrorResponse('POST requests cannot include an ID in the URL', 400);
                return AddStaff(request, env);
            case 'GET':
                // Allow GET without ID to return all staff members
                return GetStaff(staffId, env);
            case 'PUT':
                if (!staffId) return ErrorResponse('A staff ID is required for PUT requests (e.g., /staff/some_id)', 400);
                return UpdateStaff(request, staffId, env);
            case 'DELETE':
                if (!staffId) return ErrorResponse('A staff ID is required for DELETE requests (e.g., /staff/some_id)', 400);
                return DeleteStaff(staffId, env);
            default:
                return ErrorResponse(`Method ${request.method} not allowed`, 405);
        }
    }

    return ErrorResponse('Not Found', 404);
}

// =================================================================================================
// Main Fetch Handler
// =================================================================================================

export default {
    /**
     * @description The main fetch handler for the Cloudflare Worker.
     * @param {Request} request The incoming request.
     * @param {Env} env The environment variables.
     * @param {ExecutionContext} ctx The execution context.
     * @returns {Promise<Response>} The response to the request.
     */
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // Step 1: Authenticate the request
        const authError = HandleAuthentication(request, env);
        if (authError) {
            return authError;
        }

        // Step 2: Route the request to the correct handler
        return RouteRequest(request, env);
    },
} satisfies ExportedHandler<Env>;