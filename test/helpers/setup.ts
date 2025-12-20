/**
 * @file test/helpers/setup.ts
 * @description Utilidades centralizadas para configuración de tests
 * Proporciona funciones para inicializar, limpiar y gestionar la base de datos de pruebas
 */

import { env } from 'cloudflare:test';
import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

/**
 * Orden correcto para limpiar tablas respetando foreign keys
 * IMPORTANTE: Las tablas con foreign keys deben ir ANTES de las tablas referenciadas
 */
export const TABLES_TO_CLEAR = [
    "vrchat_group",      // FK a discord_server
    "discord_settings",  // FK a discord_server y setting
    "setting",
    "profiles",
    "discord_server",    // Referenciada por vrchat_group y discord_settings
    "staff",
    "bot_admin",
    "log"
] as const;

/**
 * Inicializa la base de datos con el schema y datos de población
 * Debe ejecutarse en beforeAll() de cada suite de tests
 * 
 * @param db - Instancia de D1Database
 * @example
 * beforeAll(async () => {
 *   await initializeDatabase(localEnv.DB);
 * });
 */
export async function initializeDatabase(db: D1Database): Promise<void> {
    const cleanedSchemas = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const cleanedPoblate = poblate
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const preparedStatements = cleanedSchemas.map(statement => {
        return db.prepare(`${statement};`);
    });

    const poblateStatements = cleanedPoblate.map(statement => {
        return db.prepare(`${statement};`);
    });

    await db.batch(preparedStatements);
    await db.batch(poblateStatements);
}

/**
 * Limpia todas las tablas y recarga los datos de test
 * Debe ejecutarse en beforeEach() de cada suite de tests
 * 
 * @param db - Instancia de D1Database
 * @example
 * beforeEach(async () => {
 *   await clearAndReloadTestData(localEnv.DB);
 * });
 */
export async function clearAndReloadTestData(db: D1Database): Promise<void> {
    // Limpiar tablas en orden correcto (respetando foreign keys)
    for (const table of TABLES_TO_CLEAR) {
        await db.exec(`DELETE FROM ${table}`);
    }

    // Recargar datos de test
    const cleanedTest = test
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const statements = cleanedTest.map(statement => {
        return db.prepare(`${statement};`);
    });

    await db.batch(statements);
}

/**
 * Crea una configuración de entorno de test con API_KEY
 * 
 * @param apiKey - API key a usar en los tests (default: 'test-api-key')
 * @returns Entorno configurado para tests
 * @example
 * const localEnv = createTestEnv();
 */
export function createTestEnv(apiKey: string = 'test-api-key') {
    return { ...env, API_KEY: apiKey };
}

/**
 * Headers válidos estándar para requests de test
 * 
 * @param apiKey - API key (default: 'test-api-key')
 * @param discordId - Discord ID del usuario de test (default: '987654321')
 * @param discordName - Nombre de Discord del usuario de test (default: 'TestStaff')
 * @returns Headers configurados
 */
export function createValidHeaders(
    apiKey: string = 'test-api-key',
    discordId: string = '987654321',
    discordName: string = 'TestStaff'
) {
    return {
        Authorization: `Bearer ${apiKey}`,
        'X-Discord-ID': discordId,
        'X-Discord-Name': discordName,
        'Content-Type': 'application/json',
    };
}
