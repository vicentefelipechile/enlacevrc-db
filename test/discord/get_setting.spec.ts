import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../../src/index';

import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /discord/{server_id}/get - GetSetting', () => {
  const validHeaders = {
    Authorization: 'Bearer test-api-key',
    'X-User-ID': 'stf_test',
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

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/get', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method POST not allowed for /discord/123456789/get' });
  });

  it('should return 400 when missing setting_key and getallsettings is not true', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/get', {
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
    const request = new IncomingRequest('http://example.com/discord/999999999/get?setting_key=prefix', {
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
    const request = new IncomingRequest('http://example.com/discord/123456789/get?setting_key=prefix', {
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
    const request = new IncomingRequest('http://example.com/discord/123456789/get?getallsettings=true', {
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
