import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';

import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /profile/new - NewProfile', () => {
  const validHeaders = {
    Authorization: 'Bearer test-api-key',
    'X-User-ID': 'test-user-id',
    'X-Discord-Name': 'TestUser',
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
    const request = new IncomingRequest('http://example.com/profile/new', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /profile/new' });
  });

  it('should return 400 when missing required fields', async () => {
    const request = new IncomingRequest('http://example.com/profile/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ vrchat_id: 'usr_test' }), // Missing discord_id and vrchat_name
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required fields: vrchat_id, discord_id and vrchat_name are required' });
  });

  it('should create a new profile with valid data', async () => {
    const request = new IncomingRequest('http://example.com/profile/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        vrchat_id: 'usr_test_new',
        discord_id: 'discord_test_new',
        vrchat_name: 'TestUser',
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body).toEqual({ success: true, message: 'Profile created successfully' });
  });

  it('should return 409 when creating a profile with duplicate VRChat ID', async () => {
    const request = new IncomingRequest('http://example.com/profile/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        vrchat_id: 'usr_test', // Already exists in test data
        discord_id: '333221',
        vrchat_name: 'DuplicateUser',
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(409);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Profile with this VRChat ID already exists' });
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new IncomingRequest('http://example.com/profile/new', {
      method: 'POST',
      headers: validHeaders,
      body: 'invalid json',
    });
    const localEnv = { ...env, API_KEY: 'test-api-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Invalid JSON in request body' });
  });
});
