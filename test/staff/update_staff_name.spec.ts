import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { createValidHeaders, createTestEnv, initializeDatabase, clearAndReloadTestData } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('PUT /staff/{staff_id}/update_name - UpdateStaffName', () => {
  const validHeaders = createValidHeaders(undefined, '10203040');
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
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
      'X-Discord-ID': 'regular_user',
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
