/**
 * @file        vrc/delete.ts
 * @author      vicentefelipechile
 * @description This function disables VRC configuration items (ban reasons, settings, or verification types) by setting is_disabled to true.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { BanReason, Setting, VerificationType, BotAdmin } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// DeleteVRCConfig Function
// =================================================================================================

/**
 * @description Disables a VRC configuration item by setting is_disabled to true.
 * @param {Request} request The incoming Request object containing the config type and ID in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} adminId The Discord ID of the bot admin performing the action.
 * @returns {Promise<Response>} A response indicating the result of the disable operation.
 */
export async function DeleteVRCConfig(request: Request, env: Env, adminId: string): Promise<Response> {
    try {
        // Verify if the requester is a bot admin
        const adminCheckStmt = env.DB.prepare('SELECT * FROM bot_admins WHERE discord_id = ?');
        const admin = await adminCheckStmt.bind(adminId).first<BotAdmin>();

        if (!admin) {
            await LogIt(env.DB, LogLevel.WARNING, 'Unauthorized access attempt by unrecognized Discord ID: ' + adminId);
            return ErrorResponse('Unauthorized access', 403);
        }

        const discordId = admin.discord_id;

        // Data extraction
        const data: { type: string; id: number } = await request.json();

        // Basic validation
        if (!data.type || data.id === undefined) {
            await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to delete VRC config with missing type or id`);
            return ErrorResponse('Missing required fields: type and id are required', 400);
        }

        // Variable extraction
        const { type, id } = data;

        // Handle different config types
        switch (type) {
            case 'banreason':
                // Check if item exists
                const banExistsStmt = env.DB.prepare('SELECT reason_text FROM ban_reasons WHERE ban_reason_id = ?');
                const banItem = await banExistsStmt.bind(id).first<BanReason>();
                if (!banItem) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to delete non-existent ban reason ID ${id}`);
                    return ErrorResponse('Ban reason not found', 404);
                }

                // Disable the item
                const disableBanStmt = env.DB.prepare('UPDATE ban_reasons SET is_disabled = true, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE ban_reason_id = ?');
                const { success: banSuccess } = await disableBanStmt.bind(discordId, id).run();

                // Database result handling
                if (banSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} disabled ban reason: ${banItem.reason_text}`);
                    return SuccessResponse('Ban reason disabled successfully', 200);
                } else {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} failed to disable ban reason: ${banItem.reason_text}`);
                    return ErrorResponse('Failed to disable ban reason', 500);
                }

            case 'setting':
                // Check if item exists
                const settingExistsStmt = env.DB.prepare('SELECT setting_name FROM settings WHERE setting_id = ?');
                const settingItem = await settingExistsStmt.bind(id).first<Setting>();
                if (!settingItem) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to delete non-existent setting ID ${id}`);
                    return ErrorResponse('Setting not found', 404);
                }

                // Disable the item
                const disableSettingStmt = env.DB.prepare('UPDATE settings SET is_disabled = true, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE setting_id = ?');
                const { success: settingSuccess } = await disableSettingStmt.bind(discordId, id).run();

                // Database result handling
                if (settingSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} disabled setting: ${settingItem.setting_name}`);
                    return SuccessResponse('Setting disabled successfully', 200);
                } else {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} failed to disable setting: ${settingItem.setting_name}`);
                    return ErrorResponse('Failed to disable setting', 500);
                }

            case 'verificationtype':
                // Check if item exists
                const verifExistsStmt = env.DB.prepare('SELECT type_name FROM verification_types WHERE verification_type_id = ?');
                const verifItem = await verifExistsStmt.bind(id).first<VerificationType>();
                if (!verifItem) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to delete non-existent verification type ID ${id}`);
                    return ErrorResponse('Verification type not found', 404);
                }

                // Disable the item
                const disableVerifStmt = env.DB.prepare('UPDATE verification_types SET is_disabled = true, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE verification_type_id = ?');
                const { success: verifSuccess } = await disableVerifStmt.bind(discordId, id).run();

                // Database result handling
                if (verifSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} disabled verification type: ${verifItem.type_name}`);
                    return SuccessResponse('Verification type disabled successfully', 200);
                } else {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} failed to disable verification type: ${verifItem.type_name}`);
                    return ErrorResponse('Failed to disable verification type', 500);
                }

            default:
                await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to delete VRC config with invalid type: ${type}`);
                return ErrorResponse('Invalid type: must be banreason, setting, or verificationtype', 400);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error deleting VRC config: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Unexpected error while disabling VRC config by bot admin ${adminId}: ${errorMessage}`);
        return ErrorResponse('Internal Server Error', 500);
    }
}