import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('PUT /profile/{id}/verify - VerifyProfile', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 400 when missing verification_id field', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/verify', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        verified_from: '123456789'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required field: verification_id' });
  });

  it('should return 400 when missing verified_from field', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/verify', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        verification_id: 3
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required field: verified_from' });
  });

  it('should return 405 for non-PUT methods', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/verify', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /profile/usr_test/verify' });
  });

  it('should return 400 when verifying without verification method', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/verify', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({ verified_from: '123456789' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required field: verification_id' });
  });

  it('should return 404 for non-existent profile', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_nonexistent/verify', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        verification_id: 3,
        verified_from: '123456789'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Profile not found' });
  });

  it('should verify profile successfully', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/verify', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        verification_id: 3,
        verified_from: '123456789'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toEqual({ success: true, message: 'Profile verified successfully' });
  });

  it('should return 403 for non-staff users', async () => {
    const nonStaffHeaders = {
      ...validHeaders,
      'X-Discord-ID': 'regular_user',
    };
    const request = new IncomingRequest('http://example.com/profile/usr_test/verify', {
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

  it('should return 409 when trying to verify an already verified profile', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test_verified/verify', {
      method: 'PUT',
      headers: validHeaders,
      body: JSON.stringify({
        verification_id: 3,
        verified_from: '123456789'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(409);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Profile is already verified' });
  });
});
