/**
 * @file        profile/get_profile.ts
 * @author      vicentefelipechile
 * @description This file contains the function to fetch a user profile from the database by VRChat ID or Discord ID.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';
import { LogIt, LogLevel } from '../loglevel';

// =================================================================================================
// GetProfile Function
// =================================================================================================

/**
 * @description Gets a user profile from the database using the provided User ID (VRChat ID or Discord ID).
 * @param {Request} request The incoming Request object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} userId The ID of the user performing the action.
 * @param {string} profileId The profile ID (VRChat ID or Discord ID).
 * @returns {Promise<Response>} A Response object containing the profile data or an error message.
 */
export async function GetProfile(request: Request, env: Env, userId: string, profileId: string): Promise<Response> {
    try {
        // Statement preparation and execution for VRChat ID
        const statementVRChat = env.DB.prepare('SELECT * FROM profiles WHERE vrchat_id = ?');
        let profile = await statementVRChat.bind(profileId).first<Profile>();

        if (!profile) {
            const statementDiscord = env.DB.prepare('SELECT * FROM profiles WHERE discord_id = ?');
            profile = await statementDiscord.bind(profileId).first<Profile>();
        }

        // Database result handling
        if (profile) {
            profile.is_banned = profile.is_banned === 1;
            profile.is_verified = profile.is_verified === 1;
            // Log the access
            await LogIt(env.DB, LogLevel.INFO, `Profile with VRChat ID '${profile.vrchat_id}' accessed by user ${userId}`);
            return JsonResponse({ success: true, data: profile });
        }

        await LogIt(env.DB, LogLevel.WARNING, `Profile with ID '${profileId}' not found by user ${userId}`);
        return ErrorResponse('Profile not found', 404);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error fetching profile: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Error fetching profile by ${userId}: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}