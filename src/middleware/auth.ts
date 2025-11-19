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
    const authHeader = request.headers.get('Authorization');
    
    if (!apiKey && !authHeader) {
        return false;
    }
    
    // Check X-Api-Key header
    if (apiKey && apiKey === env.API_KEY) {
        return true;
    }
    
    // Check Authorization header (Bearer token format)
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        return token === env.API_KEY;
    }
    
    return false;
}

/**
 * Validates that a user is an authorized admin
 * Checks only the bot_admin table
 * @param userId The Discord ID of the user to validate
 */
export async function validateAdmin(userId: string, env: Env): Promise<boolean> {
    try {
        // Check if user exists in bot_admin table by discord_id
        const adminCheckById = env.DB.prepare('SELECT discord_id FROM bot_admin WHERE discord_id = ? LIMIT 1').bind(userId);
        const adminById = await adminCheckById.first();
        
        return adminById !== null;
    } catch (error) {
        console.error('Error validating admin:', error);
        return false;
    }
}

/**
 * Validates that a user is an authorized staff member
 * Checks only the staff table
 * @param userId The Discord ID of the user to validate
 * @returns 
 */
export async function validateStaff(userId: string, env: Env): Promise<boolean> {
    try {
        // Check if user exists in bot_staff table by discord_id
        const staffCheckById = env.DB.prepare('SELECT discord_id FROM staff WHERE discord_id = ? LIMIT 1').bind(userId);
        const staffById = await staffCheckById.first();

        if (staffById === null) {
            // If not found in staff, check bot_admin table as admins are also staff
            const adminCheckById = env.DB.prepare('SELECT discord_id FROM bot_admin WHERE discord_id = ? LIMIT 1').bind(userId);
            const adminById = await adminCheckById.first();

            return adminById !== null;
        }
        
        return staffById !== null;
    } catch (error) {
        console.error('Error validating staff:', error);
        return false;
    }
}

/**
 * Combined middleware: validates API key AND admin status
 * Returns error response if validation fails
 */
export async function requireAuth(request: Request, env: Env, verifyStaff: boolean = false): Promise<Response | null> {
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
    if (verifyStaff) {
        const isStaff = await validateStaff(discordId, env);
        if (!isStaff) {
            return ErrorResponse('Forbidden: Staff privileges required', 403);
        }
    } else {
        const isAdmin = await validateAdmin(discordId, env);
        if (!isAdmin) {
            return ErrorResponse('Forbidden: Admin privileges required', 403);
        }
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