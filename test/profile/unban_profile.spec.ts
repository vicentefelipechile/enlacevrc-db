import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('PUT /profile/{id}/unban - UnbanProfile', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-PUT methods', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/unban', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /profile/usr_test/unban' });
  });

  it('should return 404 for non-existent profile', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_nonexistent/unban', {
      method: 'PUT',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Profile not found' });
  });

  it('should unban profile successfully', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test_banned/unban', {
      method: 'PUT',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
  });

  it('should return 403 for non-staff users', async () => {
    const nonStaffHeaders = {
      ...validHeaders,
      'X-Discord-ID': 'regular_user',
    };
    const request = new IncomingRequest('http://example.com/profile/usr_test/unban', {
      method: 'PUT',
      headers: nonStaffHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(403);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Forbidden: Staff privileges required' });
  });

  it('should return 409 when trying to unban an already unbanned profile', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/unban', {
      method: 'PUT',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(409);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Profile is not banned' });
  });
});
