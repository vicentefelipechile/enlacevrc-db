import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('PUT /profile/{id}/ban - BanProfile', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
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
