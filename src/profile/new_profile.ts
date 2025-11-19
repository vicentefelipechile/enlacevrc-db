/**
 * @file        profile/new_profile.ts
 * @author      vicentefelipechile
 * @description This function adds a new user profile to the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// NewProfile Function
// =================================================================================================

/**
 * @description Adds a new user profile to the database.
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @returns {Promise<Response>} A Response object confirming success or detailing an error.
 */
export async function NewProfile(request: Request, env: Env, userId: string): Promise<Response> {
    let vrchatId: string | undefined;
    let discordId: string | undefined;
    const userName = request.headers.get('X-Discord-Name')!;
    
    try {
        // Data extraction
        const newProfileData: Partial<Profile> = await request.json();

        // Basic validation
        if (!newProfileData.vrchat_id || !newProfileData.discord_id || !newProfileData.vrchat_name) {
            return ErrorResponse('Missing required fields: vrchat_id, discord_id and vrchat_name are required', 400);
        }

        // Variable extraction
        let vrchatName: string;
        ({
            vrchat_id: vrchatId,
            discord_id: discordId,
            vrchat_name: vrchatName
        } = newProfileData);

        // Statement preparation and execution
        const statement = env.DB.prepare('INSERT INTO profiles (discord_id, vrchat_id, vrchat_name, created_by) VALUES (?, ?, ?, ?)');
        const { success } = await statement.bind(discordId, vrchatId, vrchatName, userId).run();

        // Database result handling
        if (success) {
            // Log the action
            await LogIt(env.DB, LogLevel.ADDITION, `Profile with VRChat ID '${vrchatId}' added by user ${userId}`, userName);
            return SuccessResponse('Profile created successfully', 201);
        } else {
            await LogIt(env.DB, LogLevel.WARNING, `Failed to add profile with VRChat ID '${vrchatId}' by user ${userId}: Profile may already exist`, userName);
            return ErrorResponse('Failed to create profile. It may already exist', 409);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';

        // Handle UNIQUE constraint violations
        if (errorMessage.includes('UNIQUE constraint failed')) {
            await LogIt(env.DB, LogLevel.WARNING, `Duplicate profile attempt with VRChat ID '${vrchatId}' by user ${userId}`, userName);
            
            if (errorMessage.includes('vrchat_id')) {
                return ErrorResponse('Profile with this VRChat ID already exists', 409);
            } else if (errorMessage.includes('discord_id')) {
                return ErrorResponse('Profile with this Discord ID already exists', 409);
            }
            return ErrorResponse('Profile already exists', 409);
        }

        await LogIt(env.DB, LogLevel.ERROR, `Error adding profile by ${userId}: ${errorMessage}`, userName);

        if (errorMessage.includes('JSON')) {
            return ErrorResponse('Invalid JSON in request body', 400);
        }
        
        return ErrorResponse('Internal Server Error', 500);
    }
}