/**
 * @file        staff/_handler.ts
 * @author      vicentefelipechile
 * @description This file handles routing for staff-related endpoints.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { ErrorResponse } from '../responses';
import { NewStaff } from './new_staff';
import { GetStaff } from './get_staff';
import { ListStaff } from './list_staff';
import { DeleteStaff } from './delete_staff';
import { UpdateStaffName } from './update_staff_name';

// =================================================================================================
// StaffHandler Function
// =================================================================================================

/**
 * @description Routes staff-related requests to the appropriate handler based on the action.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string | undefined} staffId The staff member ID (Discord ID).
 * @param {string | undefined} action The action to perform.
 * @returns {Promise<Response>} The Response from the executed handler.
 */
export async function StaffHandler(request: Request, env: Env, userId: string, staffId: string | undefined, action: string | undefined): Promise<Response> {
    // Handle special routes without staffId (new and list)
    if (staffId === 'new') {
        if (request.method !== 'POST') {
            return ErrorResponse(`Method ${request.method} not allowed for /staff/new`, 405);
        }
        return NewStaff(request, env, userId);
    }

    if (staffId === 'list') {
        if (request.method !== 'GET') {
            return ErrorResponse(`Method ${request.method} not allowed for /staff/list`, 405);
        }
        return ListStaff(request, env, userId);
    }

    // Require both staffId and action for other operations
    if (!staffId || !action) {
        return ErrorResponse('Invalid staff endpoint. Use /staff/new, /staff/list, or /staff/{id}/{action}', 404);
    }

    // Handle actions that require a staff ID
    switch (action) {
        case 'get':
            if (request.method !== 'GET') {
                return ErrorResponse(`Method ${request.method} not allowed for /staff/${staffId}/get`, 405);
            }
            return GetStaff(request, env, staffId, userId);
        
        case 'update_name':
            if (request.method !== 'PUT') {
                return ErrorResponse(`Method ${request.method} not allowed for /staff/${staffId}/update_name`, 405);
            }
            return UpdateStaffName(request, env, staffId, userId);
        
        case 'delete':
            if (request.method !== 'DELETE') {
                return ErrorResponse(`Method ${request.method} not allowed for /staff/${staffId}/delete`, 405);
            }
            return DeleteStaff(request, env, staffId, userId);
        
        default:
            return ErrorResponse(`Unknown action: ${action || 'none'}. Valid actions are: get, update_name, delete. Use /staff/new or /staff/list for other operations`, 404);
    }
}
