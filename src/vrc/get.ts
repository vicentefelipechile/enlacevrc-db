/**
 * @file        vrc/get.ts
 * @author      vicentefelipechile
 * @description This function fetches all or some of the EnlaceVRC config data from the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { BanReason, SettingType, Setting, VerificationType, BotAdmin } from '../models';
import { JsonResponse, ErrorResponse } from '../responses';

// =================================================================================================
// Type Definitions
// =================================================================================================

type ConfigData = {
    banReasons?: BanReason[];
    settings?: Setting[];
    verificationTypes?: VerificationType[];
};

// =================================================================================================
// GetVRCConfig Function
// =================================================================================================

/**
 * @description Gets EnlaceVRC configuration data from the database.
 * @param {request} env The Cloudflare Worker environment object.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} adminId The Discord ID of the bot admin requesting the data.
 * @returns {Promise<Response>} A response containing the configuration data or an error message.
 */

export async function GetVRCConfig(request: Request, env: Env, adminId: string): Promise<Response> {
    try {
        // Verify if the requester is a bot admin
        const adminCheckStmt = env.DB.prepare('SELECT * FROM bot_admins WHERE discord_id = ?');
        const admin = await adminCheckStmt.bind(adminId).first<BotAdmin>();

        if (!admin) {
            await LogIt(env.DB, LogLevel.WARNING, 'Unauthorized access attempt by unrecognized Discord ID: ' + adminId);
            return ErrorResponse('Unauthorized access', 403);
        }

        const discordId = admin.discord_id;
        const url = new URL(request.url);
        const isGettingAll = url.searchParams.get('getall') === 'true';

        if (isGettingAll) {
            await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} requested all VRC config data`);
        }

        // Prepare the config data object
        const configData: ConfigData = {};

        // Fetch Ban Reasons
        const isGettingBanReasons = isGettingAll || url.searchParams.get('getbanreasons') === 'true';
        if (isGettingBanReasons) {
            const banReasons = await env.DB.prepare('SELECT * FROM ban_reasons').all<BanReason>();
            configData.banReasons = banReasons.results;

            if (!isGettingAll) {
                await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} requested ban reasons`);
            }
        }

        // Fetch Settings
        const isGettingSettings = isGettingAll || url.searchParams.get('getsettings') === 'true';
        if (isGettingSettings) {
            const settings = await env.DB.prepare('SELECT * FROM settings').all<Setting>();
            const settingsType = await env.DB.prepare('SELECT * FROM setting_types').all<SettingType>();

            let settingsWithType = settings.results.map(setting => {
                const type = settingsType.results.find(type => type.setting_type_id === setting.setting_type_id);
                return { ...setting, type };
            });

            configData.settings = settingsWithType;

            if (!isGettingAll) {
                await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} requested settings`);
            }
        }

        // Fetch Verification Types
        const isGettingVerificationTypes = isGettingAll || url.searchParams.get('getverificationtypes') === 'true';
        if (isGettingVerificationTypes) {
            const verificationTypes = await env.DB.prepare('SELECT * FROM verification_types').all<VerificationType>();
            configData.verificationTypes = verificationTypes.results;

            if (!isGettingAll) {
                await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} requested verification types`);
            }
        }

        return JsonResponse(configData);
    } catch (error) {
        console.error('Error fetching VRC config:', error);
        return ErrorResponse('Internal server error', 500);
    }
}