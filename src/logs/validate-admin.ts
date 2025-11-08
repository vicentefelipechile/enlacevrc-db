/**
 * @file logs/validate-admin.ts
 * @author vicentefelipechile
 * @description Validates if a Discord user is an authorized admin
 */

// Import Statements
import { ErrorResponse, JsonResponse } from '../responses';
import { validateAdmin, validateApiKey } from '../middleware/auth';

// =============================================================================
// ValidateAdmin Function
// =============================================================================

/**
 * Checks if a Discord user is an authorized admin/staff member
 * This endpoint is used by the frontend to verify access before login
 * 
 * Query parameters:
 * - discord_id: The Discord ID to validate
 * 
 * SECURITY: Requires valid API key
 */
export async function ValidateAdminAccess(request: Request, env: Env): Promise<Response> {
    try {
        // Validate API key
        const hasValidKey = await validateApiKey(request, env);
        
        if (!hasValidKey) {
            return ErrorResponse('Unauthorized: Invalid or missing API key', 401);
        }

        // Extract Discord ID from request headers
        const discordId = request.headers.get('x-discord-id');

        if (!discordId) {
            return ErrorResponse('Missing header: x-discord-id', 400);
        }

        // Validate admin status
        const isAdmin = await validateAdmin(discordId, env);

        return JsonResponse({
            success: true,
            data: {
                discord_id: discordId,
                is_admin: isAdmin,
                has_access: isAdmin
            }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error in ValidateAdminAccess:', errorMessage);
        return ErrorResponse('Internal Server Error', 500);
    }
}
