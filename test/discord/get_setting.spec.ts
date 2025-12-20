import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../../src/index';
import { createValidHeaders, createTestEnv, initializeDatabase, clearAndReloadTestData } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /discord/{server_id}/get-setting - GetSetting', () => {
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

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/get-setting', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method POST not allowed for /discord/123456789/get-setting' });
  });

  it('should return 400 when missing setting_key and getallsettings is not true', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/get-setting', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required parameter: setting_key' });
  });

  it('should return 404 for non-existent server', async () => {
    const request = new IncomingRequest('http://example.com/discord/999999999/get-setting?setting_key=prefix', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Discord server not found' });
  });

  it('should get setting successfully with setting_key', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/get-setting?setting_key=prefix', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toEqual({ success: true, data: { prefix: '!' } });
  });

  it('should get all settings with getallsettings=true', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/get-setting?getallsettings=true', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toEqual({ success: true, data: { prefix: '!', welcome_message: 'Welcome to the server!' } });
  });
});
