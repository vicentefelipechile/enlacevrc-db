import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../../src/index';

import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /staff/new - NewStaff', () => {
  const validHeaders = {
    Authorization: 'Bearer test-api-key',
    'X-User-ID': 'adm_test',
    'X-Discord-Name': 'TestAdmin',
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
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /staff/new' });
  });

  it('should return 400 when missing required fields', async () => {
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({}),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required fields: discord_id and added_by are required' });
  });

  it('should return 400 for invalid added_by', async () => {
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ 
        discord_id: '10987654321',
        discord_name: 'NewStaff',
        added_by: 'invalid_admin'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Invalid added_by: bot admin does not exist' });
  });

  it('should create new staff member successfully', async () => {
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ 
        discord_id: '10987654321',
        discord_name: 'NewStaff',
        added_by: 'adm_test'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
  });

  it('should return 403 for non-admin users', async () => {
    const nonAdminHeaders = {
      ...validHeaders,
      'X-User-ID': 'regular_user',
    };
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'POST',
      headers: nonAdminHeaders,
      body: JSON.stringify({ 
        discord_id: '987654321',
        discord_name: 'NewStaff',
        added_by: 'adm_test'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(403);
  });
});
