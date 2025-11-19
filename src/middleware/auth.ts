/**
 * @file middleware/auth.ts
 * @author vicentefelipechile
 * @description Authentication and authorization middleware for secure endpoints
 */

// Import Statements
import { ErrorResponse } from '../responses';

// =============================================================================
// Authentication Middleware
// =============================================================================

/**
 * Validates API key from request headers
 * API key must be provided in X-Api-Key header
 */
export async function validateApiKey(request: Request, env: Env): Promise<boolean> {
    const apiKey = request.headers.get('X-Api-Key');
    
    if (!apiKey) {
        return false;
    }
    
    // Compare with environment variable API key
    return apiKey === env.API_KEY;
}

/**
 * Validates that a user is an authorized admin
 * Checks only the bot_admin table
 * @param userId Can be either a Discord ID or an admin_id
 */
export async function validateAdmin(userId: string, env: Env): Promise<boolean> {
    try {
        // Check if user exists in bot_admin table by discord_id
        const adminCheckByDiscordId = env.DB.prepare('SELECT admin_id FROM bot_admin WHERE discord_id = ? LIMIT 1').bind(userId);
        const adminByDiscordId = await adminCheckByDiscordId.first();
        
        if (adminByDiscordId) {
            return true;
        }
        
        // Check if user exists in bot_admin table by admin_id
        const adminCheckById = env.DB.prepare('SELECT admin_id FROM bot_admin WHERE admin_id = ? LIMIT 1').bind(userId);
        const adminById = await adminCheckById.first();
        
        return adminById !== null;
    } catch (error) {
        console.error('Error validating admin:', error);
        return false;
    }
}

/**
 * Combined middleware: validates API key AND admin status
 * Returns error response if validation fails
 */
export async function requireAuth(request: Request, env: Env): Promise<Response | null> {
    // Validate API key
    const hasValidKey = await validateApiKey(request, env);
    
    if (!hasValidKey) {
        return ErrorResponse('Unauthorized: Invalid or missing API key', 401);
    }
    
    // Extract Discord ID from request (from header or body)
    const discordId = request.headers.get('X-Discord-ID');
    
    if (!discordId) {
        return ErrorResponse('Unauthorized: Discord ID required', 401);
    }
    
    // Validate that user is an admin/staff
    const isAdmin = await validateAdmin(discordId, env);
    
    if (!isAdmin) {
        return ErrorResponse('Forbidden: Admin privileges required', 403);
    }
    
    // All checks passed
    return null;
}

/**
 * Extract Discord ID from various sources in the request
 */
export function extractDiscordId(request: Request): string | null {
    // Try header first
    const headerDiscordId = request.headers.get('X-Discord-ID');
    if (headerDiscordId) {
        return headerDiscordId;
    }
    
    // Try URL parameters
    const url = new URL(request.url);
    const paramDiscordId = url.searchParams.get('discord_id');
    if (paramDiscordId) {
        return paramDiscordId;
    }
    
    return null;
}