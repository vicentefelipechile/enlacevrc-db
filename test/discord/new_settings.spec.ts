import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';

import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /discord/new-setting - NewSetting', () => {
    const validHeaders = {
        Authorization: 'Bearer test-api-key',
        'X-Discord-ID': '987654321',
        'X-Discord-Name': 'TestStaff',
        'Content-Type': 'application/json',
    };
    const localEnv = { ...env, API_KEY: 'test-api-key' };

    beforeAll(async () => {
        const cleanedSchemas = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const cleanedPoblate = poblate
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const preparedStatements = cleanedSchemas.map(statement => {
            return localEnv.DB.prepare(`${statement};`);
        });

        const poblateStatements = cleanedPoblate.map(statement => {
            return localEnv.DB.prepare(`${statement};`);
        });

        await localEnv.DB.batch(preparedStatements);
        await localEnv.DB.batch(poblateStatements);
    });

    beforeEach(async () => {
        const tablesToClear = ["discord_settings", "setting", "profiles", "discord_server", "staff", "bot_admin", "log"];
        for (const table of tablesToClear) {
            await localEnv.DB.exec(`DELETE FROM ${table}`);
        }
        const cleanedTest = test
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const statements = cleanedTest.map(statement => {
            return localEnv.DB.prepare(`${statement};`);
        });
        await localEnv.DB.batch(statements);
    });

    it('should return 405 for non-POST methods', async () => {
        const request = new IncomingRequest('http://example.com/discord/new-setting', {
            method: 'GET',
            headers: validHeaders,
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(405);
    });

    it('should return 400 when missing required fields', async () => {
        const request = new IncomingRequest('http://example.com/discord/new-setting', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                setting_key: 'incomplete_setting'
            }),
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(400);
        const body = await response.json() as any;
        expect(body).toEqual({
            success: false,
            error: 'Missing required fields: setting_key, setting_type, default_value'
        });
    });

    it('should create a new setting and propagate to existing servers', async () => {
        // First, ensure we have some servers (test.sql should have populated some, but let's check/add)
        // test.sql usually adds some data. Let's assume it does.
        // Actually, let's explicitly add a server to be sure.
        await localEnv.DB.prepare("INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES ('server1', 'Test Server 1', 'admin')").run();
        await localEnv.DB.prepare("INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES ('server2', 'Test Server 2', 'admin')").run();

        const request = new IncomingRequest('http://example.com/discord/new-setting', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                setting_key: 'new_feature_flag',
                setting_type: 'boolean',
                default_value: '1'
            }),
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(200);
        const body = await response.json() as any;
        expect(body).toEqual({
            success: true,
            message: "Setting 'new_feature_flag' created and applied to 3 servers."
        });

        // Verify setting definition
        const settingDef = await localEnv.DB.prepare("SELECT * FROM setting WHERE setting_name = 'new_feature_flag'").first();
        expect(settingDef).toBeDefined();
        expect((settingDef as any).default_value).toBe('1');

        // Verify propagation
        const serverSettings = await localEnv.DB.prepare("SELECT * FROM discord_settings WHERE setting_key = 'new_feature_flag'").all();
        expect(serverSettings.results.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle duplicate setting creation gracefully (or fail as expected)', async () => {
        // Insert a setting first
        await localEnv.DB.prepare("INSERT INTO setting (setting_name, setting_type_name, default_value) VALUES ('dup_setting', 'boolean', '0')").run();

        const request = new IncomingRequest('http://example.com/discord/new-setting', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                setting_key: 'dup_setting',
                setting_type: 'boolean',
                default_value: '1'
            }),
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        // Expecting 409 because we now check for existence
        expect(response.status).toBe(409);
        const body = await response.json() as any;
        expect(body).toEqual({
            success: false,
            error: "Setting 'dup_setting' already exists"
        });
    });

    it('should work even if no servers exist', async () => {
        // Clear servers and dependent tables
        await localEnv.DB.exec("DELETE FROM discord_settings");
        await localEnv.DB.exec("DELETE FROM profiles");
        await localEnv.DB.exec("DELETE FROM discord_server");

        const request = new IncomingRequest('http://example.com/discord/new-setting', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                setting_key: 'lonely_setting',
                setting_type: 'string',
                default_value: 'test'
            }),
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(200);
        const body = await response.json() as any;
        expect(body).toEqual({
            success: true,
            message: 'Setting created. No servers to update.'
        });

        // Verify setting definition
        const settingDef = await localEnv.DB.prepare("SELECT * FROM setting WHERE setting_name = 'lonely_setting'").first();
        expect(settingDef).toBeDefined();
    });
});
