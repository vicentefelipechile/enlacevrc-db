/**
 * @file        profile/get.ts
 * @author      vicentefelipechile
 * @description This file contains the function to fetch a user profile from the database by VRChat ID or Discord ID.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { Profile } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';

// =================================================================================================
// GetProfile Function
// =================================================================================================

/**
 * @description Gets a user profile from the database using the provided User ID (VRChat ID or Discord ID).
 * @param {string} profileId The ID of the profile to fetch (can be vrchat_id or discord_id).
 * @param {Env} env The Cloudflare Worker environment object.
 * @returns {Promise<Response>} A Response object containing the profile data or an error message.
 */
export async function GetProfile(profileId: string, env: Env): Promise<Response> {
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

            return JsonResponse({ success: true, data: profile });
        }

        return ErrorResponse('Profile not found', 404);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
        console.error(`Error fetching profile: ${errorMessage}`);

        return ErrorResponse('Internal Server Error', 500);
    }
}