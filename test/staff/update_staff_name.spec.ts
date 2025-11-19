import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';

import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('PUT /staff/{staff_id}/update_name - UpdateStaffName', () => {
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

  it('should return 405 for non-PUT methods', async () => {
    const request = new IncomingRequest('http://example.com/staff/987654321/update_name', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /staff/987654321/update_name' });
  });

  it('should return 400 when no fields provided', async () => {
    const request = new IncomingRequest('http://example.com/staff/987654321/update_name', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({}),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'No fields provided to update' });
  });

  it('should return 400 when no valid fields provided', async () => {
    const request = new IncomingRequest('http://example.com/staff/987654321/update_name', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({ invalid_field: 'value' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'No valid fields provided to update. Only discord_name can be updated' });
  });

  it('should return 404 for non-existent staff member', async () => {
    const request = new IncomingRequest('http://example.com/staff/999999999/update_name', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({ discord_name: 'UpdatedName' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Staff member not found' });
  });

  it('should update staff name successfully', async () => {
    const request = new IncomingRequest('http://example.com/staff/987654321/update_name', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({ discord_name: 'UpdatedName' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
  });

  it('should return 403 for non-admin users', async () => {
    const nonAdminHeaders = {
      ...validHeaders,
      'X-User-ID': 'regular_user',
    };
    const request = new IncomingRequest('http://example.com/staff/987654321/update_name', {
      method: 'PUT',
      headers: nonAdminHeaders,
      body: JSON.stringify({ discord_name: 'UpdatedName' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(403);
  });
});
