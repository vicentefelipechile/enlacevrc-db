import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../../src/index';

import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('PUT /profile/{id}/ban - BanProfile', () => {
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

  it('should return 405 for non-PUT methods', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/ban', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /profile/usr_test/ban' });
  });

  it('should return 400 when missing banned_reason field', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/ban', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({}),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required field: banned_reason' });
  });

  it('should return 404 for non-existent profile', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_nonexistent/ban', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({ banned_reason: 'ban reason test' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(404);
  });

  it('should ban profile successfully', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/ban', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({ banned_reason: 'ban reason test' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
  });

  it('should return 409 if profile is already banned', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test_banned/ban', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({ banned_reason: 'ban reason test' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(409);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Profile is already banned' });
  });
});
