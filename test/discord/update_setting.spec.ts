import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('PUT /discord/{server_id}/update-setting - UpdateSetting', () => {
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

  it('should return 405 for non-PUT methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/update-setting', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /discord/123456789/update-setting' });
  });

  it('should return 400 when missing required fields', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/update-setting', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({}),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required fields: setting_key and setting_value are required' });
  });

  it('should return 400 for invalid discord_server_id', async () => {
    const request = new IncomingRequest('http://example.com/discord/999999999/update-setting', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        setting_key: 'prefix',
        setting_value: '%'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Invalid discord_server_id: server does not exist' });
  });

  it('should return 400 for invalid setting_key', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/update-setting', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        setting_key: 'invalid_setting',
        setting_value: 'some_value'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Invalid setting_key: setting does not exist' });
  });

  it('should update setting successfully', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/update-setting', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        setting_key: 'prefix',
        setting_value: '%'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toEqual({ success: true, message: 'Discord setting updated successfully' });
  });
});
