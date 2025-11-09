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
import { ListProfiles } from './profile/list';
import { AddDiscordSetting } from './discord/add';
import { GetDiscordSetting } from './discord/get';
import { UpdateDiscordSetting } from './discord/update';
import { DeleteDiscordSetting } from './discord/delete';
import { DiscordServerExists } from './discord/exists';
import { ListDiscordSettings } from './discord/list';
import { AddStaff } from './staff/add';
import { GetStaff } from './staff/get';
import { UpdateStaff } from './staff/update';
import { DeleteStaff } from './staff/delete';
import { ListStaff } from './staff/list';
import { GetLogs } from './logs/get';
import { ValidateAdminAccess } from './logs/validate-admin';

// =================================================================================================
// Helper Functions
// =================================================================================================

/**
 * @description Adds CORS headers to a response
 * @param {Response} response The response to add headers to
 * @returns {Response} Response with CORS headers
 */
function AddCorsHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, X-Discord-ID, X-User-ID');
    headers.set('Access-Control-Max-Age', '86400');
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/**
 * @description Handles OPTIONS preflight requests
 * @returns {Response} CORS preflight response
 */
function HandlePreflight(): Response {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Discord-ID, X-Discord-Name, X-User-ID',
            'Access-Control-Max-Age': '86400',
        },
    });
}

/**
 * @description Authenticates the incoming request by checking the Authorization header.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Response | null} A Response object if authentication fails, otherwise null.
 */
function HandleAuthentication(request: Request, env: Env): Response | null {
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = `Bearer ${env.API_KEY}`;

    if (!authHeader || authHeader !== expectedAuth) {
        return ErrorResponse('Unauthorized', 401);
    }

    return null;
}

/**
 * @description Routes the request to the appropriate handler based on the method and URL.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {boolean} requiresAuth Whether the request requires authentication
 * @returns {Promise<Response>} The Response from the executed handler.
 */
async function RouteRequest(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const pathParts = pathname.split('/').filter(p => p);

    // Public endpoints that don't require X-User-ID or full authentication
    if (pathParts[0] === 'auth' && pathParts[1] === 'validate-admin') {
        if (request.method === 'GET') {
            return ValidateAdminAccess(request, env);
        }
        return ErrorResponse(`Method ${request.method} not allowed`, 405);
    }

    // All other endpoints require X-User-ID
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
        return ErrorResponse('X-User-ID header is required', 400);
    }

    if (pathParts[0] === 'profiles') {
        const profileId = pathParts.length > 1 ? pathParts[1] : undefined;

        // Handle /profiles/list
        if (profileId === 'list' && request.method === 'GET') {
            return ListProfiles(request, env, userId);
        }

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

        // Handle /discord-settings/list
        if (discordServerId === 'list' && request.method === 'GET') {
            return ListDiscordSettings(request, env, userId);
        }

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

        // Handle /staff/list
        if (staffId === 'list' && request.method === 'GET') {
            return ListStaff(request, env, userId);
        }
        
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

    // SECURE ENDPOINTS - Logs (Admin Only)
    if (pathParts[0] === 'logs') {
        switch (request.method) {
            case 'GET':
                return GetLogs(request, env);
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
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return HandlePreflight();
        }

        const { pathname } = new URL(request.url);
        const pathParts = pathname.split('/').filter(p => p);
        
        // Public endpoints that bypass API_KEY authentication
        const isPublicEndpoint = pathParts[0] === 'auth' && pathParts[1] === 'validate-admin';

        // Step 1: Authenticate the request (skip for public endpoints)
        if (!isPublicEndpoint) {
            const authError = HandleAuthentication(request, env);
            if (authError) {
                return AddCorsHeaders(authError);
            }
        }

        // Step 2: Route the request to the correct handler
        const response = await RouteRequest(request, env);
        
        // Step 3: Add CORS headers to the response
        return AddCorsHeaders(response);
    },
} satisfies ExportedHandler<Env>;