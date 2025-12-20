import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { clearAndReloadTestData, createTestEnv, createValidHeaders, initializeDatabase } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /discord/add-server - AddServer', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-POST methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Method GET not allowed');
  });

  it('should return 400 when missing discord_server_id', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        server_name: 'New Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({
      success: false,
      error: 'Missing required fields: discord_server_id and server_name are required'
    });
  });

  it('should return 400 when missing server_name', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '999888777'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({
      success: false,
      error: 'Missing required fields: discord_server_id and server_name are required'
    });
  });

  it('should return 400 when both fields are missing', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({}),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({
      success: false,
      error: 'Missing required fields: discord_server_id and server_name are required'
    });
  });

  it('should return 409 when server already exists', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '123456789',
        server_name: 'Duplicate Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(409);
    const body = await response.json() as any;
    expect(body).toEqual({
      success: false,
      error: 'Discord server already exists'
    });
  });

  it('should add server successfully with settings population', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '999888777',
        server_name: 'New Awesome Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.message).toContain('Discord server added successfully');
    expect(body.data.discord_server_id).toBe('999888777');
    expect(body.data.server_name).toBe('New Awesome Server');
    expect(body.data.settings_added).toBeGreaterThan(0);
    expect(body.data.total_settings).toBeGreaterThan(0);
  });

  it('should populate all available settings for new server', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '555444333',
        server_name: 'Settings Test Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);
    const body = await response.json() as any;

    // Verify settings were actually created in the database
    const serverSettings = await localEnv.DB.prepare(
      'SELECT COUNT(*) as count FROM discord_settings WHERE discord_server_id = ?'
    ).bind('555444333').first() as { count: number };

    expect(serverSettings.count).toBe(body.data.settings_added);
    expect(body.data.settings_added).toBe(body.data.total_settings);
  });

  it('should verify server was added to discord_server table', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '222111000',
        server_name: 'Verification Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);

    // Verify server in database
    const server = await localEnv.DB.prepare(
      'SELECT discord_server_id, server_name, added_by FROM discord_server WHERE discord_server_id = ?'
    ).bind('222111000').first() as any;

    expect(server).toBeDefined();
    expect(server.discord_server_id).toBe('222111000');
    expect(server.server_name).toBe('Verification Server');
    expect(server.added_by).toBe('987654321');
  });

  it('should create settings with correct values from database defaults', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '333222111',
        server_name: 'Defaults Test Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);

    // Verify settings have correct default values
    const settings = await localEnv.DB.prepare(
      'SELECT setting_key, setting_value FROM discord_settings WHERE discord_server_id = ? ORDER BY setting_key'
    ).bind('333222111').all() as any;

    expect(settings.results.length).toBeGreaterThan(0);

    // Verify each setting has a value
    settings.results.forEach((setting: any) => {
      expect(setting.setting_key).toBeDefined();
      expect(setting.setting_value).toBeDefined();
    });
  });

  it('should create 4 settings for new server', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '444333222',
        server_name: 'Four Settings Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);
    const body = await response.json() as any;

    expect(body.data.settings_added).toBe(4);
    expect(body.data.total_settings).toBe(4);

    // Verify specific settings exist
    const verificationRole = await localEnv.DB.prepare(
      'SELECT setting_value FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?'
    ).bind('444333222', 'verification_role').first() as any;

    expect(verificationRole).toBeDefined();
  });

  it('should handle server_name with special characters', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '777666555',
        server_name: 'Server with "Special" & <Characters>'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body.data.server_name).toBe('Server with "Special" & <Characters>');
  });

  it('should log the server addition action', async () => {
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_server_id: '888777666',
        server_name: 'Logged Server'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);

    // Verify log entry was created
    const logs = await localEnv.DB.prepare(
      'SELECT log_message FROM log WHERE log_message LIKE ? ORDER BY log_id DESC LIMIT 1'
    ).bind('%Discord server added%').first() as any;

    expect(logs).toBeDefined();
    expect(logs.log_message).toContain('888777666');
    expect(logs.log_message).toContain('Logged Server');
  });

  it('should return proper error response on unexpected error', async () => {
    // Create a request with invalid JSON to trigger an error
    const request = new IncomingRequest('http://example.com/discord/add-server', {
      method: 'POST',
      headers: validHeaders,
      body: 'invalid json',
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(500);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Internal Server Error');
  });
});
