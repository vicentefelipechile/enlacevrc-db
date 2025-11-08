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
 * API key must be provided in x-api-key header
 */
export async function validateApiKey(request: Request, env: Env): Promise<boolean> {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
        return false;
    }
    
    // Compare with environment variable API key
    return apiKey === env.API_KEY;
}

/**
 * Validates that a Discord user is an authorized admin/staff member
 * Checks both bot_admin and staff tables
 */
export async function validateAdmin(discordId: string, env: Env): Promise<boolean> {
    try {
        // Check if user exists in bot_admin table
        const adminCheck = env.DB.prepare(
            'SELECT admin_id FROM bot_admin WHERE discord_id = ? LIMIT 1'
        ).bind(discordId);
        
        const admin = await adminCheck.first();
        
        if (admin) {
            return true;
        }
        
        // Check if user exists in staff table
        const staffCheck = env.DB.prepare(
            'SELECT staff_id FROM staff WHERE discord_id = ? LIMIT 1'
        ).bind(discordId);
        
        const staff = await staffCheck.first();
        
        return staff !== null;
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
    const discordId = request.headers.get('x-discord-id');
    
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
    const headerDiscordId = request.headers.get('x-discord-id');
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

/**
 * Rate limiting helper (basic implementation)
 * In production, consider using Cloudflare Rate Limiting or Durable Objects
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);
    
    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
        return true;
    }
    
    if (record.count >= maxRequests) {
        return false;
    }
    
    record.count++;
    return true;
}