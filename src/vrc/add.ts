/**
 * @file        vrc/add.ts
 * @author      vicentefelipechile
 * @description This function adds new VRC configuration items (ban reasons, settings, or verification types) to the database.
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

type VRCConfig = Partial<BanReason | Setting | VerificationType> & { type: string };

// =================================================================================================
// AddVRCConfig Function
// =================================================================================================

/**
 * @description Adds a new VRC configuration item to the database.
 * @param {Request} request The incoming Request object containing the config type and data in the JSON body.
 * @param {Env} env The Cloudflare Worker environment object.
 * @param {string} adminId The Discord ID of the bot admin performing the action.
 * @returns {Promise<Response>} A response indicating the result of the add operation.
 */
export async function AddVRCConfig(request: Request, env: Env, adminId: string): Promise<Response> {
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
        console.error(`Error adding VRC config: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, 'Database error occurred while checking bot admin: ' + errorMessage);
        return ErrorResponse('Internal server error', 500);
    }

    try {
        // Data extraction
        const data: VRCConfig = await request.json();

        // Basic validation
        if (!data.type) {
            await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to add VRC config with missing type`);
            return ErrorResponse('Missing required field: type is required', 400);
        }

        // Variable extraction
        const { type, ...configData } = data;

        // Handle different config types
        switch (type) {
            case 'banreason':
                const banData = configData as Partial<BanReason>;
                if (!banData.reason_text) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to add ban reason with missing reason_text`);
                    return ErrorResponse('Missing required field: reason_text is required', 400);
                }

                // Statement preparation and execution
                const insertBanStmt = env.DB.prepare('INSERT INTO ban_reasons (reason_text, created_by) VALUES (?, ?)');
                const { success: banSuccess } = await insertBanStmt.bind(banData.reason_text, adminId).run();

                // Database result handling
                if (banSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} added ban reason: ${banData.reason_text}`);
                    return SuccessResponse('Ban reason added successfully', 201);
                } else {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} failed to add ban reason: ${banData.reason_text}`);
                    return ErrorResponse('Failed to add ban reason', 500);
                }

            case 'setting':
                const settingData = configData as Partial<Setting>;
                if (!settingData.setting_name || settingData.setting_type_id === undefined) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to add setting with missing required fields`);
                    return ErrorResponse('Missing required fields: setting_name and setting_type_id are required', 400);
                }

                // Validate foreign key
                const typeCheckStmt = env.DB.prepare('SELECT 1 FROM setting_types WHERE setting_type_id = ?');
                const typeExists = await typeCheckStmt.bind(settingData.setting_type_id).first();
                if (!typeExists) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to add setting with invalid setting_type_id: ${settingData.setting_type_id}`);
                    return ErrorResponse('Invalid setting_type_id: setting type does not exist', 400);
                }

                // Statement preparation and execution
                const insertSettingStmt = env.DB.prepare('INSERT INTO settings (setting_name, setting_type_id, created_by) VALUES (?, ?, ?)');
                const { success: settingSuccess } = await insertSettingStmt.bind(settingData.setting_name, settingData.setting_type_id, adminId).run();

                // Database result handling
                if (settingSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} added setting: ${settingData.setting_name}`);
                    return SuccessResponse('Setting added successfully', 201);
                } else {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} failed to add setting: ${settingData.setting_name}`);
                    return ErrorResponse('Failed to add setting', 500);
                }

            case 'verificationtype':
                const verifData = configData as Partial<VerificationType>;
                if (!verifData.type_name || !verifData.description) {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to add verification type with missing required fields`);
                    return ErrorResponse('Missing required fields: type_name and description are required', 400);
                }

                // Statement preparation and execution
                const insertVerifStmt = env.DB.prepare('INSERT INTO verification_types (type_name, description, created_by) VALUES (?, ?, ?)');
                const { success: verifSuccess } = await insertVerifStmt.bind(verifData.type_name, verifData.description, adminId).run();

                // Database result handling
                if (verifSuccess) {
                    await LogIt(env.DB, LogLevel.INFO, `Bot admin ${discordId} added verification type: ${verifData.type_name}`);
                    return SuccessResponse('Verification type added successfully', 201);
                } else {
                    await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} failed to add verification type: ${verifData.type_name}`);
                    return ErrorResponse('Failed to add verification type', 500);
                }

            default:
                await LogIt(env.DB, LogLevel.ERROR, `Bot admin ${discordId} attempted to add VRC config with invalid type: ${type}`);
                return ErrorResponse('Invalid type: must be banreason, setting, or verificationtype', 400);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error(`Error adding VRC config: ${errorMessage}`);
        await LogIt(env.DB, LogLevel.ERROR, `Unexpected error while adding VRC config by bot admin ${discordId}: ${errorMessage}`);
        return ErrorResponse('Internal Server Error', 500);
    }
}