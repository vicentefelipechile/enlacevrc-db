import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { createValidHeaders, createTestEnv, initializeDatabase, clearAndReloadTestData } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /discord/new-setting - NewSetting', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/exists-server', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method POST not allowed for /discord/123456789/exists-server' });
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
    await localEnv.DB.exec("DELETE FROM vrchat_group");
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
