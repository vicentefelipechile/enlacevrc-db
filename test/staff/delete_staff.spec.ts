import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('DELETE /staff/{staff_id}/delete - DeleteStaff', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-DELETE methods', async () => {
    const request = new IncomingRequest('http://example.com/staff/987654321/delete', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /staff/987654321/delete' });
  });

  it('should return 404 for non-existent staff member', async () => {
    const request = new IncomingRequest('http://example.com/staff/999999999/delete', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Staff member not found' });
  });

  it('should delete staff member successfully', async () => {
    const adminHeaders = { ...validHeaders, 'X-Discord-ID': '10203040' };
    const request = new IncomingRequest('http://example.com/staff/987654321/delete', {
      method: 'DELETE',
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toEqual({ success: true, message: 'Staff member deleted successfully' });
  });

  it('should return 403 for non-admin users', async () => {
    const nonAdminHeaders = {
      ...validHeaders,
      'X-Discord-ID': 'regular_user',
    };
    const request = new IncomingRequest('http://example.com/staff/987654321/delete', {
      method: 'DELETE',
      headers: nonAdminHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(403);
  });
});
