/**
 * @file logs/get.ts
 * @author vicentefelipechile
 * @description Retrieves logs from the database - ADMIN ONLY
 */

// Import Statements
import { ErrorResponse, JsonResponse } from '../responses';
import { requireAuth } from '../middleware/auth';
import type { Log } from '../models';
import { LogIt, LogLevel } from '../loglevel';

// =============================================================================
// GetLogs Function
// =============================================================================

/**
 * Retrieves logs from the database
 * SECURITY: Requires valid API key AND admin privileges
 * 
 * Query parameters:
 * - limit: Maximum number of logs to return (default: 50, max: 100)
 * - log_level_id: Filter by log level
 * - action_type: Filter by action type
 * - target_user_id: Filter by target user
 * - performed_by: Filter by who performed the action
 * - start_date: Filter logs after this date (ISO format)
 * - end_date: Filter logs before this date (ISO format)
 */
export async function GetLogs(request: Request, env: Env): Promise<Response> {
    try {
        // SECURITY CHECK: Require authentication and admin privileges
        const authError = await requireAuth(request, env);
        if (authError) {
            return authError;
        }

        // Extract query parameters
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const logLevelId = url.searchParams.get('log_level_id');
        const createdBy = url.searchParams.get('created_by');

        // Date Range
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');

        // Build query with filters
        let query = 'SELECT * FROM log WHERE 1=1';
        const params: any[] = [];

        if (logLevelId) {
            query += ' AND log_level_id = ?';
            params.push(parseInt(logLevelId));
        }

        if (createdBy) {
            query += ' AND created_by = ?';
            params.push(createdBy);
        }

        if (startDate && endDate) {
            query += ' AND created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        // Execute query
        const statement = env.DB.prepare(query).bind(...params);
        const result = await statement.all<Log>();

        if (!result.success) {
            return ErrorResponse('Failed to retrieve logs', 500);
        }

        // Log this access for audit purposes
        const discordId = request.headers.get('X-Discord-ID')!;
        const discordName = request.headers.get('X-Discord-Name')!;
        await LogIt(env.DB, LogLevel.INFO, `Logs retrieved by admin ${discordName} (${discordId})`, discordName);

        return JsonResponse({
            success: true,
            data: result.results,
            count: result.results.length,
            limit: limit
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error in GetLogs:', errorMessage);
        return ErrorResponse('Internal Server Error', 500);
    }
}