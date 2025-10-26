/**
 * @file        vrc/update.ts
 * @author      vicentefelipechile
 * @description This function updates existing VRC configuration items (ban reasons, settings, or verification types) in the database.
 */

// =================================================================================================
// Import Statements
// =================================================================================================

import { LogIt, LogLevel } from '../loglevel';
import { BanReason, Setting, VerificationType, BotAdmin, SettingType } from '../models';
import { ErrorResponse, SuccessResponse } from '../responses';

// =================================================================================================
// Type Definitions
// =================================================================================================

type VRCConfigUpdate = Partial<BanReason | Setting | VerificationType> & { type: string; id: number };

// =================================================================================================
// UpdateVRCConfig Function
// =================================================================================================

/**
 * @description Updates an existing VRC configuration item in the database.
 * @param {Request} request The incoming Request object containing the config type, ID, and update data in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} adminId The Discord ID of the bot admin performing the action.
 * @returns {Promise<Response>} A response indicating the result of the update operation.
 */
export async function UpdateVRCConfig(request: Request, env: Env, adminId: string): Promise<Response> {
    let admin = null;
    let discordId = '';

    // Verify if the requester is a bot admin
    try {
        const adminCheckStmt = env.DB.prepare('SELECT * FROM bot_admins WHERE discord_id = ?');
        admin = await adminCheckStmt.bind(adminId).first<BotAdmin>();

        if (!admin) {
            await LogIt(env.DB, LogLevel.WARNING, 'Unauthorized access attempt by unrecognized Discord ID: ' + adminId);
            return ErrorResponse('Unauthorized access', 403);
        }

        discordId = admin.discord_id;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error updating VRC config: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, 'Database error occurred while checking bot admin: ' + errorMessage);
        return ErrorResponse('Internal server error', 500);
    }

    try {
        // Data extraction
        const data: VRCConfigUpdate = await request.json();

        // Basic validation
        if (!data.type || data.id === undefined) {
            await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update VRC config with missing type or id`);
            return ErrorResponse('Missing required fields: type and id are required', 400);
        }

        // Variable extraction
        const { type, id, ...updateData } = data;

        // Handle different config types
        switch (type) {
            case 'banreason':
                const banData = updateData as Partial<BanReason>;
                if (!banData.reason_text) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update ban reason ID ${id} with missing reason_text`);
                    return ErrorResponse('Missing required field: reason_text is required', 400);
                }

                // Check if item exists
                const banExistsStmt = env.DB.prepare('SELECT 1 FROM ban_reasons WHERE ban_reason_id = ?');
                const banExists = await banExistsStmt.bind(id).first();
                if (!banExists) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update non-existent ban reason ID ${id}`);
                    return ErrorResponse('Ban reason not found', 404);
                }

                // Statement preparation and execution
                const updateBanStmt = env.DB.prepare('UPDATE ban_reasons SET reason_text = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE ban_reason_id = ?');
                const { success: banSuccess } = await updateBanStmt.bind(banData.reason_text, adminId, id).run();

                // Database result handling
                if (banSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} updated ban reason ID ${id}`);
                    return SuccessResponse('Ban reason updated successfully', 200);
                } else {
                    return ErrorResponse('Failed to update ban reason', 500);
                }

            case 'setting':
                const settingData = updateData as Partial<Setting>;
                if (!settingData.setting_name && settingData.setting_type_id === undefined) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update setting ID ${id} with no fields to update`);
                    return ErrorResponse('At least one field to update is required: setting_name or setting_type_id', 400);
                }

                // Check if item exists
                const settingExistsStmt = env.DB.prepare('SELECT 1 FROM settings WHERE setting_id = ?');
                const settingExists = await settingExistsStmt.bind(id).first();
                if (!settingExists) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update non-existent setting ID ${id}`);
                    return ErrorResponse('Setting not found', 404);
                }

                // Validate foreign key if provided
                if (settingData.setting_type_id !== undefined) {
                    const typeCheckStmt = env.DB.prepare('SELECT 1 FROM setting_types WHERE setting_type_id = ?');
                    const typeExists = await typeCheckStmt.bind(settingData.setting_type_id).first();
                    if (!typeExists) {
                        await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update setting ID ${id} with invalid setting_type_id: ${settingData.setting_type_id}`);
                        return ErrorResponse('Invalid setting_type_id: setting type does not exist', 400);
                    }
                }

                // Build dynamic update query
                const fields: string[] = [];
                const values: (string | number)[] = [];
                if (settingData.setting_name) {
                    fields.push('setting_name = ?');
                    values.push(settingData.setting_name);
                }
                if (settingData.setting_type_id !== undefined) {
                    fields.push('setting_type_id = ?');
                    values.push(settingData.setting_type_id);
                }
                fields.push('updated_at = CURRENT_TIMESTAMP');
                fields.push('updated_by = ?');
                values.push(adminId);
                values.push(id);

                const updateSettingStmt = env.DB.prepare(`UPDATE settings SET ${fields.join(', ')} WHERE setting_id = ?`);
                const { success: settingSuccess } = await updateSettingStmt.bind(...values).run();

                // Database result handling
                if (settingSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} updated setting ID ${id}`);
                    return SuccessResponse('Setting updated successfully', 200);
                } else {
                    return ErrorResponse('Failed to update setting', 500);
                }

            case 'verificationtype':
                const verifData = updateData as Partial<VerificationType>;
                if (!verifData.type_name && !verifData.description) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update verification type ID ${id} with no fields to update`);
                    return ErrorResponse('At least one field to update is required: type_name or description', 400);
                }

                // Check if item exists
                const verifExistsStmt = env.DB.prepare('SELECT 1 FROM verification_types WHERE verification_type_id = ?');
                const verifExists = await verifExistsStmt.bind(id).first();
                if (!verifExists) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update non-existent verification type ID ${id}`);
                    return ErrorResponse('Verification type not found', 404);
                }

                // Build dynamic update query
                const verifFields: string[] = [];
                const verifValues: (string | number)[] = [];
                if (verifData.type_name) {
                    verifFields.push('type_name = ?');
                    verifValues.push(verifData.type_name);
                }
                if (verifData.description) {
                    verifFields.push('description = ?');
                    verifValues.push(verifData.description);
                }
                verifFields.push('updated_at = CURRENT_TIMESTAMP');
                verifFields.push('updated_by = ?');
                verifValues.push(adminId);
                verifValues.push(id);

                const updateVerifStmt = env.DB.prepare(`UPDATE verification_types SET ${verifFields.join(', ')} WHERE verification_type_id = ?`);
                const { success: verifSuccess } = await updateVerifStmt.bind(...verifValues).run();

                // Database result handling
                if (verifSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} updated verification type ID ${id}`);
                    return SuccessResponse('Verification type updated successfully', 200);
                } else {
                    return ErrorResponse('Failed to update verification type', 500);
                }

            default:
                await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to update VRC config with invalid type: ${type}`);
                return ErrorResponse('Invalid type: must be banreason, setting, or verificationtype', 400);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error updating VRC config: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Unexpected error while updating VRC config by bot admin ${discordId}: ${errorMessage}`);
        return ErrorResponse('Internal Server Error', 500);
    }
}